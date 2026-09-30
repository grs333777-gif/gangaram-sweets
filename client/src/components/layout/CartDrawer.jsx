import { motion, AnimatePresence } from 'framer-motion';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import useCartStore from '../../store/cartStore';
import brand from '../../config/brand.config';

export default function CartDrawer() {
  const { items, isCartOpen, closeCart, removeFromCart, updateQuantity, clearCart } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = totalPrice >= brand.freeDeliveryAbove ? 0 : brand.deliveryFee;

  return (
    <AnimatePresence>
      {isCartOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={closeCart}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col shadow-drawer"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-cream-200">
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-navy-900" />
                <h2 className="font-heading text-lg font-bold text-navy-900">
                  Your Cart
                </h2>
                {totalItems > 0 && (
                  <span className="bg-navy-900 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                    {totalItems}
                  </span>
                )}
              </div>
              <button
                onClick={closeCart}
                className="p-2 rounded-lg hover:bg-cream-100 transition-colors"
                aria-label="Close cart"
              >
                <X size={20} />
              </button>
            </div>

            {/* Cart Items */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <div className="w-24 h-24 rounded-full bg-cream-100 flex items-center justify-center mb-4">
                    <ShoppingBag size={40} className="text-navy-300" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-navy-900 mb-2">
                    Your cart is empty
                  </h3>
                  <p className="text-muted text-sm mb-6">
                    Add some delicious sweets to get started!
                  </p>
                  <Link
                    to="/menu"
                    onClick={closeCart}
                    className="btn-gold-shimmer text-white font-semibold px-6 py-2.5 rounded-xl text-sm"
                  >
                    Explore Menu
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {items.map((item) => (
                    <motion.div
                      key={`${item.productId}-${item.weight}`}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex gap-3 p-3 bg-cream-50 rounded-2xl"
                    >
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-20 h-20 rounded-xl object-cover"
                        loading="lazy"
                        width="80"
                        height="80"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h4 className="text-sm font-semibold text-navy-900 truncate">
                              {item.name}
                            </h4>
                            <p className="text-xs text-muted mt-0.5">{item.weight}</p>
                          </div>
                          <button
                            onClick={() => removeFromCart(item.productId, item.weight)}
                            className="p-1.5 rounded-lg text-muted hover:text-error hover:bg-red-50 transition-colors"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          {/* Quantity stepper */}
                          <div className="flex items-center gap-1 bg-white rounded-lg border border-cream-200">
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.weight,
                                  item.quantity - 1
                                )
                              }
                              disabled={item.quantity <= 1}
                              className="p-1.5 text-muted hover:text-navy-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={14} />
                            </button>
                            <span className="text-sm font-semibold text-navy-900 w-6 text-center">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.productId,
                                  item.weight,
                                  item.quantity + 1
                                )
                              }
                              className="p-1.5 text-muted hover:text-navy-900 transition-colors"
                              aria-label="Increase quantity"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                          <p className="text-sm font-bold text-navy-900">
                            ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Clear cart */}
                  <button
                    onClick={clearCart}
                    className="text-xs text-muted hover:text-error transition-colors underline underline-offset-2"
                  >
                    Clear all items
                  </button>
                </div>
              )}
            </div>

            {/* Footer – Price summary & CTA */}
            {items.length > 0 && (
              <div className="border-t border-cream-200 px-5 py-4 space-y-3">
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-muted">
                    <span>Subtotal</span>
                    <span>₹{totalPrice.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between text-muted">
                    <span>Delivery</span>
                    <span>
                      {deliveryFee === 0 ? (
                        <span className="text-success font-medium">FREE</span>
                      ) : (
                        `₹${deliveryFee}`
                      )}
                    </span>
                  </div>
                  {deliveryFee > 0 && (
                    <p className="text-xs text-gold-600">
                      Add ₹{brand.freeDeliveryAbove - totalPrice} more for free delivery
                    </p>
                  )}
                  <div className="flex justify-between text-navy-900 font-bold text-base pt-2 border-t border-cream-200">
                    <span>Total</span>
                    <span>₹{(totalPrice + deliveryFee).toLocaleString('en-IN')}</span>
                  </div>
                </div>

                <Link
                  to="/checkout"
                  onClick={closeCart}
                  className="btn-gold-shimmer w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl text-sm"
                >
                  Proceed to Checkout
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
