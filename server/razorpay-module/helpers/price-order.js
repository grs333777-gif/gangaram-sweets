'use strict';

/**
 * Server-side cart pricing in integer PAISE. Use this to compute the total you SAVE on the order,
 * and have getOrder() return that saved number. Nothing the browser sends is ever trusted except
 * "which product / variant" and "how many".
 *
 * Closes the classic underpayment tricks: negative / zero / fractional / string / NaN / huge quantities,
 * client-supplied prices, float rounding (all math is integers), discounts bigger than the cart,
 * duplicate lines splitting a limit, and totals that end up at zero.
 *
 *   const catalog = new Map(rows.map(r => [`${r._id}:${r.variantId}`, { pricePaise: r.pricePaise, inStock: r.inStock, name: r.name }]));
 *   const priced = priceOrder({ items: req.body.items, catalog, deliveryFeePaise: settings.deliveryFeePaise, discountPaise });
 *   // priced.totalPaise is an integer you store on the order
 */
class PricingError extends Error {
  constructor(message, code = 'INVALID_CART') {
    super(message);
    this.name = 'PricingError';
    this.code = code;
    this.status = 400; // safe to show `message` to the customer
  }
}

const isInt = Number.isSafeInteger;

function priceOrder({ items, catalog, deliveryFeePaise = 0, discountPaise = 0, limits = {} } = {}) {
  const L = {
    maxLines: 100, maxQtyPerLine: 99, minTotalPaise: 100, maxTotalPaise: 50000000, maxDeliveryFeePaise: 100000, ...limits,
  };
  if (!Array.isArray(items) || items.length === 0) throw new PricingError('Your cart is empty', 'EMPTY_CART');
  if (items.length > L.maxLines) throw new PricingError('Too many items in the cart', 'TOO_MANY_LINES');

  const lookup = (key) => {
    if (catalog instanceof Map) return catalog.get(key);
    return catalog && Object.prototype.hasOwnProperty.call(catalog, key) ? catalog[key] : undefined;
  };

  // merge duplicate lines FIRST so splitting one item across lines can't dodge per-line limits
  const merged = new Map();
  for (const it of items) {
    if (!it || typeof it !== 'object') throw new PricingError('Invalid item in cart', 'BAD_ITEM');
    const { productId, variantId = '', qty } = it;
    const idOk = (v) => (typeof v === 'string' && v.length > 0 && v.length <= 100) || isInt(v);
    if (!idOk(productId) || (variantId !== '' && !idOk(variantId))) throw new PricingError('Invalid item in cart', 'BAD_ITEM');
    if (typeof qty !== 'number' || !isInt(qty) || qty < 1) throw new PricingError('Quantity must be a whole number, at least 1', 'BAD_QTY');
    const key = `${productId}:${variantId}`;
    const total = (merged.get(key) || 0) + qty;
    if (!isInt(total)) throw new PricingError('Invalid quantity', 'BAD_QTY');
    merged.set(key, total);
  }

  const lines = [];
  let subtotal = 0;
  for (const [key, qty] of merged) {
    const p = lookup(key);
    if (!p) throw new PricingError('An item in your cart is no longer available', 'UNKNOWN_ITEM');
    if (!isInt(p.pricePaise) || p.pricePaise < 1) throw new PricingError('An item in your cart has no valid price', 'BAD_PRICE');
    if (p.inStock === false) throw new PricingError(`${p.name || 'An item'} is out of stock`, 'OUT_OF_STOCK');
    const maxQty = Math.min(L.maxQtyPerLine, isInt(p.maxQty) && p.maxQty > 0 ? p.maxQty : Infinity);
    if (qty > maxQty) throw new PricingError(`You can order at most ${maxQty} of ${p.name || 'this item'}`, 'BAD_QTY');
    const lineTotal = p.pricePaise * qty;
    subtotal += lineTotal;
    if (!isInt(lineTotal) || !isInt(subtotal)) throw new PricingError('Order too large', 'TOO_LARGE');
    lines.push({ key, name: p.name, qty, unitPaise: p.pricePaise, lineTotalPaise: lineTotal });
  }

  // delivery fee & discount must come from YOUR server logic (settings / validated coupon), never from the request
  if (!isInt(deliveryFeePaise) || deliveryFeePaise < 0 || deliveryFeePaise > L.maxDeliveryFeePaise) throw new PricingError('Invalid delivery fee', 'BAD_FEE');
  if (!isInt(discountPaise) || discountPaise < 0) throw new PricingError('Invalid discount', 'BAD_DISCOUNT');
  if (discountPaise > subtotal) throw new PricingError('Discount cannot exceed the cart value', 'BAD_DISCOUNT');

  const totalPaise = subtotal + deliveryFeePaise - discountPaise;
  if (!isInt(totalPaise) || totalPaise < L.minTotalPaise) throw new PricingError('Order total is too low', 'TOTAL_TOO_LOW');
  if (totalPaise > L.maxTotalPaise) throw new PricingError('Order total is above the online limit; please contact us', 'TOTAL_TOO_HIGH');

  return { lines, subtotalPaise: subtotal, deliveryFeePaise, discountPaise, totalPaise };
}

module.exports = { priceOrder, PricingError };
