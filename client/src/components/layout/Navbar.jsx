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

const darkHeroPaths = new Set([
  '/',
  '/menu',
  '/about',
  '/contact',
  '/track-order',
  '/terms',
  '/privacy',
  '/refund-shipping',
]);

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const { items, openCart } = useCartStore();
  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const onDarkHero = darkHeroPaths.has(location.pathname) && !isScrolled;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          onDarkHero
            ? 'bg-navy-900/95 py-3 shadow-nav backdrop-blur-md'
            : 'bg-white/95 py-2 shadow-nav backdrop-blur-md'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group" aria-label={`${brand.name} Home`}>
              <img
                src="/logo.jpeg"
                alt={`${brand.name} Logo`}
                className="h-12 w-12 rounded-full border-2 border-gold-400 object-cover shadow-md transition-shadow duration-300 group-hover:shadow-gold sm:h-14 sm:w-14"
                width="56"
                height="56"
              />
              <div className="hidden sm:block">
                <h1 className={`font-heading text-lg font-bold leading-tight ${onDarkHero ? 'text-white' : 'text-navy-900'}`}>
                  {brand.name}
                </h1>
                <p className={`text-xs font-medium uppercase tracking-[0.2em] ${onDarkHero ? 'text-gold-300' : 'text-gold-600'}`}>
                  {brand.tagline}
                </p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`relative rounded-lg px-4 py-2 text-sm font-medium transition-colors duration-200 ${
                    location.pathname === link.path
                      ? onDarkHero ? 'text-white' : 'text-navy-900'
                      : onDarkHero ? 'text-white/80 hover:text-white' : 'text-muted hover:text-navy-900'
                  }`}
                >
                  {link.name}
                  {location.pathname === link.path && (
                    <motion.div
                      layoutId="nav-underline"
                      className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600"
                    />
                  )}
                </Link>
              ))}
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <a
                href={`tel:${brand.phone}`}
                className={`hidden items-center gap-2 text-sm transition-colors xl:flex ${
                  onDarkHero ? 'text-white/90 hover:text-white' : 'text-navy-700 hover:text-navy-900'
                }`}
              >
                <Phone size={16} />
                <span>{brand.phone}</span>
              </a>

              <button
                onClick={openCart}
                className={`relative rounded-xl p-2.5 transition-colors duration-200 ${
                  onDarkHero
                    ? 'bg-white text-navy-900 hover:bg-gold-200'
                    : 'bg-navy-900 text-white hover:bg-navy-700'
                }`}
                aria-label={`Cart with ${totalItems} items`}
              >
                <ShoppingBag size={20} />
                {totalItems > 0 && (
                  <motion.span
                    key={totalItems}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-magenta-500 text-xs font-bold text-white animate-cart-bounce"
                  >
                    {totalItems}
                  </motion.span>
                )}
              </button>

              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`rounded-xl p-2.5 transition-colors lg:hidden ${
                  onDarkHero ? 'text-white hover:bg-white/10' : 'text-navy-900 hover:bg-cream-100'
                }`}
                aria-label="Toggle menu"
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </div>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/40 lg:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 z-50 w-72 bg-white shadow-drawer lg:hidden"
            >
              <div className="p-6">
                <div className="mb-8 flex items-center justify-between">
                  <div>
                    <p className="font-heading text-lg font-bold text-navy-900">
                      {brand.name}
                    </p>
                    <p className="text-xs tracking-widest text-gold-600">{brand.tagline}</p>
                  </div>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="rounded-lg p-2 transition-colors hover:bg-cream-100"
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
                        className={`block rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
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

                <div className="mt-8 border-t border-cream-200 pt-6">
                  <a
                    href={`tel:${brand.phone}`}
                    className="flex items-center gap-3 rounded-xl bg-cream-50 px-4 py-3 text-sm font-medium text-navy-900 transition-colors hover:bg-cream-100"
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
