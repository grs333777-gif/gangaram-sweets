import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, UtensilsCrossed, ShoppingBag, User, Search } from 'lucide-react';
import useCartStore from '../../store/cartStore';

const tabs = [
  { name: 'Home', path: '/', icon: Home },
  { name: 'Menu', path: '/menu', icon: UtensilsCrossed },
  { name: 'Cart', path: null, icon: ShoppingBag, isCart: true },
  { name: 'Track', path: '/track-order', icon: Search },
];

export default function MobileBar() {
  const location = useLocation();
  const { items, openCart } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white/95 backdrop-blur-md border-t border-cream-200 safe-area-bottom">
      <div className="flex items-center justify-around px-2 py-1.5">
        {tabs.map((tab) => {
          const isActive = tab.path && location.pathname === tab.path;

          if (tab.isCart) {
            return (
              <button
                key={tab.name}
                onClick={openCart}
                className="flex flex-col items-center gap-0.5 px-3 py-1.5 relative"
                aria-label={`Cart with ${totalItems} items`}
              >
                <div className="relative">
                  <ShoppingBag
                    size={22}
                    className="text-muted"
                  />
                  {totalItems > 0 && (
                    <motion.span
                      key={totalItems}
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -top-1.5 -right-2 bg-magenta-500 text-white text-[10px] font-bold w-4.5 h-4.5 rounded-full flex items-center justify-center min-w-[18px] min-h-[18px]"
                    >
                      {totalItems}
                    </motion.span>
                  )}
                </div>
                <span className="text-[10px] font-medium text-muted">
                  {tab.name}
                </span>
              </button>
            );
          }

          return (
            <Link
              key={tab.name}
              to={tab.path}
              className="flex flex-col items-center gap-0.5 px-3 py-1.5 relative"
            >
              <tab.icon
                size={22}
                className={isActive ? 'text-navy-900' : 'text-muted'}
              />
              <span
                className={`text-[10px] font-medium ${
                  isActive ? 'text-navy-900' : 'text-muted'
                }`}
              >
                {tab.name}
              </span>
              {isActive && (
                <motion.div
                  layoutId="mobile-tab"
                  className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-gold-500 rounded-full"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
