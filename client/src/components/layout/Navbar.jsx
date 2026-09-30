import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, ShoppingBag, Phone } from 'lucide-react';
import brand from '../../config/brand.config';
import useCartStore from '../../store/cartStore';

const navLinks = [
  { name: 'Home', path: '/' },
  { name: 'Menu', path: '/menu' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact', path: '/contact' },
  { name: 'Track Order', path: '/track-order' },
];

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { items, openCart } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 48);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 border-b border-cream-200/80 bg-[#FBF8F4]/95 backdrop-blur-md transition-shadow duration-300 ${
          isScrolled ? 'shadow-nav' : ''
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link to="/" className="block" aria-label={`${brand.name} Home`}>
              <h1 className="font-heading text-2xl leading-none text-navy-900 sm:text-[1.7rem]">
                {brand.shortName}
              </h1>
              <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.28em] text-gold-600">
                {brand.tagline}
              </p>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative px-3 py-5 text-[13px] tracking-wide transition-colors duration-200 ${
                    location.pathname === link.path
                      ? 'text-navy-900'
                      : 'text-muted hover:text-navy-900'
                  }`}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-3 right-3 h-px bg-navy-900"
                    />
                  )}
                </Link>
              ))}
            </div>

            {/* Right actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Phone CTA – desktop only */}
              <a
                href={`tel:${brand.phone}`}
                className="hidden items-center gap-2 text-sm text-muted transition-colors hover:text-navy-900 xl:flex"
              >
                <Phone size={16} />
                <span>{brand.phone}</span>
              </a>

              {/* Cart button */}
              <button
                onClick={openCart}
                className="relative p-2 text-navy-900 transition-colors hover:text-gold-700"
                aria-label={`Cart with ${totalItems} items`}
              >
                <ShoppingBag size={20} />
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 bg-magenta-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center animate-cart-bounce"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </button>

              {/* Mobile menu toggle */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 text-navy-900 transition-colors hover:text-gold-700 lg:hidden"
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-72 bg-white z-50 lg:hidden shadow-drawer"
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <p className="font-heading text-lg font-bold text-navy-900">
                      {brand.name}
                    </p>
                    <p className="text-xs text-gold-600 tracking-widest">{brand.tagline}</p>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="p-2 rounded-lg hover:bg-cream-100 transition-colors"
                    aria-label="Close menu"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-1">
                  {navLinks.map((link, i) => (
                    <motion.div
                      key={link.path}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                    >
                      <Link
                        to={link.path}
                        className={`block px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                          location.pathname === link.path
                            ? 'bg-navy-900 text-white'
                            : 'text-ink hover:bg-cream-100'
                        }`}
                      >
                        {link.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>

                {/* Quick contact */}
                <div className="mt-8 pt-6 border-t border-cream-200">
                  <a
                    href={`tel:${brand.phone}`}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl bg-cream-50 text-navy-900 text-sm font-medium hover:bg-cream-100 transition-colors"
                  >
                    <Phone size={18} className="text-gold-600" />
                    Call Us: {brand.phone}
                  </a>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
