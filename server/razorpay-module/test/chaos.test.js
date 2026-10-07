'use strict';
/** node --test test/chaos.test.js : see chaos-sim.js for what is simulated and what the invariant means. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { simulate } = require('./chaos-sim');

for (const storeKind of ['memory', 'mongo']) {
  for (const useCheckOrder of [false, true]) {
    test(`CHAOS [${storeKind} store, checkOrder=${useCheckOrder}]: 12 random worlds, every captured payment ends fulfilled XOR refunded`, { timeout: 240000 }, async () => {
      let totals = { payments: 0, fulfilled: 0, refunded: 0 };
      for (let seed = 1; seed <= 12; seed++) {
        const rep = await simulate({ seed, storeKind, useCheckOrder });
        assert.deepEqual(rep.violations, [], `seed ${seed}: ${rep.violations.slice(0, 5).join(' | ')}`);
        totals.payments += rep.payments; totals.fulfilled += rep.fulfilled; totals.refunded += rep.refunded;
      }
      assert.ok(totals.fulfilled > 100 && totals.refunded > 20, `scenario mix too thin: ${JSON.stringify(totals)}`);
      console.log(`   ${storeKind}/checkOrder=${useCheckOrder}: ${totals.payments} payments under chaos -> ${totals.fulfilled} fulfilled, ${totals.refunded} auto-refunded, 0 lost, 0 free`);
    });
  }
}

test('CHAOS: brutal 35% failure rate on everything still never loses or double-spends a payment', { timeout: 240000 }, async () => {
  for (let seed = 101; seed <= 106; seed++) {
    const rep = await simulate({ seed, storeKind: 'mongo', useCheckOrder: seed % 2 === 0, chaosRate: 0.35 });
    assert.deepEqual(rep.violations, [], `seed ${seed}: ${rep.violations.slice(0, 5).join(' | ')}`);
  }
});
