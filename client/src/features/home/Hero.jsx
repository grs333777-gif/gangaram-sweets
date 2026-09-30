import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';
import heroPhoto from '../../assets/hero.png';

export default function Hero() {
  return (
    <section className="relative bg-cream-50">
      <div className="relative h-[50vh] min-h-[280px] sm:h-[48vh] lg:h-[52vh] overflow-hidden bg-navy-900">
        <img
          src={heroPhoto}
          alt="Gangaram storefront sign lit at night"
          className="absolute inset-0 h-full w-full object-cover object-center"
          width="1672"
          height="941"
          fetchPriority="high"
        />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-navy-900/80 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-cream-50 to-transparent" />
      </div>

      <div className="relative z-10 -mt-6 px-4 pb-8 text-center sm:px-6 sm:-mt-8 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="font-hindi text-gold-600 text-lg sm:text-xl mb-1"
        >
          {brand.taglineHindi}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.55 }}
          className="font-heading text-4xl sm:text-5xl md:text-6xl font-bold text-navy-900 leading-tight"
        >
          <span className="text-gold-gradient">{brand.tagline}</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <OrnamentalDivider className="my-4" width={220} />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
          className="text-muted text-base sm:text-lg max-w-2xl mx-auto mb-6 leading-relaxed"
        >
          Indore&apos;s heritage of{' '}
          <span className="text-gold-600 font-medium">pure desi ghee</span>{' '}
          sweets &amp; namkeen, handcrafted with love since {brand.yearFounded}.
          Every bite tells a story of tradition and purity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
        >
          <Link
            to="/menu"
            className="btn-gold-shimmer inline-flex items-center gap-2 text-navy-900 font-semibold px-8 py-3.5 rounded-2xl text-base shadow-gold hover:shadow-lg transition-shadow duration-300"
          >
            <ShoppingBag size={20} />
            Order Now
          </Link>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 text-navy-900 font-medium px-8 py-3.5 rounded-2xl text-base border border-navy-900/15 bg-white hover:border-gold-400 hover:text-gold-700 transition-all duration-300"
          >
            Explore Menu
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
