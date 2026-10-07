# Audit report

Two rounds. Round 1 fixed bugs in the original code. Round 2 was about *guarantees*: money never lost, never taken without an order,
never refunded twice, no order for less. Everything marked **Reproduced** was seen failing on earlier code before it was fixed.

## What "done or rolled back" means here, and its limit

A payment spans two systems (Razorpay + your database); no code makes them commit atomically. The module therefore combines
**roll forward** (webhook, verify and a background reconciler all try to finish the order) and **compensation** (if the order can't be
fulfilled, the customer is refunded automatically). The guarantee, enforced by atomic compare-and-set operations and tested under failure injection:

> every payment Razorpay captures ends in **exactly one** of: *fulfilled* or *fully refunded*. Never both. Never neither. Never refunded twice.

What no code can control: how long banks take to move refunded money, and Razorpay being down for hours (refunds then wait and are issued when it returns).

## Round 2: findings

| # | Finding | Evidence | Fix |
|---|---------|----------|-----|
| 1 | **Customer paying twice for one order was silently double-charged** (second payment ignored, no refund) | Reproduced | Order is bound to the first payment id; any other captured payment is refunded |
| 2 | Payment on a replaced/changed order only raised an alert; customer stayed charged until a human acted | Reproduced | Decision gate + automatic refund; `checkOrder` re-validates right before fulfilling |
| 3 | Fulfilment failing permanently was retried forever, money held | Reproduced | `CannotFulfil` => refund; undeclared failures => refund after 6 attempts AND 2 h (configurable) |
| 4 | Reconciler scanned/sorted every unfinished record (grows with abandoned carts) and every server did the same work | Code review (design analysis; not load-tested) | Indexed "due" queue (`nextReconcileAt`), per-record backoff, compare-and-set lease so one server wins each record |
| 5 | A slow/paused worker could complete or release over the worker that took over | Code review | Fencing token on claim; `complete/release/markRefunded` require the current token |
| 6 | Refund could be issued twice after a lost response / retry; refund notification could be lost (order stays "paid" after refund = free goods) | Found while building the simulation | One refund row per payment id (unique), checks Razorpay `amount_refunded` first, host notified **before** the refund is marked complete (at-least-once) |
| 7 | **Lost acknowledgement on the reconciler's own schedule update could make a payment invisible forever** | **Found by failure-injection** (customer charged, nothing happened) | Lease pattern: claim only parks the record; next check written after the work succeeds |
| 8 | Orders already *refunded* were not swept for a second (surplus) payment whose webhook was lost | **Found by failure-injection** at 40% failure rate | Every state (open / paid / refunded) gets the payment sweep |
| 9 | Amount rails: zero/tiny/huge/float totals, Razorpay echoing a different amount, payment amount differing from order | Code review | Min Re 1 / configurable max, integer check, echo cross-check, mismatch => refund (verify, webhook, reconciler) |
| 10 | The cart total (what `getOrder` returns) is the real attack surface: negative/fractional/huge quantities, client prices, float rounding, discount > cart, zero total | Attack tests + 40,000-cart fuzz | `helpers/price-order.js`, integer paise only, server data only |
| 11 | Double-click on "place order" creates two orders (the payment module alone can't stop that) | Code review | `helpers/idempotency.js` (Idempotency-Key, atomic, replays the stored response) |
| 12 | 2,000 simultaneous requests exceeded what Razorpay/your event loop should take at once | Load test | Concurrency cap + bounded queue + queue-wait timeout -> fast 503; transient Razorpay errors retried with backoff; client retries 503 automatically |
| 13 | Client could not tell "refunded automatically" from "failed"; no way to wait for a slow confirmation; no idempotency key helper | Code review | `waitForPaid`, `getStatus` returns `refunded`, `newIdempotencyKey`, `create-order` retry |
| 14 | Dashboard/dispute refunds left orders marked paid | Code review | `refund.processed` webhook -> `onPaymentRefunded` |

## Round 1 (original code), condensed

Module could not start (flat zip vs `./stores/...` require) · crash after "mark paid" lost fulfilment · old cheaper Razorpay order payable ·
failed payment shown as "pending" · late `payment.failed` cancelled a paid order · double-click created 2 Razorpay orders ·
customer told "failed" after being charged · no API timeouts · IP-only rate limiting (mobile CGNAT) · no missed-webhook recovery ·
no MongoDB store · body-parser errors returned as 500 · webhook mounted after `express.json()` failed silently · client lacked retries,
dismiss-race guard, double-click guard, used the wrong theme colour.

## Verification (all runnable with `node --test`, no npm install)

| Suite | What it proves | Result |
|---|---|---|
| `test/run.js` x2 stores | 60 scenarios: races, forged/replayed requests, tampering, crash recovery, reconciler, refunds (lost response, API down, DB down, give-up), backpressure, 2,000-customer load | 60/60 on memory store and on `mongo-store.js` (fake Mongoose) |
| `test/chaos.test.js` | ~5,600 payments across 4 configurations (+ a 35%-failure run): random DB/Razorpay/hook failures (incl. "write succeeded but caller saw an error"), duplicate/late/lost webhooks, two servers, double payers, re-priced and cancelled orders, broken fulfilment. Then: invariant check. | 0 violations |
| extra chaos sweeps (not committed) | ~26,000 more payments in ~320 random worlds at 12-50% failure rates on the final code. Earlier sweeps are what exposed findings 7 and 8 | 0 violations after fixes |
| `test/pricing.test.js` | attack classes (negative/zero/fractional/NaN/huge qty, client prices, overflow, discount/fee abuse, zero total, prototype keys) + 40,000 mutated carts (>15,000 accepted, >5,000 rejected, every accepted total re-derived from server prices) | 14/14 |
| `test/idempotency.test.js` | 10 simultaneous duplicates -> handler once; different body -> 422; per-user scope; 5xx releases key; dead-server takeover | 8/8 |
| `test/readme-host.test.js` | the exact hooks in README section 3, against Mongo-like `updateOne` semantics | 7/7 |
| `test/client.test.mjs` | browser helper: retries, dismiss race, double-click, 503 handling, polling | 15/15 |

## NOT verified (do these before taking real money)

1. **One real test-mode run end to end** with `rzp_test_` keys + ngrok webhook: success, failed payment, close popup, **close tab right after paying**, pay twice. My tests use stand-ins for Razorpay, Express and MongoDB, so they prove the logic, not your deployment.
2. **Real MongoDB**: run `store.ensureIndexes()`; use a replica set and `w=majority`. The fake Mongoose enforces unique indexes and rejects conflicting update operators, but it is not MongoDB.
3. **Throughput numbers**: the 2,000-customer test shows correctness under concurrency, not requests/second on your hardware. Load-test staging.
4. Razorpay API rate limits for your account: ask support, then tune `config.maxConcurrent`.

## Things only you can guarantee

- `getOrder().amount` is the total **saved on the order**, computed by `priceOrder` from your DB (never from the browser).
- `onPaymentSuccess` is idempotent and uses a conditional update (README does); `onPaymentRefunded` undoes the order for the refunded payment.
- Slow work (emails, WhatsApp) goes on a queue, not inline in the hooks (a webhook should answer in seconds).
- Guest checkout => unguessable order ids. Razorpay KYC in the business's name; live keys only in production env vars.
