import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ShoppingBag, Phone } from 'lucide-react';
import brand from '../../config/brand.config';

export default function CTABand() {
  return (
    <section className="py-16 sm:py-20 bg-gradient-to-r from-navy-900 via-navy-700 to-navy-900 relative overflow-hidden">
      <div className="absolute inset-0 pattern-mandala opacity-10" />

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4 leading-tight">
            Ready to Experience the{' '}
            <span className="text-gold-gradient">Taste of Purity?</span>
          </h2>
          <p className="text-navy-300 text-base sm:text-lg max-w-2xl mx-auto mb-8">
            Order your favorite sweets online and get them delivered fresh to your doorstep.
            Pure desi ghee, heritage recipes, and love in every bite.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/menu"
              className="btn-gold-shimmer inline-flex items-center gap-2 text-white font-semibold px-8 py-3.5 rounded-2xl text-base shadow-gold"
            >
              <ShoppingBag size={20} />
              Order Now
            </Link>
            <a
              href={`tel:${brand.phone}`}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white font-medium px-8 py-3.5 rounded-2xl text-base border border-white/20 hover:border-white/40 transition-all"
            >
              <Phone size={18} />
              Call to Order
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
