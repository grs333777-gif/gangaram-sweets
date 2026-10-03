import { useLocation, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { CheckCircle, Package, ArrowRight } from 'lucide-react';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

export default function OrderSuccessPage() {
  const { state } = useLocation();
  const orderId = state?.orderId || 'GR-DEMO';
  const total = state?.total || 0;

  return (
    <>
      <Helmet>
        <title>Order Confirmed — {brand.name}</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-cream-50 pt-28 pb-20 flex items-center justify-center">
        <div className="max-w-lg mx-auto px-4 text-center">
          {/* Animated checkmark */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', damping: 12, delay: 0.2 }}
            className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center shadow-gold"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.5, type: 'spring', damping: 10 }}
            >
              <CheckCircle size={48} className="text-white" />
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h1 className="font-heading text-3xl font-bold text-navy-900 mb-2">
              Order Confirmed! 🎉
            </h1>
            <p className="text-muted mb-4">
              Thank you for your order. Your delicious sweets are being prepared!
            </p>
            <OrnamentalDivider className="my-4" width={160} />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-white rounded-2xl shadow-card p-6 mb-6 border border-cream-100"
          >
            <div className="flex items-center justify-center gap-2 mb-3">
              <Package size={18} className="text-gold-600" />
              <span className="text-sm font-medium text-muted">Order ID</span>
            </div>
            <p className="text-2xl font-heading font-bold text-navy-900 mb-3">
              {orderId}
            </p>
            {total > 0 && (
              <p className="text-sm text-muted">
                Total: <span className="font-bold text-navy-900">₹{total.toLocaleString('en-IN')}</span>
              </p>
            )}

            {/* Status timeline */}
            <div className="flex items-center justify-center gap-2 mt-4 text-xs">
              {['Placed', 'Confirmed', 'Preparing', 'Delivered'].map((status, i) => (
                <div key={status} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${i <= 1 ? 'bg-success' : 'bg-cream-200'}`} />
                  <span className={i <= 1 ? 'text-success font-medium' : 'text-muted'}>
                    {status}
                  </span>
                  {i < 3 && <div className={`w-6 h-0.5 ${i < 1 ? 'bg-success' : 'bg-cream-200'}`} />}
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="flex flex-col sm:flex-row gap-3 justify-center"
          >
            <Link
              to="/track-order"
              className="btn-gold-shimmer inline-flex items-center justify-center gap-2 text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
            >
              Track Order
              <ArrowRight size={16} />
            </Link>
            <Link
              to="/menu"
              className="inline-flex items-center justify-center gap-2 text-navy-900 font-medium px-6 py-2.5 rounded-xl text-sm border border-cream-200 hover:bg-cream-100 transition-colors"
            >
              Continue Shopping
            </Link>
          </motion.div>
        </div>
      </div>
    </>
  );
}
