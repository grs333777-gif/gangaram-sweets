import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Search, Package, CheckCircle, Clock, Truck, ChefHat, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';
import { api } from '../../lib/api';

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

const FLOW = [
  { status: 'PLACED', label: 'Placed', icon: Package },
  { status: 'CONFIRMED', label: 'Confirmed', icon: CheckCircle },
  { status: 'PREPARING', label: 'Preparing', icon: ChefHat },
  { status: 'OUT_FOR_DELIVERY', label: 'Out for delivery', pickupLabel: 'Ready for pickup', icon: Truck },
  { status: 'DELIVERED', label: 'Delivered', pickupLabel: 'Picked up', icon: CheckCircle },
];

const RANK = {
  PENDING_PAYMENT: 0,
  PLACED: 0,
  CONFIRMED: 1,
  PREPARING: 2,
  OUT_FOR_DELIVERY: 3,
  DELIVERED: 4,
};

function when(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

function historyTime(order, status) {
  const entry = (order.history || []).find((item) => item.status === status);
  return entry?.timestamp || null;
}

function timeline(order) {
  const pickup = order.deliveryType === 'pickup';
  const labelFor = (step) => (pickup && step.pickupLabel ? step.pickupLabel : step.label);

  if (order.orderStatus === 'CANCELLED') {
    const done = FLOW.filter((step) => historyTime(order, step.status)).map((step) => ({
      label: labelFor(step),
      icon: step.icon,
      time: historyTime(order, step.status),
      state: 'done',
    }));
    return [
      ...done,
      { label: 'Cancelled', icon: XCircle, time: historyTime(order, 'CANCELLED'), state: 'cancelled' },
    ];
  }

  const rank = RANK[order.orderStatus] ?? 0;
  return FLOW.map((step, index) => {
    const state = index < rank || order.orderStatus === 'DELIVERED' ? 'done' : index === rank ? 'current' : 'upcoming';
    const awaiting = index === 0 && order.orderStatus === 'PENDING_PAYMENT';
    return {
      label: awaiting ? 'Awaiting payment' : labelFor(step),
      icon: awaiting ? Clock : step.icon,
      time: awaiting ? historyTime(order, 'PENDING_PAYMENT') : historyTime(order, step.status),
      state: awaiting ? 'current' : state,
    };
  });
}

function paymentLabel(order) {
  if (order.paymentStatus === 'REFUNDED') return 'Refunded';
  if (order.orderStatus === 'CANCELLED' && order.paymentMethod === 'ONLINE' && order.paymentStatus === 'PAID') {
    return 'Refund pending';
  }
  if (order.orderStatus === 'CANCELLED' && order.paymentStatus !== 'PAID') return 'No refund';
  if (order.paymentMethod === 'COD') return 'Cash on delivery';
  if (order.paymentStatus === 'PAID') return 'Paid online';
  return 'Payment pending';
}

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);

  const handleTrack = async (event) => {
    event.preventDefault();
    if (!orderId.trim() || !phone.trim()) {
      toast.error('Please enter the order ID and phone number');
      return;
    }
    setBusy(true);
    try {
      const data = await api.trackOrder(orderId.trim(), phone.trim());
      setOrder(data.data);
    } catch (err) {
      setOrder(null);
      toast.error(err.message || 'We could not find that order');
    } finally {
      setBusy(false);
    }
  };

  const steps = order ? timeline(order) : [];

  return (
    <>
      <Helmet>
        <title>Track Order — {brand.name}</title>
        <meta name="description" content={`Track your ${brand.name} order status.`} />
      </Helmet>

      <section className="bg-gradient-to-b from-navy-900 to-navy-800 pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 pattern-mandala opacity-15" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-3xl sm:text-4xl font-bold text-white mb-2"
          >
            Track Your <span className="text-gold-gradient">Order</span>
          </motion.h1>
          <OrnamentalDivider className="my-4" width={160} />
          <p className="text-navy-300 text-sm">
            Enter your order ID and the phone number used for the order.
          </p>
        </div>
      </section>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        <form onSubmit={handleTrack} className="bg-white rounded-2xl shadow-card p-6 border border-cream-100 mb-8">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="GS-20261004-A3F2B1"
                className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="98XXXXXXXX"
                className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busy}
            className="btn-gold-shimmer w-full cursor-pointer flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-xl text-sm disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Search size={16} />
            {busy ? 'Checking…' : 'Track Order'}
          </button>
        </form>

        {order && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card p-6 border border-cream-100"
          >
            <div className="flex items-start justify-between gap-3 mb-6">
              <div>
                <h3 className="font-heading text-lg font-bold text-navy-900">{order.orderNumber}</h3>
                <p className="text-xs text-muted mt-1">
                  {paymentLabel(order)}
                  {order.deliveryType === 'pickup' ? ' · Store pickup' : ' · Home delivery'}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${STATUS_STYLE[order.orderStatus] || 'bg-cream-100 text-navy-900'}`}>
                {STATUS_LABEL[order.orderStatus] || 'In progress'}
              </span>
            </div>

            <div className="relative ml-4">
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-cream-200" />
              {steps.map((step) => (
                <div key={step.label} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                    step.state === 'cancelled' ? 'bg-error text-white' : step.state === 'upcoming' ? 'bg-cream-200 text-muted' : 'bg-success text-white'
                  }`}>
                    <step.icon size={14} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${step.state === 'upcoming' ? 'text-muted' : 'text-navy-900'}`}>
                      {step.label}
                      {step.state === 'current' ? ' · now' : ''}
                    </p>
                    {step.time && <p className="text-xs text-muted mt-0.5">{when(step.time)}</p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </>
  );
}
