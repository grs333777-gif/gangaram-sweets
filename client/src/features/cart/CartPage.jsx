import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, ArrowLeft } from 'lucide-react';
import useCartStore from '../../store/cartStore';
import brand from '../../config/brand.config';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = totalPrice >= brand.freeDeliveryAbove ? 0 : brand.deliveryFee;

  return (
    <>
      <Helmet>
        <title>Cart — {brand.name}</title>
      </Helmet>

      <div className="bg-cream-50 min-h-screen pt-24 pb-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="font-heading text-2xl sm:text-3xl font-bold text-navy-900 mb-6">
            Your Cart
          </h1>

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-20"
            >
              <div className="w-28 h-28 mx-auto rounded-full bg-cream-100 flex items-center justify-center mb-6">
                <ShoppingBag size={48} className="text-navy-300" />
              </div>
              <h2 className="font-heading text-xl font-semibold text-navy-900 mb-2">
                Your cart is empty
              </h2>
              <p className="text-muted mb-6">
                Looks like you haven&apos;t added any sweets yet!
              </p>
              <Link
                to="/menu"
                className="btn-gold-shimmer inline-flex items-center gap-2 text-white font-semibold px-8 py-3 rounded-xl"
              >
                <ArrowLeft size={18} />
                Explore Menu
              </Link>
            </motion.div>
          ) : (
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Items */}
              <div className="lg:col-span-2 space-y-4">
                {items.map((item) => (
                  <motion.div
                    key={`${item.productId}-${item.weight}`}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl p-4 shadow-card flex gap-4"
                  >
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-24 h-24 rounded-xl object-cover shrink-0"
                      loading="lazy"
                      width="96"
                      height="96"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-heading text-base font-bold text-navy-900">
                            {item.name}
                          </h3>
                          <p className="text-sm text-muted">{item.weight}</p>
                          <p className="text-sm text-navy-700 font-medium mt-1">
                            ₹{item.price} each
                          </p>
                        </div>
                        <button
                          onClick={() => removeFromCart(item.productId, item.weight)}
                          className="p-2 rounded-lg text-muted hover:text-error hover:bg-red-50 transition-colors"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1 bg-cream-50 rounded-xl border border-cream-200 p-0.5">
                          <button
                            onClick={() => updateQuantity(item.productId, item.weight, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white disabled:opacity-40 transition-colors"
                            aria-label="Decrease"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="w-8 text-center font-semibold text-sm">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.productId, item.weight, item.quantity + 1)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white transition-colors"
                            aria-label="Increase"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <p className="text-lg font-bold text-navy-900">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))}

                <button onClick={clearCart} className="text-sm text-muted hover:text-error transition-colors underline underline-offset-2">
                  Clear all items
                </button>
              </div>

              {/* Summary */}
              <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl shadow-card p-5 sticky top-24">
                  <h3 className="font-heading text-lg font-bold text-navy-900 mb-4">
                    Order Summary
                  </h3>
                  <div className="space-y-2 text-sm border-b border-cream-200 pb-3 mb-3">
                    <div className="flex justify-between text-muted">
                      <span>Subtotal ({items.reduce((s, i) => s + i.quantity, 0)} items)</span>
                      <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-muted">
                      <span>Delivery</span>
                      <span>{deliveryFee === 0 ? <span className="text-success font-medium">FREE</span> : `₹${deliveryFee}`}</span>
                    </div>
                    {deliveryFee > 0 && (
                      <p className="text-xs text-gold-600">
                        Add ₹{brand.freeDeliveryAbove - totalPrice} more for free delivery
                      </p>
                    )}
                  </div>
                  <div className="flex justify-between font-bold text-lg text-navy-900 mb-4">
                    <span>Total</span>
                    <span>₹{(totalPrice + deliveryFee).toLocaleString('en-IN')}</span>
                  </div>
                  <Link
                    to="/checkout"
                    className="btn-gold-shimmer w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl"
                  >
                    Proceed to Checkout
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    to="/menu"
                    className="block text-center text-sm text-muted hover:text-navy-900 mt-3 transition-colors"
                  >
                    ← Continue Shopping
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
