# Razorpay Payment Module (Node.js / Express / MongoDB)

Server-verified payments with a **"done or rolled back"** guarantee: every payment that Razorpay captures ends in exactly one of
*fulfilled* or *automatically refunded*, never both, never neither, never refunded twice. Details and proof: **AUDIT.md**.

```
razorpay-module/
  index.js                      createRazorpayModule(): /create-order /verify /status/:id /webhook + reconciler + auto-refund
  config.js  service.js  errors.js
  stores/mongo-store.js         PRODUCTION store (MongoDB / Mongoose 6+)
  stores/memory-store.js        dev/test only (refused in production)
  helpers/price-order.js        server-side cart pricing in integer paise (closes "order for less / for nothing")
  helpers/idempotency.js        Idempotency-Key middleware for your "place order" endpoint (double-click safe)
  client/razorpay-checkout.js   browser helper (ES module): pay(), waitForPaid(), getStatus(), newIdempotencyKey()
  test/                         npm-install-free tests (see section 9)
  .env.example
```

## 1. Install

```bash
npm install razorpay express express-rate-limit      # express-rate-limit v7+
```
Copy the `razorpay-module/` folder into your server (keep the sub-folders), fill `.env` from `.env.example`,
copy `client/razorpay-checkout.js` into your React app.

## 2. How an order flows (this is the contract with your code)

```
POST /api/orders   (Idempotency-Key)  ->  priceOrder() computes the total from YOUR DB  ->  Order saved: status PendingPayment, totalPaise
pay({ orderId })   ->  /create-order  (amount comes from getOrder(), never from the browser)  ->  Razorpay popup  ->  /verify
                                                    |  webhook + reconciler (safety nets, run even if the customer closed the tab)
                                                    v
                    onPaymentSuccess()  ->  Order CONFIRMED          or          CannotFulfil / stuck  ->  automatic REFUND -> onPaymentRefunded()
```
**Nothing is ever shipped/confirmed because the browser said so.** The only path to `Confirmed` is `onPaymentSuccess`.

## 3. Server: the code you write

Field names (`totalPaise`, `orderStatus` ...) are examples, adjust to your schema. Store money as **integer paise** everywhere.

```js
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const {
  createRazorpayModule, createMongoStore, createIdempotency, priceOrder, PricingError, CannotFulfil,
} = require('./razorpay-module');
const Order = require('./models/Order');
const Product = require('./models/Product');

const app = express();
app.set('trust proxy', 1);                 // behind Nginx/Render/Railway/..., so rate limits see real client IPs
// ... helmet(), cors({ origin: [CLIENT_URL], credentials: true }), cookieParser() ...

const store = createMongoStore(mongoose);

const razorpay = createRazorpayModule({
  store,
  authenticate: requireLogin,              // your login middleware (sets req.user)

  // 1) What must this customer pay? Read the total SAVED on the order. null if it isn't theirs / doesn't exist.
  getOrder: async (orderId, req) => {
    if (!mongoose.isValidObjectId(orderId)) return null;
    const o = await Order.findOne({ _id: orderId, user: req.user._id }).select('totalPaise paymentStatus').lean();
    return o && { amount: o.totalPaise, alreadyPaid: o.paymentStatus === 'Paid', customer: { name: req.user.name, email: req.user.email, contact: req.user.phone } };
  },

  // 2) Re-checked right before fulfilling (webhook context has no req/user). Cancelled or re-priced => customer is refunded, not charged.
  checkOrder: async (orderId) => {
    const o = await Order.findById(orderId).select('totalPaise orderStatus').lean();
    return o && { amount: o.totalPaise, cancelled: o.orderStatus === 'Cancelled' };
  },

  // 3) Payment captured. Runs once per payment (verify / webhook / reconciler race for it; one wins). MUST be idempotent.
  //    Throw CannotFulfil when it can NEVER work (=> automatic refund). Throw anything else for temporary problems (=> retried).
  onPaymentSuccess: async ({ internalOrderId, razorpayOrderId, paymentId, amount, method }) => {
    const r = await Order.updateOne(
      { _id: internalOrderId, totalPaise: amount, orderStatus: 'PendingPayment' },       // only a still-pending order of EXACTLY this total
      { $set: { paymentStatus: 'Paid', orderStatus: 'Confirmed', paidAt: new Date(),
                'razorpay.orderId': razorpayOrderId, 'razorpay.paymentId': paymentId, 'razorpay.method': method } },
    );
    if (r.modifiedCount === 1) return;                                                    // first time: done (enqueue emails/WhatsApp here, don't send inline)
    const o = await Order.findById(internalOrderId).select('razorpay.paymentId').lean();
    if (o && o.razorpay && o.razorpay.paymentId === paymentId) return;                    // an earlier attempt already applied it: idempotent success
    throw new CannotFulfil('Order is cancelled, already paid by another payment, or its total changed');
  },

  // 4) A payment was refunded (automatic, or from the Razorpay dashboard). MUST undo the order if THIS payment had confirmed it.
  //    May be called more than once for the same payment (at-least-once delivery): keep it idempotent.
  onPaymentRefunded: async ({ internalOrderId, paymentId }) => {
    await Order.updateOne({ _id: internalOrderId, 'razorpay.paymentId': paymentId },
      { $set: { paymentStatus: 'Refunded', orderStatus: 'Cancelled' } });                 // + restock, tell the customer
  },

  // 5) Strongly recommended: an alert you will actually see (email/Slack/WhatsApp to the owner).
  onPaymentAnomaly: async (info) => { /* info.type, info.paymentId, info.action */ },

  // optional: metrics: { inc(name) } for Prometheus/StatsD
});

// Place-order endpoint: double-click / retry safe, price computed from YOUR database only.
const idempotent = createIdempotency(mongoose);
// order matters: login -> body parser -> idempotent() (it hashes req.body to catch "same key, different cart")
app.post('/api/orders', requireLogin, express.json({ limit: '20kb' }), idempotent(), async (req, res, next) => {
  try {
    const ids = [...new Set((req.body.items || []).map((i) => String(i && i.productId)))].filter((id) => mongoose.isValidObjectId(id)).slice(0, 100);
    const products = await Product.find({ _id: { $in: ids } }).lean();
    const catalog = new Map();
    for (const p of products) for (const v of p.variants) catalog.set(`${p._id}:${v.id}`, { pricePaise: v.pricePaise, inStock: p.inStock, name: `${p.name} ${v.label}` });
    const priced = priceOrder({ items: req.body.items, catalog, deliveryFeePaise: settings.deliveryFeePaise });
    const order = await Order.create({ user: req.user._id, items: priced.lines, totalPaise: priced.totalPaise, paymentStatus: 'Pending', orderStatus: 'PendingPayment' });
    res.status(201).json({ orderId: order._id, totalPaise: priced.totalPaise });          // handler MUST answer with res.json()
  } catch (e) { if (e instanceof PricingError) return res.status(e.status).json({ error: e.message }); next(e); }
});

// !!! Mount the payments router BEFORE express.json() / express-mongo-sanitize / hpp: the webhook needs the raw body.
app.use('/api/payments', razorpay.router);
app.use(express.json());
// ... rest of your app ...

mongoose.connect(process.env.MONGODB_URI).then(async () => {   // URI: ...?retryWrites=true&w=majority
  await store.ensureIndexes();      // creates the unique + reconciler indexes (the "one active order" guarantee depends on them)
  razorpay.startReconciler();       // recovers missed webhooks + finishes unfinished refunds. Safe on every server.
  app.listen(process.env.PORT || 5000);
});
```
Also: delete/expire `PendingPayment` orders that stay unpaid for a day or two (a cron / Mongo TTL), and if `onPaymentSuccess` touches several
collections (order + stock) do it in one `session.withTransaction()` (needs a replica set; Atlas has one).

## 4. Frontend (React)

```jsx
import { pay, waitForPaid, newIdempotencyKey } from '../lib/razorpay-checkout';

// place the order once per checkout attempt; reuse the SAME key if you retry this request
const key = useRef(newIdempotencyKey());
const { orderId } = await api.post('/api/orders', { items }, { headers: { 'Idempotency-Key': key.current } });

await pay({
  orderId,                                              // your order id, NOT an amount
  // headers: () => ({ Authorization: `Bearer ${token}` }),   // only for header-based JWT
  onSuccess: () => navigate(`/order-success/${orderId}`),
  onPending: async () => {                              // paid; server still confirming. Reassure, then wait
    const r = await waitForPaid(orderId);               // 'paid' | 'refunded' | 'processing' | 'timeout'
    navigate(`/order-success/${orderId}`);
  },
  onFailure: (e) => toast.error(e.message),             // includes "...being refunded automatically" when an order can't be applied
  onDismiss: () => setBusy(false),
});
```
On the success page call `getStatus(orderId)` (`paid | processing | refunded | unpaid`) so a reload always shows the truth.
Cookie auth across two domains needs `cors({ credentials: true })` and `SameSite=None; Secure` cookies. Plain HTML: `<script type="module">`.

## 5. Webhook setup (don't skip)

Razorpay Dashboard -> Account & Settings -> Webhooks -> Add: URL `https://YOUR-DOMAIN/api/payments/webhook`, Secret = `RAZORPAY_WEBHOOK_SECRET`,
events **`payment.captured`, `payment.failed`, `order.paid`, `refund.processed`**. Razorpay retries non-2xx for ~24 h; the module answers 5xx exactly when a retry can help.

## 6. What happens when ...

| Situation | Result |
|---|---|
| Customer's network drops / closes the tab right after paying | Webhook (or the reconciler within minutes) confirms the order |
| Razorpay API slow or down during verify | Customer sees "confirming"; transient errors are retried; webhook/reconciler finish it |
| Your server or DB is down while fulfilling | Retried with backoff by webhook retries + reconciler. If it stays broken for 2 h and 6 attempts: **automatic refund** |
| Order can't be fulfilled (cancelled, out of stock, total changed, deleted) | `CannotFulfil` / `checkOrder` -> **automatic refund**, `onPaymentRefunded` cancels the order |
| Customer pays the same order twice (two tabs, retries) | One payment fulfils the order, the **other is refunded** |
| Double-click "Pay" / "Place order" | One Razorpay order and popup (single-flight + unique index); one order (Idempotency-Key) |
| Refund call fails or its response is lost | Durable queue, retried with backoff; Razorpay's `amount_refunded` is checked first, so **never refunded twice** |
| Process crashes mid-fulfilment, or two servers race | Lease + fencing token: exactly one worker completes; a dead worker's lease expires and another finishes |
| Forged / replayed `verify` or webhook | Rejected: HMAC signature, order-payment binding, ownership check |
| Someone tries to pay less / nothing | Amount lives on the Razorpay order (server-set); `priceOrder` blocks bad carts; min Re 1 / max rail; any mismatch is refunded, never fulfilled |
| Traffic spike | Razorpay calls capped (50 concurrent, bounded queue, 8 s wait) -> fast 503 + automatic client retry instead of a meltdown |

## 7. Production checklist

- [ ] One real **test-mode** run first (`rzp_test_` keys, UPI `success@razorpay` / `failure@razorpay`): pay, fail, close popup, **close the tab right after paying**, pay twice
- [ ] Webhook shows 200s in the Razorpay dashboard; `onPaymentAnomaly` really alerts you
- [ ] Live keys only in production env vars; module refuses the memory store in production
- [ ] MongoDB: **replica set** (Atlas default), URI with `retryWrites=true&w=majority`, `await store.ensureIndexes()` ran
- [ ] HTTPS; helmet CSP allows `https://checkout.razorpay.com` (script+frame) and `https://api.razorpay.com`; `trust proxy` set
- [ ] **Several servers / PM2 cluster?** share rate-limit counters (payment correctness never depends on this, only abuse protection):
  ```js
  const { RedisStore } = require('rate-limit-redis');      // npm i rate-limit-redis ioredis
  createRazorpayModule({ /* ... */ rateLimitStore: (name) => new RedisStore({ sendCommand: (...a) => redis.call(...a), prefix: `rl:rzp:${name}:` }) });
  ```
- [ ] **Guest checkout** (no login)? Use unguessable order ids (`crypto.randomUUID()`), not sequential numbers
- [ ] Ask Razorpay support about API rate limits for your expected peak; tune `config.maxConcurrent`
- [ ] Alert on `metrics` names `razorpay.anomaly`, and on refunds pending > 1 h (`Refund` collection, status `failed`)

## 8. Honest limits (what no code can promise)

- Refund *money movement* time belongs to Razorpay/banks (UPI is usually instant, cards take days). The module guarantees the refund is **issued**.
- If Razorpay itself is down for hours, refunds wait and are issued automatically when it returns.
- A payment landing after the reconciler stopped watching an abandoned cart (default ~33 h) relies on Razorpay's 24 h webhook retries.
- The per-record reconciler is sized for up to a few hundred thousand orders/day. Beyond that, add a windowed settlement scan (Razorpay `payments.all`).
- Tested against stand-ins for Express / Razorpay / MongoDB, not the real services. Do the test-mode run above.

## 9. Tests (no `npm install` needed)

```bash
node --test test/run.js                    # 60 scenario tests (races, tampering, refunds, crash recovery, load)
STORE=mongo node --test test/run.js        # same 60 through mongo-store.js (fake Mongoose)
node --test test/chaos.test.js             # failure-injection simulation: ~5,600 payments, "fulfilled XOR refunded" invariant (~75 s)
node --test test/pricing.test.js           # cart-tampering attacks + 40,000-cart fuzz
node --test test/idempotency.test.js       # double-click / retry safety
node --test test/client.test.mjs           # browser helper
```
