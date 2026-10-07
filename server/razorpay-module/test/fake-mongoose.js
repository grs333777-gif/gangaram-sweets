'use strict';
/**
 * Tiny in-memory stand-in for the subset of Mongoose that the stores / idempotency helper use, so their
 * filter/update logic can be run through the full test-suite without a database.
 * Emulates single-document atomicity, $or/$and/$lt/$lte/$gt/$exists/$in/$ne, $set/$unset/$inc/$min,
 * and unique indexes (incl. the partial unique index) with E11000 errors.
 * NOT a substitute for one real test against MongoDB.
 */
const tick = () => new Promise((r) => setImmediate(r)); // let other requests interleave between operations
const val = (v) => (v instanceof Date ? v.getTime() : v);

function matches(doc, filter) {
  return Object.entries(filter).every(([k, cond]) => {
    if (k === '$or') return cond.some((f) => matches(doc, f));
    if (k === '$and') return cond.every((f) => matches(doc, f));
    const v = doc[k];
    if (cond !== null && typeof cond === 'object' && !(cond instanceof Date) && Object.keys(cond).some((x) => x.startsWith('$'))) {
      return Object.entries(cond).every(([op, arg]) => {
        if (op === '$exists') return (v !== undefined) === arg;
        if (op === '$in') return arg.some((a) => val(a) === val(v));
        if (op === '$ne') return val(v) !== val(arg);
        if (v === undefined || v === null) return false; // comparison operators never match missing fields
        if (op === '$lt') return val(v) < val(arg);
        if (op === '$lte') return val(v) <= val(arg);
        if (op === '$gt') return val(v) > val(arg);
        throw new Error(`fake-mongoose: unsupported operator ${op}`);
      });
    }
    return val(v) === val(cond);
  });
}

function applyUpdate(doc, update) {
  let changed = false;
  for (const op of Object.keys(update)) if (!['$set', '$unset', '$inc', '$min'].includes(op)) throw new Error(`fake-mongoose: unsupported update ${op}`);
  const touched = new Set();
  const touch = (k) => { if (touched.has(k)) throw new Error(`fake-mongoose: conflicting update operators on "${k}" (real MongoDB rejects this)`); touched.add(k); };
  for (const [k, v] of Object.entries(update.$set || {})) { touch(k); if (JSON.stringify(doc[k]) !== JSON.stringify(v)) changed = true; doc[k] = v; }
  for (const k of Object.keys(update.$unset || {})) { touch(k); if (doc[k] !== undefined) changed = true; delete doc[k]; }
  for (const [k, v] of Object.entries(update.$inc || {})) { touch(k); doc[k] = (doc[k] || 0) + v; changed = true; }
  for (const [k, v] of Object.entries(update.$min || {})) { touch(k); if (doc[k] === undefined || val(v) < val(doc[k])) { doc[k] = v; changed = true; } }
  return changed;
}

function fakeMongoose({ clock } = {}) {
  const nowDate = () => new Date(clock ? clock() : Date.now());
  class Schema {
    constructor(def, opts) { this.def = def; this.opts = opts; this.indexes = []; }
    index(spec, opts) { this.indexes.push({ spec, opts }); }
  }
  Schema.Types = { Mixed: {} };
  const models = {};
  const mongoose = {
    Schema, models,
    model(name, schema) {
      const docs = [];
      const uniques = schema.indexes.filter((i) => i.opts && i.opts.unique);
      const fieldUnique = Object.entries(schema.def).filter(([, d]) => d && d.unique).map(([k]) => k);
      const Model = {
        docs,
        async createIndexes() {},
        async create(data) {
          await tick();
          const doc = { _id: `id${docs.length + 1}`, ...data };
          for (const [k, d] of Object.entries(schema.def)) if (doc[k] === undefined && d && d.default !== undefined) doc[k] = d.default;
          doc.createdAt = nowDate(); doc.updatedAt = nowDate();
          for (const f of fieldUnique) if (docs.some((x) => x[f] === doc[f])) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
          for (const u of uniques) {
            const field = Object.keys(u.spec)[0];
            const pf = u.opts.partialFilterExpression;
            if ((!pf || matches(doc, pf)) && docs.some((x) => x[field] === doc[field] && (!pf || matches(x, pf)))) {
              throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
            }
          }
          docs.push(doc);
          return { toObject: () => ({ ...doc }) };
        },
        findOne(filter) {
          return { lean: async () => { await tick(); const d = docs.find((x) => matches(x, filter)); return d ? { ...d } : null; } };
        },
        find(filter) {
          let sort; let limit = Infinity;
          const q = {
            sort(s) { sort = s; return q; },
            limit(n) { limit = n; return q; },
            async lean() {
              await tick();
              let out = docs.filter((x) => matches(x, filter));
              if (sort) {
                const [k, dir] = Object.entries(sort)[0];
                out = out.sort((a, b) => ((val(a[k]) ?? -Infinity) - (val(b[k]) ?? -Infinity)) * dir);
              }
              return out.slice(0, limit).map((d) => ({ ...d }));
            },
          };
          return q;
        },
        async updateOne(filter, update) {
          await tick();
          const d = docs.find((x) => matches(x, filter)); // find + update happen with no await between => atomic
          if (!d) return { matchedCount: 0, modifiedCount: 0 };
          const changed = applyUpdate(d, update);
          return { matchedCount: 1, modifiedCount: changed ? 1 : 0 };
        },
        async deleteOne(filter) {
          await tick();
          const i = docs.findIndex((x) => matches(x, filter));
          if (i >= 0) docs.splice(i, 1);
          return { deletedCount: i >= 0 ? 1 : 0 };
        },
      };
      models[name] = Model;
      return Model;
    },
  };
  return mongoose;
}

module.exports = { fakeMongoose };
