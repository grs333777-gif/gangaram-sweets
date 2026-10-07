/**
 * Frontend helper (ES module). Works in React/Vite, and as <script type="module"> in plain pages
 * (it also sets window.RazorpayCheckout).
 *
 *   import { pay } from './razorpay-checkout';
 *   pay({ orderId, onSuccess: () => navigate('/order-success'), onPending: ..., onFailure: (e) => toast.error(e.message) });
 *
 * The browser only sends YOUR order id. The amount is decided on the server.
 */

const CHECKOUT_SRC = 'https://checkout.razorpay.com/v1/checkout.js';
let scriptPromise = null;
let busy = false; // blocks double-click => two popups

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function loadScript() {
  if (typeof window !== 'undefined' && window.Razorpay) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = CHECKOUT_SRC;
    s.async = true;
    s.onload = resolve;
    s.onerror = () => { scriptPromise = null; reject(new Error('Could not load Razorpay. Check your connection or ad-blocker.')); };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/** headers may be an object or a function (so a refreshed token is picked up on every call). */
function resolveHeaders(h) {
  try { return (typeof h === 'function' ? h() : h) || {}; } catch { return {}; }
}

async function request(url, { method = 'POST', body, headers, timeoutMs = 20000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', ...resolveHeaders(headers) },
      credentials: 'include', // send session/JWT cookie if you use cookie auth
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, ok: res.ok, data };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The customer has ALREADY paid at this point, so never give up on a flaky connection:
 * retry network errors / 5xx / 429 / "still confirming" (202) for ~30s. Only a definite 4xx is a failure.
 * Returns { status: 'paid' | 'pending' }.
 */
async function verifyPayment(apiBase, payload, headers) {
  const delays = [0, 1500, 3000, 5000, 8000, 12000];
  for (const wait of delays) {
    if (wait) await sleep(wait);
    let r;
    try {
      r = await request(`${apiBase}/verify`, { body: payload, headers });
    } catch (e) {
      continue; // offline / timeout: try again
    }
    if (r.status === 200) return { status: 'paid' };
    if (r.status === 202 || r.status === 429 || r.status >= 500) continue;
    throw new Error(r.data.error || 'Payment verification failed');
  }
  return { status: 'pending' }; // server will finish via webhook; show "we'll confirm shortly"
}

/**
 * create-order is idempotent on the server (same order => same Razorpay order), so a dropped connection / 503 / 429 is safe to retry.
 */
async function createOrderWithRetry(apiBase, orderId, headers) {
  const waits = [0, 500, 1500, 3000];
  let last;
  for (const wait of waits) {
    if (wait) await sleep(wait);
    try {
      const r = await request(`${apiBase}/create-order`, { body: { orderId }, headers });
      if (r.status !== 503 && r.status !== 429 && r.status < 502) return r; // success, or a definite answer (4xx / 500)
      last = r;
    } catch (e) { last = { ok: false, status: 0, data: { error: 'Network problem. Please check your connection.' } }; }
  }
  return last;
}

/**
 * A fresh key for ONE checkout attempt. Send it as the `Idempotency-Key` header on your "place order" request and REUSE the
 * same key if you retry that request, so a double-click or a retry after a network drop can never create two orders.
 */
export function newIdempotencyKey() {
  const c = typeof crypto !== 'undefined' ? crypto : null;
  if (c && c.randomUUID) return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && c.getRandomValues) c.getRandomValues(bytes); else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** GET /status/:orderId -> { status: 'paid' | 'processing' | 'unpaid' }. Use it on the order-success page. */
export async function getStatus(orderId, { apiBase = '/api/payments', headers } = {}) {
  const r = await request(`${apiBase.replace(/\/$/, '')}/status/${encodeURIComponent(orderId)}`, { method: 'GET', headers });
  if (!r.ok) throw new Error(r.data.error || `Status check failed (${r.status})`);
  return r.data;
}

/**
 * For the "paid, still confirming" case (onPending) or a page reload on the success page: polls until the order is
 * 'paid' or 'refunded' (or time runs out). Resolves { status: 'paid' | 'refunded' | 'processing' | 'unpaid' | 'timeout' }.
 */
export async function waitForPaid(orderId, { apiBase = '/api/payments', headers, timeoutMs = 90000, intervalMs = 3000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  let last = { status: 'unpaid' };
  while (Date.now() < deadline) {
    try { last = await getStatus(orderId, { apiBase, headers }); } catch (e) { /* network blip: keep polling */ }
    if (last.status === 'paid' || last.status === 'refunded') return last;
    await sleep(intervalMs);
  }
  return { ...last, status: last.status === 'processing' ? 'processing' : 'timeout' };
}

/**
 * @param {Object}   o
 * @param {string}   o.orderId        YOUR order id
 * @param {string}   [o.apiBase]      default '/api/payments'
 * @param {Object|Function} [o.headers] e.g. () => ({ Authorization: `Bearer ${token}` }) or { 'X-CSRF-Token': '...' }
 * @param {Object}   [o.prefill]      { name, email, contact }
 * @param {string}   [o.description]
 * @param {string}   [o.themeColor]   default Gangaram navy
 * @param {Function} [o.onSuccess]    ({ orderId, status:'paid' })
 * @param {Function} [o.onPending]    paid, but server still confirming ({ orderId, status:'pending' }); reassure the customer, then call waitForPaid(orderId)
 * @param {Function} [o.onFailure]    (error) terminal error, or a failed attempt if onAttemptFailed isn't given
 * @param {Function} [o.onAttemptFailed] (error) one failed attempt; the customer can retry inside the popup
 * @param {Function} [o.onDismiss]    user closed the popup without paying
 * @returns {Promise<{status: string}>}
 */
export function pay(o = {}) {
  const apiBase = (o.apiBase || '/api/payments').replace(/\/$/, '');
  const noop = () => {};
  const onSuccess = o.onSuccess || noop;
  const onPending = o.onPending || noop;
  const onFailure = o.onFailure || noop;
  const onDismiss = o.onDismiss || noop;
  const onAttemptFailed = o.onAttemptFailed || onFailure;

  if (!o.orderId) { onFailure(new Error('orderId is required')); return Promise.resolve({ status: 'error' }); }
  if (busy) return Promise.resolve({ status: 'busy' });
  busy = true;

  return Promise.all([loadScript(), createOrderWithRetry(apiBase, o.orderId, o.headers)])
    .then(([, created]) => {
      if (!created.ok) throw new Error(created.data.error || `Could not start payment (${created.status})`);
      const order = created.data;

      return new Promise((resolve) => {
        let settled = false;
        let verifying = false; // once the popup reports success, a later "dismiss" must not cancel the flow
        const done = (fn, result) => {
          if (settled) return;
          settled = true;
          busy = false;
          try { fn(result); } catch (e) { console.error(e); }
          resolve(result);
        };

        const rzp = new window.Razorpay({
          key: order.keyId,
          order_id: order.razorpayOrderId,
          amount: order.amount,
          currency: order.currency,
          name: order.businessName,
          description: o.description || `Order ${o.orderId}`,
          prefill: o.prefill || order.prefill || {},
          theme: { color: o.themeColor || '#2A3F87' },
          modal: {
            escape: false,
            confirm_close: true, // "are you sure?" if they close mid-payment
            ondismiss: () => { if (!verifying) done(onDismiss, { status: 'dismissed' }); },
          },
          handler: (resp) => {
            // Success in the popup is NOT proof of payment. The server verifies it.
            verifying = true;
            verifyPayment(apiBase, {
              orderId: o.orderId,
              razorpay_order_id: resp.razorpay_order_id,
              razorpay_payment_id: resp.razorpay_payment_id,
              razorpay_signature: resp.razorpay_signature,
            }, o.headers)
              .then((v) => (v.status === 'paid'
                ? done(onSuccess, { orderId: o.orderId, status: 'paid' })
                : done(onPending, { orderId: o.orderId, status: 'pending' })))
              .catch((err) => done(onFailure, err));
          },
        });

        // Don't settle here: Razorpay lets the customer retry inside the same popup.
        rzp.on('payment.failed', (resp) => {
          const e = (resp && resp.error) || {};
          onAttemptFailed(new Error(e.description || 'Payment failed'));
        });
        rzp.open();
      });
    })
    .catch((err) => { busy = false; onFailure(err); return { status: 'error', error: err }; });
}

if (typeof window !== 'undefined') window.RazorpayCheckout = { pay, getStatus, waitForPaid, newIdempotencyKey };
export default { pay, getStatus, waitForPaid, newIdempotencyKey };
