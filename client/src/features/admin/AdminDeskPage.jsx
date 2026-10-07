import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import brand from '../../config/brand.config';
import { api } from '../../lib/api';
import { useAuthStore } from '../../store/authStore';

const STATUS_LABEL = {
  // PENDING_PAYMENT: 'Awaiting payment',
  // PLACED: 'Placed',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

const STATUS_STYLE = {
  PENDING_PAYMENT: 'bg-gold-100 text-gold-700',
  PLACED: 'bg-navy-200 text-navy-900',
  CONFIRMED: 'bg-navy-700 text-white',
  PREPARING: 'bg-gold-400 text-navy-900',
  OUT_FOR_DELIVERY: 'bg-magenta-500 text-white',
  DELIVERED: 'bg-success text-white',
  CANCELLED: 'bg-blush-200 text-error',
};

const FILTERS = [
  { id: '', label: 'All orders', dot: 'bg-navy-900' },
  // { id: 'PENDING_PAYMENT', label: 'Awaiting payment', status: 'PENDING_PAYMENT', dot: 'bg-gold-400' },
  // { id: 'PLACED', label: 'Placed', status: 'PLACED', dot: 'bg-navy-300' },
  { id: 'CONFIRMED', label: 'Confirmed', status: 'CONFIRMED', dot: 'bg-navy-700' },
  { id: 'PREPARING', label: 'Preparing', status: 'PREPARING', dot: 'bg-gold-600' },
  { id: 'OUT_FOR_DELIVERY', label: 'Out for delivery', status: 'OUT_FOR_DELIVERY', dot: 'bg-magenta-500' },
  { id: 'DELIVERED', label: 'Delivered', status: 'DELIVERED', dot: 'bg-success' },
  { id: 'CANCELLED', label: 'Cancelled', status: 'CANCELLED', dot: 'bg-error' },
  { id: 'REFUND_DUE', label: 'Cancelled, refund due', status: 'CANCELLED', paymentStatus: 'PAID', dot: 'bg-gold-700' },
];

function StatusFilter({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const selected = FILTERS.find((item) => item.id === value) || FILTERS[0];

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative w-64">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-2xl border border-cream-200 bg-white px-4 py-2.5 text-left shadow-card"
      >
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Show</span>
          <span className="mt-0.5 flex items-center gap-2 text-sm font-semibold text-navy-900">
            <span className={`h-2 w-2 shrink-0 rounded-full ${selected.dot}`} />
            <span className="truncate">{selected.label}</span>
          </span>
        </span>
        <ChevronDown size={16} className={`shrink-0 text-navy-900 transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <ul role="listbox" className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-cream-200 bg-white py-1 shadow-card">
          {FILTERS.map((item) => {
            const active = item.id === selected.id;
            return (
              <li key={item.id || 'all'} className={item.id === 'REFUND_DUE' ? 'border-t border-cream-100' : ''}>
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(item.id);
                    setOpen(false);
                  }}
                  className={`flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-sm ${active ? 'bg-cream-50 font-semibold text-navy-900' : 'text-navy-800 hover:bg-cream-50'}`}
                >
                  <span className={`h-2 w-2 shrink-0 rounded-full ${item.dot}`} />
                  {item.label}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

const NEXT_STATUS = {
  PENDING_PAYMENT: 'CONFIRMED',
  PLACED: 'CONFIRMED',
  CONFIRMED: 'PREPARING',
  PREPARING: 'OUT_FOR_DELIVERY',
  OUT_FOR_DELIVERY: 'DELIVERED',
};

function rupees(paise) {
  return Number.isFinite(paise) ? `₹${(paise / 100).toLocaleString('en-IN')}` : '—';
}

export default function AdminDeskPage() {
  const user = useAuthStore((state) => state.user);
  const ready = useAuthStore((state) => state.ready);
  const login = useAuthStore((state) => state.login);
  const logout = useAuthStore((state) => state.logout);
  const [form, setForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState([]);
  const [loadError, setLoadError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState(null);
  const [filter, setFilter] = useState('');

  const isAdmin = user?.role === 'admin';

  const loadOrders = useCallback(async () => {
    setLoadError('');
    try {
      const selected = FILTERS.find((item) => item.id === filter) || FILTERS[0];
      const data = await api.deskOrders({ status: selected.status, paymentStatus: selected.paymentStatus });
      setOrders(Array.isArray(data.data) ? data.data : []);
    } catch (err) {
      setLoadError(err.message || 'Could not load orders');
    }
  }, [filter]);

  useEffect(() => {
    if (isAdmin) loadOrders();
  }, [isAdmin, loadOrders]);

  const onLogin = async (event) => {
    event.preventDefault();
    setBusy(true);
    setAuthError('');
    try {
      const signedIn = await login(form);
      if (signedIn?.role !== 'admin') {
        await logout();
        setAuthError('This desk is only for the shop account.');
      }
    } catch (err) {
      setAuthError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const run = async (action, success) => {
    setNotice('');
    setLoadError('');
    setBusy(true);
    try {
      await action();
      setNotice(success);
      setConfirm(null);
      await loadOrders();
    } catch (err) {
      setLoadError(err.message);
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Shop desk — {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="min-h-screen bg-cream-50 pt-28 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          {!ready ? (
            <p className="text-sm text-muted">Loading…</p>
          ) : !isAdmin ? (
            <form onSubmit={onLogin} className="mx-auto max-w-md rounded-3xl border border-gold-200 bg-white p-8 shadow-card">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">Shop desk</p>
              <h1 className="mt-2 font-heading text-3xl font-bold text-navy-900">Staff sign in</h1>
              <div className="mt-6 space-y-3">
                <input
                  required
                  type="email"
                  autoComplete="username"
                  placeholder="Username"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-xl border border-cream-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                <input
                  required
                  type="password"
                  autoComplete="current-password"
                  placeholder="Password"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full rounded-xl border border-cream-200 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                />
                {authError && <p className="text-sm text-red-700">{authError}</p>}
                <button type="submit" disabled={busy} className="btn-gold-shimmer w-full cursor-pointer rounded-full py-3 text-sm font-semibold text-navy-900 disabled:cursor-not-allowed disabled:opacity-60">
                  {busy ? 'Checking…' : 'Open desk'}
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-600">Shop desk</p>
                  <h1 className="font-heading text-3xl font-bold text-navy-900">Orders</h1>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusFilter value={filter} onChange={setFilter} />
                  <button
                    type="button"
                    onClick={() => logout()}
                    className="cursor-pointer rounded-full border border-navy-900/15 bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:border-gold-500"
                  >
                    Sign out
                  </button>
                </div>
              </div>
              {notice && <p className="mb-4 text-sm text-emerald-800">{notice}</p>}
              {loadError && <p className="mb-4 text-sm text-red-700">{loadError}</p>}
              <div className="space-y-4">
                {orders.map((order) => {
                  const next = NEXT_STATUS[order.orderStatus];
                  const canRefund = order.paymentMethod === 'ONLINE' && order.paymentStatus === 'PAID';
                  return (
                    <article key={order._id} className="rounded-3xl border border-cream-100 bg-white p-5 shadow-card">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-heading text-xl font-bold text-navy-900">{order.orderNumber}</p>
                          <p className="mt-1 text-xs text-muted">
                            {order.user?.name || 'Customer'}
                            {order.user?.phone ? ` · ${order.user.phone}` : ''}
                            {' · '}
                            {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-heading text-xl font-bold text-navy-900">{rupees(order.totalPaise)}</p>
                          <p className="mt-1 flex flex-wrap justify-end gap-1.5">
                            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[order.orderStatus] || 'bg-cream-100 text-navy-900'}`}>
                              {STATUS_LABEL[order.orderStatus] || order.orderStatus}
                            </span>
                            {order.orderStatus === 'CANCELLED' && order.paymentStatus === 'REFUNDED' && (
                              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">Refunded</span>
                            )}
                            {order.orderStatus === 'CANCELLED' && order.paymentMethod === 'ONLINE' && order.paymentStatus === 'PAID' && (
                              <span className="inline-flex rounded-full bg-gold-100 px-2.5 py-1 text-xs font-semibold text-gold-700">Refund due</span>
                            )}
                          </p>
                          <p className="mt-1 text-xs text-muted">{order.paymentStatus} · {order.paymentMethod}</p>
                        </div>
                      </div>
                      {(order.items || []).length > 0 && (
                        <table className="mt-4 w-full max-w-md text-sm">
                          <thead>
                            <tr className="border-b border-cream-200 text-left text-[11px] uppercase tracking-[0.14em] text-muted">
                              <th className="py-2 pr-4 font-semibold">Item</th>
                              <th className="w-16 py-2 text-right font-semibold">Qty</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(order.items || []).map((item, index) => (
                              <tr key={`${order._id}-${index}`} className="border-b border-cream-100 last:border-0">
                                <td className="py-2 pr-4 text-navy-800">{item.productName}</td>
                                <td className="py-2 text-right font-semibold tabular-nums text-navy-900">{item.quantity}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                      <div className="mt-4 flex flex-wrap gap-2">
                        {next && (
                          <button
                            type="button"
                            onClick={() => run(
                              () => api.deskStatus(order._id, next),
                              `${order.orderNumber} marked ${STATUS_LABEL[next]}`,
                            )}
                            className="cursor-pointer rounded-full bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white"
                          >
                            Mark {STATUS_LABEL[next]}
                          </button>
                        )}
                        {order.orderStatus !== 'CANCELLED' && order.orderStatus !== 'DELIVERED' && (
                          <button
                            type="button"
                            onClick={() => setConfirm({
                              title: 'Cancel this order?',
                              message: `${order.orderNumber} will not be delivered.`,
                              yes: 'Cancel order',
                              tone: 'danger',
                              action: () => api.deskCancel(order._id),
                              success: `${order.orderNumber} cancelled`,
                            })}
                            className="cursor-pointer rounded-full border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700"
                          >
                            Cancel
                          </button>
                        )}
                        {canRefund && (
                          <button
                            type="button"
                            onClick={() => setConfirm({
                              title: 'Refund this payment?',
                              message: `${rupees(order.totalPaise)} goes back to the customer. ${order.orderNumber} will be cancelled.`,
                              yes: 'Refund',
                              tone: 'gold',
                              action: () => api.deskRefund(order._id),
                              success: `${order.orderNumber} refunded`,
                            })}
                            className="cursor-pointer rounded-full border border-gold-400 px-3 py-1.5 text-xs font-semibold text-gold-700"
                          >
                            Refund
                          </button>
                        )}
                      </div>
                    </article>
                  );
                })}
                {orders.length === 0 && !loadError && (
                  <p className="text-sm text-muted">
                    {filter === 'REFUND_DUE' ? 'No cancelled orders are waiting for a refund.' : filter ? `No ${STATUS_LABEL[filter].toLowerCase()} orders.` : 'No orders yet.'}
                  </p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-900/50 px-4" onClick={() => !busy && setConfirm(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-card" onClick={(event) => event.stopPropagation()}>
            <h2 className="font-heading text-2xl font-bold text-navy-900">{confirm.title}</h2>
            <p className="mt-2 text-sm text-muted">{confirm.message}</p>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirm(null)}
                className="cursor-pointer flex-1 rounded-full border border-navy-900/15 py-2.5 text-sm font-semibold text-navy-900 disabled:cursor-not-allowed"
              >
                Keep it
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => run(confirm.action, confirm.success)}
                className={`flex-1 cursor-pointer rounded-full py-2.5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${confirm.tone === 'danger' ? 'bg-red-700 text-white' : 'bg-navy-900 text-white'}`}
              >
                {busy ? 'Please wait…' : confirm.yes}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
