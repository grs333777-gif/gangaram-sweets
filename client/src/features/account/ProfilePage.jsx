import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LogOut, Package } from 'lucide-react';
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

function statusClass(status) {
  if (status === 'DELIVERED' || status === 'CONFIRMED') return 'bg-emerald-50 text-emerald-800';
  if (status === 'CANCELLED') return 'bg-red-50 text-red-700';
  if (status === 'PENDING_PAYMENT') return 'bg-amber-50 text-amber-800';
  return 'bg-cream-100 text-navy-800';
}

function rupees(paise) {
  return `₹${(paise / 100).toLocaleString('en-IN')}`;
}

function normalizeOrder(order) {
  if (!order || typeof order !== 'object') return null;
  const items = Array.isArray(order.items)
    ? order.items.filter(Boolean).map((item) => ({
        name: item.productName || 'Item',
        quantity: Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 1,
      }))
    : [];
  const created = order.createdAt ? new Date(order.createdAt) : null;
  const total = Number(order.totalPaise);
  return {
    id: String(order._id || order.orderNumber || items.map((item) => item.name).join('-')),
    orderNumber: order.orderNumber || 'Order',
    createdLabel: created && !Number.isNaN(created.getTime())
      ? created.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })
      : 'Date unavailable',
    delivery: order.deliveryType === 'pickup' ? 'Store pickup' : order.deliveryType === 'delivery' ? 'Home delivery' : 'Fulfilment pending',
    payment: order.paymentMethod === 'COD' ? 'Cash on delivery' : order.paymentMethod === 'ONLINE' ? 'Paid online' : 'Payment pending',
    paymentStatus: order.paymentStatus || null,
    paymentMethod: order.paymentMethod || null,
    totalLabel: Number.isFinite(total) ? rupees(total) : '—',
    status: order.orderStatus || 'PLACED',
    items,
  };
}

function refundStatus(order) {
  if (order.status !== 'CANCELLED') return null;
  if (order.paymentStatus === 'REFUNDED') {
    return { label: 'Refunded', className: 'bg-emerald-50 text-emerald-800' };
  }
  if (order.paymentMethod === 'ONLINE' && order.paymentStatus === 'PAID') {
    return { label: 'Refund pending', className: 'bg-amber-50 text-amber-800' };
  }
  return { label: 'No refund', className: 'bg-cream-100 text-muted' };
}

export default function ProfilePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const ready = useAuthStore((state) => state.ready);
  const logout = useAuthStore((state) => state.logout);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      navigate('/login?next=/account', { replace: true });
      return;
    }
    let ignore = false;
    setLoading(true);
    setError('');
    api.myOrders()
      .then((data) => {
        if (ignore) return;
        const rows = Array.isArray(data.data) ? data.data : [];
        setOrders(rows.map(normalizeOrder).filter(Boolean));
      })
      .catch((err) => {
        if (ignore) return;
        if (err.status === 401) {
          navigate('/login?next=/account', { replace: true });
          return;
        }
        setError('We could not load your orders. Please try again.');
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [ready, user, navigate, reloadKey]);

  const signOut = async () => {
    await logout();
    navigate('/');
  };

  if (!user) {
    return null;
  }

  const initial = user.name.trim().charAt(0).toUpperCase();

  return (
    <>
      <Helmet>
        <title>My account — {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-cream-50 pt-28 pb-20">
        <div className="max-w-3xl mx-auto px-4 sm:px-6">
          <section className="overflow-hidden rounded-3xl border border-gold-200 bg-white shadow-card">
            <div className="h-24 bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900" />
            <div className="px-6 pb-6 sm:px-8">
              <div className="-mt-10 flex flex-wrap items-end justify-between gap-4">
                <div className="flex items-end gap-4">
                  <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-gold-300 via-gold-400 to-gold-600 font-heading text-3xl font-bold text-navy-900 shadow-gold">
                    {initial}
                  </div>
                  <div className="pb-1">
                    <p className="text-xs font-medium uppercase tracking-[0.22em] text-gold-600">Your account</p>
                    <h1 className="font-heading text-3xl font-bold text-navy-900">{user.name}</h1>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-2 rounded-full border border-navy-900/15 bg-cream-50 px-4 py-2 text-sm font-semibold text-navy-900 transition hover:border-gold-500 hover:bg-gold-50"
                >
                  <LogOut size={16} className="text-gold-600" />
                  Sign out
                </button>
              </div>
              <dl className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-cream-50 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wider text-muted">Email</dt>
                  <dd className="mt-1 text-sm font-medium text-navy-900">{user.email}</dd>
                </div>
                <div className="rounded-2xl bg-cream-50 px-4 py-3">
                  <dt className="text-xs uppercase tracking-wider text-muted">Phone</dt>
                  <dd className="mt-1 text-sm font-medium text-navy-900">{user.phone}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="mt-8">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-heading text-2xl font-bold text-navy-900">Orders</h2>
              <Link to="/menu" className="text-sm font-medium text-gold-700 hover:text-navy-900">
                Order again
              </Link>
            </div>

            {loading && <p className="text-sm text-muted">Loading your orders…</p>}
            {error && (
              <div className="rounded-2xl border border-red-100 bg-white px-4 py-4">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  type="button"
                  onClick={() => setReloadKey((value) => value + 1)}
                  className="mt-3 rounded-full border border-navy-900/15 px-4 py-2 text-sm font-semibold text-navy-900 hover:border-gold-500"
                >
                  Try again
                </button>
              </div>
            )}

            {!loading && !error && orders.length === 0 && (
              <div className="rounded-3xl border border-dashed border-gold-300 bg-white px-6 py-12 text-center">
                <Package className="mx-auto text-gold-500" size={28} />
                <p className="mt-3 font-heading text-xl text-navy-900">No orders yet</p>
                <p className="mt-1 text-sm text-muted">Sweets you order will appear here.</p>
                <Link to="/menu" className="btn-gold-shimmer mt-5 inline-flex rounded-full px-5 py-2.5 text-sm font-semibold text-navy-900">
                  Browse the menu
                </Link>
              </div>
            )}

            <div className="space-y-4">
              {orders.map((order) => {
                const refund = refundStatus(order);
                return (
                <article key={order.id} className="rounded-3xl border border-cream-100 bg-white p-5 shadow-card">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-heading text-xl font-bold text-navy-900">{order.orderNumber}</p>
                      <p className="mt-1 text-xs text-muted">
                        {order.createdLabel}
                        {' · '}
                        {order.delivery}
                        {' · '}
                        {order.payment}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-heading text-xl font-bold text-navy-900">{order.totalLabel}</p>
                      <div className="mt-1 flex flex-wrap justify-end gap-1.5">
                        <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(order.status)}`}>
                          {STATUS_LABEL[order.status] || 'In progress'}
                        </span>
                        {refund && (
                          <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-semibold ${refund.className}`}>
                            {refund.label}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {order.items.length > 0 && (
                    <ul className="mt-4 space-y-1 border-t border-cream-100 pt-3 text-sm text-navy-800">
                      {order.items.map((item, index) => (
                        <li key={`${order.id}-${index}`} className="flex justify-between gap-3">
                          <span>{item.name}</span>
                          <span className="text-muted">× {item.quantity}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
