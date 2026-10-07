'use strict';

const crypto = require('crypto');

/**
 * Idempotency-Key middleware for state-changing endpoints (e.g. POST /orders). Same key => same result, handler runs ONCE,
 * even if the customer double-clicks, the browser retries after a network drop, or the request hits two servers at once.
 *
 *   const idempotent = createIdempotency(mongoose);          // once
 *   router.post('/orders', requireLogin, express.json(), idempotent(), createOrderHandler);
 *     ^ the body parser must come BEFORE idempotent() (the body is hashed); the handler MUST reply with res.json(...)
 *
 * Client: send a header  Idempotency-Key: <uuid>  generated ONCE per checkout attempt and reused on retries
 * (client/razorpay-checkout.js exports newIdempotencyKey()).
 *
 * Behaviour per key (scoped to the user + route):
 *   first request            -> runs the handler, stores its JSON response (status < 500)
 *   repeat while running     -> 409 + Retry-After (client retries in a second and gets the stored result)
 *   repeat after completion  -> replays the stored response, header  Idempotent-Replayed: true
 *   same key, different body -> 422 (a bug or an attack, never silently accepted)
 *   handler failed (5xx)     -> key released so a retry can run again
 *   server died mid-request  -> lock expires after lockMs and a retry takes over
 */
function createIdempotency(mongoose, {
  modelName = 'IdempotencyKey', collection = 'idempotency_keys', ttlSeconds = 24 * 3600, lockMs = 30 * 1000, maxResponseBytes = 64 * 1024, clock,
} = {}) {
  if (!mongoose || !mongoose.Schema) throw new Error('[idempotency] createIdempotency(mongoose): pass your mongoose instance');
  const { Schema } = mongoose;
  const nowMs = clock || Date.now;

  const schema = new Schema({
    scope: { type: String, required: true, unique: true }, // sha256(user|method|route|key)
    bodyHash: String,
    state: { type: String, enum: ['in_progress', 'done'], default: 'in_progress' },
    lockedUntil: Date,
    status: Number,
    response: Schema.Types.Mixed,
    expiresAt: Date,
  }, { collection });
  schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB deletes expired keys automatically
  const Model = mongoose.models[modelName] || mongoose.model(modelName, schema);

  const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');

  return function idempotent({ required = true } = {}) {
    return async function idempotencyMiddleware(req, res, next) {
      try {
        const key = req.get('idempotency-key');
        if (!key) return required ? res.status(400).json({ error: 'Idempotency-Key header is required' }) : next();
        if (!/^[A-Za-z0-9_-]{8,128}$/.test(key)) return res.status(400).json({ error: 'Invalid Idempotency-Key' });

        const u = req.user;
        const who = u && (u.id || u._id) ? `u:${String(u.id || u._id)}` : `ip:${req.ip}`;
        const scope = sha(`${who}|${req.method}|${req.baseUrl || ''}${req.path}|${key}`);
        const bodyHash = sha(JSON.stringify(req.body === undefined ? null : req.body));
        const run = () => {
          const original = res.json.bind(res);
          res.json = (body) => {
            res.json = original; // one-shot
            const status = res.statusCode || 200;
            const size = Buffer.byteLength(JSON.stringify(body === undefined ? null : body));
            const persist = (status >= 500 || size > maxResponseBytes)
              ? Model.deleteOne({ scope })                       // failed / unstorable: let a retry run again
              : Model.updateOne({ scope }, { $set: { state: 'done', status, response: body === undefined ? null : body }, $unset: { lockedUntil: 1 } });
            // store BEFORE answering, so a client that got a reply can never see the handler run a second time
            Promise.resolve(persist).catch(() => {}).then(() => original(body));
            return res;
          };
          return next();
        };

        try {
          await Model.create({ scope, bodyHash, state: 'in_progress', lockedUntil: new Date(nowMs() + lockMs), expiresAt: new Date(nowMs() + ttlSeconds * 1000) });
          return run(); // we own this key
        } catch (err) {
          if (!(err && err.code === 11000)) throw err;
        }

        const existing = await Model.findOne({ scope }).lean();
        if (!existing) { res.set('Retry-After', '1'); return res.status(409).json({ error: 'Request in progress, retry shortly' }); }
        if (existing.bodyHash !== bodyHash) return res.status(422).json({ error: 'Idempotency-Key was already used with a different request' });
        if (existing.state === 'done') {
          res.set('Idempotent-Replayed', 'true');
          return res.status(existing.status).json(existing.response);
        }
        // in progress: if its owner died (lock expired), exactly one retry takes over
        const took = await Model.updateOne(
          { scope, state: 'in_progress', lockedUntil: { $lt: new Date(nowMs()) } },
          { $set: { lockedUntil: new Date(nowMs() + lockMs) } },
        );
        if (took.matchedCount === 1) return run();
        res.set('Retry-After', '1');
        return res.status(409).json({ error: 'Request in progress, retry shortly' });
      } catch (err) {
        return next(err);
      }
    };
  };
}

module.exports = { createIdempotency };
