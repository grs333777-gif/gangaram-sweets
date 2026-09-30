import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { MapPin, CreditCard, Truck, Store } from 'lucide-react';
import toast from 'react-hot-toast';
import useCartStore from '../../store/cartStore';
import brand from '../../config/brand.config';

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, clearCart } = useCartStore();
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = totalPrice >= brand.freeDeliveryAbove ? 0 : brand.deliveryFee;

  const [form, setForm] = useState({
    name: '',
    phone: '',
    address: '',
    pincode: '',
    landmark: '',
    deliveryType: 'delivery',
    timeSlot: 'anytime',
    giftMessage: '',
  });
  const [loading, setLoading] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error('Please fill in required fields');
      return;
    }
    if (form.deliveryType === 'delivery' && !form.address) {
      toast.error('Please enter delivery address');
      return;
    }
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setLoading(true);
    // Simulate Razorpay flow for demo
    await new Promise((r) => setTimeout(r, 1500));

    const orderId = 'GR' + Date.now().toString(36).toUpperCase();
    clearCart();
    navigate('/order-success', {
      state: {
        orderId,
        total: totalPrice + deliveryFee,
        items: items.length,
      },
    });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen pt-28 pb-20 flex items-center justify-center">
        <div className="text-center">
          <p className="text-6xl mb-4">🛒</p>
          <h2 className="font-heading text-xl font-bold text-navy-900 mb-2">Cart is empty</h2>
          <p className="text-muted mb-4">Add items to proceed with checkout.</p>
          <a href="/menu" className="btn-gold-shimmer text-white px-6 py-2.5 rounded-xl text-sm font-semibold">
            Browse Menu
          </a>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Checkout — {brand.name}</title>
      </Helmet>

      <div className="bg-cream-50 min-h-screen pt-24 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy-900 mb-6">
            Checkout
          </h1>

          <form onSubmit={handlePlaceOrder}>
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Delivery Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Delivery / Pickup toggle */}
                <div className="bg-white rounded-2xl shadow-card p-5 border border-cream-100">
                  <h2 className="font-heading text-base font-bold text-navy-900 mb-3 flex items-center gap-2">
                    <Truck size={18} className="text-gold-600" />
                    Delivery Method
                  </h2>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, deliveryType: 'delivery' })}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        form.deliveryType === 'delivery'
                          ? 'border-navy-900 bg-navy-900 text-white'
                          : 'border-cream-200 text-muted hover:border-navy-300'
                      }`}
                    >
                      <Truck size={16} />
                      Home Delivery
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, deliveryType: 'pickup' })}
                      className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        form.deliveryType === 'pickup'
                          ? 'border-navy-900 bg-navy-900 text-white'
                          : 'border-cream-200 text-muted hover:border-navy-300'
                      }`}
                    >
                      <Store size={16} />
                      Store Pickup
                    </button>
                  </div>
                </div>

                {/* Contact Info */}
                <div className="bg-white rounded-2xl shadow-card p-5 border border-cream-100">
                  <h2 className="font-heading text-base font-bold text-navy-900 mb-3 flex items-center gap-2">
                    <MapPin size={18} className="text-gold-600" />
                    {form.deliveryType === 'delivery' ? 'Delivery Details' : 'Your Details'}
                  </h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-1">
                        Full Name <span className="text-error">*</span>
                      </label>
                      <input type="text" value={form.name} onChange={update('name')} required
                        className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                        placeholder="Your full name" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-1">
                        Phone <span className="text-error">*</span>
                      </label>
                      <input type="tel" value={form.phone} onChange={update('phone')} required
                        className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                        placeholder="+91 98XXXXXXXX" />
                    </div>
                    {form.deliveryType === 'delivery' && (
                      <>
                        <div className="sm:col-span-2">
                          <label className="block text-sm font-medium text-navy-900 mb-1">
                            Delivery Address <span className="text-error">*</span>
                          </label>
                          <textarea rows="2" value={form.address} onChange={update('address')} required
                            className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 resize-none"
                            placeholder="House/flat no., street, area..." />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-navy-900 mb-1">Pincode</label>
                          <input type="text" value={form.pincode} onChange={update('pincode')}
                            className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                            placeholder="452001" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-navy-900 mb-1">Landmark</label>
                          <input type="text" value={form.landmark} onChange={update('landmark')}
                            className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                            placeholder="Near..." />
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-1">Preferred Time Slot</label>
                      <select value={form.timeSlot} onChange={update('timeSlot')}
                        className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 bg-white">
                        <option value="anytime">Anytime</option>
                        <option value="morning">Morning (9 AM - 12 PM)</option>
                        <option value="afternoon">Afternoon (12 PM - 4 PM)</option>
                        <option value="evening">Evening (4 PM - 8 PM)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-navy-900 mb-1">Gift Message (optional)</label>
                      <input type="text" value={form.giftMessage} onChange={update('giftMessage')}
                        className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400"
                        placeholder="With love from..." />
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-card p-5 sticky top-24 border border-cream-100">
                  <h3 className="font-heading text-base font-bold text-navy-900 mb-3 flex items-center gap-2">
                    <CreditCard size={18} className="text-gold-600" />
                    Order Summary
                  </h3>

                  <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                    {items.map((item) => (
                      <div key={`${item.productId}-${item.weight}`} className="flex justify-between text-sm">
                        <span className="text-muted truncate mr-2">
                          {item.name} ({item.weight}) × {item.quantity}
                        </span>
                        <span className="font-medium text-navy-900 shrink-0">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1.5 text-sm border-t border-cream-200 pt-3 mb-3">
                    <div className="flex justify-between text-muted">
                      <span>Subtotal</span>
                      <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Delivery</span>
                      <span>{deliveryFee === 0 ? <span className="text-success">FREE</span> : `₹${deliveryFee}`}</span>
                    </div>
                  </div>

                  <div className="flex justify-between font-bold text-lg text-navy-900 border-t border-cream-200 pt-3 mb-4">
                    <span>Total</span>
                    <span>₹{(totalPrice + deliveryFee).toLocaleString('en-IN')}</span>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-gold-shimmer w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
                  >
                    {loading ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <CreditCard size={18} />
                        Pay ₹{(totalPrice + deliveryFee).toLocaleString('en-IN')}
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-muted text-center mt-2">
                    Secure payment via Razorpay (Demo mode)
                  </p>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
