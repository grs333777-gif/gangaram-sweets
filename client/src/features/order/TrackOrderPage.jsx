import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Search, Package, CheckCircle, Clock, Truck, ChefHat } from 'lucide-react';
import toast from 'react-hot-toast';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

const demoStatuses = [
  { status: 'Placed', icon: Package, time: '2:30 PM', done: true },
  { status: 'Confirmed', icon: CheckCircle, time: '2:32 PM', done: true },
  { status: 'Preparing', icon: ChefHat, time: '2:45 PM', done: true },
  { status: 'Out for Delivery', icon: Truck, time: '', done: false },
  { status: 'Delivered', icon: CheckCircle, time: '', done: false },
];

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [tracked, setTracked] = useState(false);

  const handleTrack = (e) => {
    e.preventDefault();
    if (!orderId || !phone) {
      toast.error('Please enter Order ID and Phone number');
      return;
    }
    setTracked(true);
    toast.success('Order found!');
  };

  return (
    <>
      <Helmet>
        <title>Track Order — {brand.name}</title>
        <meta name="description" content={`Track your ${brand.name} order status in real-time.`} />
      </Helmet>

      {/* Header */}
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
            Enter your Order ID and phone number to see the latest status.
          </p>
        </div>
      </section>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
        {/* Search form */}
        <form onSubmit={handleTrack} className="bg-white rounded-2xl shadow-card p-6 border border-cream-100 mb-8">
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1">Order ID</label>
              <input
                type="text"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="GR-XXXXX"
                className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98XXXXXXXX"
                className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
              />
            </div>
          </div>
          <button
            type="submit"
            className="btn-gold-shimmer w-full flex items-center justify-center gap-2 text-white font-semibold py-2.5 rounded-xl text-sm"
          >
            <Search size={16} />
            Track Order
          </button>
        </form>

        {/* Status Timeline */}
        {tracked && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-card p-6 border border-cream-100"
          >
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="font-heading text-lg font-bold text-navy-900">
                  Order #{orderId}
                </h3>
                <p className="text-xs text-muted">Payment: Paid (Demo)</p>
              </div>
              <span className="bg-gold-100 text-gold-700 text-xs font-bold px-3 py-1 rounded-lg">
                Preparing
              </span>
            </div>

            <div className="relative ml-4">
              {/* Vertical line */}
              <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-cream-200" />

              {demoStatuses.map((step, i) => (
                <div key={step.status} className="relative flex gap-4 pb-6 last:pb-0">
                  <div className={`relative z-10 w-6 h-6 rounded-full flex items-center justify-center ${
                    step.done ? 'bg-success text-white' : 'bg-cream-200 text-muted'
                  }`}>
                    <step.icon size={14} />
                  </div>
                  <div>
                    <p className={`text-sm font-medium ${step.done ? 'text-navy-900' : 'text-muted'}`}>
                      {step.status}
                    </p>
                    {step.time && (
                      <p className="text-xs text-muted mt-0.5">Today, {step.time}</p>
                    )}
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
