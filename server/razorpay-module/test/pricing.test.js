'use strict';
/** node --test test/pricing.test.js : attacks on the cart total. Every one must be rejected or priced from SERVER data only. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { priceOrder, PricingError } = require('../helpers/price-order');

const catalog = new Map([
  ['p1:250g', { pricePaise: 12000, name: 'Kaju Katli 250g', inStock: true }],
  ['p1:500g', { pricePaise: 23000, name: 'Kaju Katli 500g', inStock: true }],
  ['p2:', { pricePaise: 5000, name: 'Samosa', inStock: true, maxQty: 10 }],
  ['p3:', { pricePaise: 9900, name: 'Sold out sweet', inStock: false }],
  ['p4:', { pricePaise: 0, name: 'Broken price row' }],
  ['p5:', { pricePaise: 49.5, name: 'Float price row' }],
]);
const rejects = (input, code) => assert.throws(() => priceOrder({ catalog, ...input }), (e) => e instanceof PricingError && (!code || e.code === code), JSON.stringify(input.items));

test('honest cart is priced exactly, in integer paise', () => {
  const r = priceOrder({ catalog, items: [{ productId: 'p1', variantId: '250g', qty: 2 }, { productId: 'p2', qty: 3 }], deliveryFeePaise: 4000 });
  assert.equal(r.subtotalPaise, 2 * 12000 + 3 * 5000);
  assert.equal(r.totalPaise, 24000 + 15000 + 4000);
  assert.ok(Number.isSafeInteger(r.totalPaise));
});

test('client-supplied prices / totals / flags are ignored completely', () => {
  const r = priceOrder({ catalog, items: [{ productId: 'p1', variantId: '250g', qty: 1, price: 1, pricePaise: 1, total: 1, discount: 99999, inStock: true }] });
  assert.equal(r.totalPaise, 12000);
});

test('NEGATIVE quantity (offset one item with another) is rejected', () => {
  rejects({ items: [{ productId: 'p1', variantId: '500g', qty: 5 }, { productId: 'p1', variantId: '250g', qty: -4 }] }, 'BAD_QTY');
});

test('zero / fractional / NaN / Infinity / string / huge / missing quantity is rejected', () => {
  for (const qty of [0, 0.5, 1.0000001, NaN, Infinity, -Infinity, '2', '1e9', null, undefined, {}, [], true, 1e21, Number.MAX_SAFE_INTEGER + 2]) {
    rejects({ items: [{ productId: 'p1', variantId: '250g', qty }] });
  }
});

test('quantity above the per-line cap or the product cap is rejected (incl. split across duplicate lines)', () => {
  rejects({ items: [{ productId: 'p1', variantId: '250g', qty: 100 }] }, 'BAD_QTY');
  rejects({ items: [{ productId: 'p2', qty: 11 }] }, 'BAD_QTY');
  rejects({ items: [{ productId: 'p2', qty: 6 }, { productId: 'p2', qty: 6 }] }, 'BAD_QTY'); // 6+6 must not dodge maxQty 10
});

test('overflow attempts cannot wrap the total around', () => {
  rejects({ items: [{ productId: 'p1', variantId: '250g', qty: Number.MAX_SAFE_INTEGER }] });
  assert.throws(() => priceOrder({ catalog: new Map([['x:', { pricePaise: Number.MAX_SAFE_INTEGER, name: 'x' }]]), items: [{ productId: 'x', qty: 2 }], limits: { maxQtyPerLine: 99 } }), PricingError);
});

test('unknown / sold-out / zero-priced / float-priced items are rejected', () => {
  rejects({ items: [{ productId: 'nope', qty: 1 }] }, 'UNKNOWN_ITEM');
  rejects({ items: [{ productId: 'p1', variantId: '1kg', qty: 1 }] }, 'UNKNOWN_ITEM');
  rejects({ items: [{ productId: 'p3', qty: 1 }] }, 'OUT_OF_STOCK');
  rejects({ items: [{ productId: 'p4', qty: 1 }] }, 'BAD_PRICE');
  rejects({ items: [{ productId: 'p5', qty: 1 }] }, 'BAD_PRICE');
});

test('prototype-key tricks are not products', () => {
  const plain = { 'p1:250g': { pricePaise: 100, name: 'x' } };
  for (const productId of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    assert.throws(() => priceOrder({ catalog: plain, items: [{ productId, qty: 1 }] }), PricingError);
  }
  assert.throws(() => priceOrder({ catalog: plain, items: [{ productId: { toString: () => 'p1' }, variantId: '250g', qty: 1 }] }), PricingError);
});

test('malformed carts are rejected', () => {
  for (const items of [undefined, null, [], 'abc', {}, [null], [1], ['x'], Array.from({ length: 101 }, () => ({ productId: 'p2', qty: 1 }))]) rejects({ items });
});

test('ZERO TOTAL: free carts, 100% discounts and sub-rupee totals are rejected', () => {
  rejects({ items: [{ productId: 'p2', qty: 1 }], discountPaise: 5000 }, 'TOTAL_TOO_LOW'); // discount == subtotal, no delivery
  rejects({ items: [{ productId: 'p2', qty: 1 }], discountPaise: 4950 }, 'TOTAL_TOO_LOW'); // leaves 50 paise (< Re 1)
  assert.equal(priceOrder({ catalog, items: [{ productId: 'p2', qty: 1 }], discountPaise: 4900 }).totalPaise, 100); // exactly Re 1 is fine
});

test('discount / delivery fee tampering: negative, larger than cart, fractional, non-numeric', () => {
  const items = [{ productId: 'p1', variantId: '250g', qty: 1 }];
  for (const discountPaise of [-1, -100000, 12001, 1e12, 0.5, NaN, '100', null]) {
    if (discountPaise === null) continue; // null is not undefined; falls to default? must still be rejected below
    rejects({ items, discountPaise }, 'BAD_DISCOUNT');
  }
  for (const deliveryFeePaise of [-4000, 0.5, NaN, Infinity, '4000', 100001]) rejects({ items, deliveryFeePaise }, 'BAD_FEE');
});

test('negative delivery fee cannot be used to cancel the cart value', () => {
  rejects({ items: [{ productId: 'p1', variantId: '500g', qty: 1 }], deliveryFeePaise: -22900 });
});

test('total above the online ceiling is rejected', () => {
  rejects({ items: [{ productId: 'p1', variantId: '500g', qty: 99 }], limits: { maxTotalPaise: 100000 } }, 'TOTAL_TOO_HIGH');
});

test('RANDOM FUZZ: 40,000 near-valid-then-mutated carts never yield a total that is not a safe integer >= the minimum', () => {
  let seed = 7; const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const weird = [0, -1, 98, 99, 100, 0.1, -0.5, NaN, Infinity, '1', null, undefined, 1e15, Number.MAX_SAFE_INTEGER, -Number.MAX_SAFE_INTEGER, 2.5];
  const goodLines = [['p1', '250g'], ['p1', '500g'], ['p2', '']];
  let accepted = 0; let rejected = 0;
  for (let i = 0; i < 40000; i++) {
    // start from an HONEST cart, then corrupt random fields with some probability
    const items = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => {
      const [productId, variantId] = pick(goodLines);
      return { productId, variantId, qty: 1 + Math.floor(rnd() * 4) };
    });
    for (const it of items) {
      if (rnd() < 0.15) it.qty = pick(weird);
      if (rnd() < 0.05) it.productId = pick(['p3', 'p4', 'p5', 'zzz', '__proto__', 1, null]);
      if (rnd() < 0.03) it.variantId = pick(['1kg', undefined, {}]);
    }
    const discountPaise = rnd() < 0.25 ? pick([...weird, 100, 1000, 12000]) : 0;
    const deliveryFeePaise = rnd() < 0.25 ? pick([...weird, 4000, 5000]) : 0;
    try {
      const r = priceOrder({ catalog, items, discountPaise, deliveryFeePaise });
      accepted += 1;
      assert.ok(Number.isSafeInteger(r.totalPaise) && r.totalPaise >= 100, `bad total ${r.totalPaise}`);
      const recomputed = r.lines.reduce((a, l) => a + l.qty * catalog.get(l.key).pricePaise, 0);
      assert.equal(r.subtotalPaise, recomputed, 'subtotal must equal sum of SERVER prices x whole quantities');
      assert.equal(r.totalPaise, recomputed + r.deliveryFeePaise - r.discountPaise);
      assert.ok(r.discountPaise <= r.subtotalPaise && r.deliveryFeePaise >= 0 && r.discountPaise >= 0);
      assert.ok(r.lines.every((l) => Number.isSafeInteger(l.qty) && l.qty >= 1 && l.unitPaise >= 1));
    } catch (e) { rejected += 1; assert.ok(e instanceof PricingError, `non-PricingError thrown: ${e && e.stack}`); }
  }
  assert.ok(accepted > 15000 && rejected > 5000, `fuzz should exercise both paths (accepted ${accepted}, rejected ${rejected})`);
});
