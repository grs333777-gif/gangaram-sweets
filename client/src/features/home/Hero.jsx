import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import brand from '../../config/brand.config';
import heroPhoto from '../../assets/hero.png';

function HeroFlourish() {
  return (
    <div className="my-4 flex items-center justify-center" aria-hidden="true">
      <svg width="220" height="55" viewBox="0 0 200 50" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M100 42 L108 34 L100 26 L92 34 Z" fill="url(#heroGold)" />
        <path d="M92 34 Q70 34 60 24 Q50 14 30 18 Q20 20 18 28" stroke="url(#heroGold)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M18 28 Q16 34 22 36 Q28 38 30 32" stroke="url(#heroGold)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M30 18 Q20 8 8 14" stroke="url(#heroGold)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M108 34 Q130 34 140 24 Q150 14 170 18 Q180 20 182 28" stroke="url(#heroGold)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M182 28 Q184 34 178 36 Q172 38 170 32" stroke="url(#heroGold)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        <path d="M170 18 Q180 8 192 14" stroke="url(#heroGold)" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M85 26 Q100 8 115 26" stroke="url(#heroGold)" strokeWidth="1.2" fill="none" strokeLinecap="round" />
        <circle cx="100" cy="14" r="2" fill="url(#heroGold)" />
        <line x1="5" y1="34" x2="88" y2="34" stroke="url(#heroGold)" strokeWidth="0.5" opacity="0.5" />
        <line x1="112" y1="34" x2="195" y2="34" stroke="url(#heroGold)" strokeWidth="0.5" opacity="0.5" />
        <defs>
          <linearGradient id="heroGold" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A67C4A" />
            <stop offset="50%" stopColor="#E9C27F" />
            <stop offset="100%" stopColor="#A67C4A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}

export default function Hero() {
  return (
    <section className="relative bg-cream-50">
      <div className="relative h-[50vh] min-h-[280px] overflow-hidden bg-navy-900 sm:h-[48vh] lg:h-[52vh]">
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

      <div className="relative z-10 -mt-6 px-4 pb-8 text-center sm:-mt-8 sm:px-6 lg:px-8">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
          className="font-hindi mb-1 text-lg text-gold-600 sm:text-xl"
        >
          {brand.taglineHindi}
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.55 }}
          className="font-heading text-4xl font-bold leading-tight text-navy-900 sm:text-5xl md:text-6xl"
        >
          <span className="text-gold-gradient">{brand.tagline}</span>
        </motion.h2>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          <HeroFlourish />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.45 }}
          className="mx-auto mb-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg"
        >
          {brand.city}&apos;s heritage of{' '}
          <span className="font-medium text-gold-600">pure desi ghee</span>{' '}
          sweets &amp; namkeen, handcrafted with love since {brand.yearFounded}.
          Every bite tells a story of tradition and purity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.45 }}
          className="flex flex-col items-center justify-center gap-4 sm:flex-row"
        >
          <Link
            to="/menu"
            className="btn-gold-shimmer inline-flex items-center gap-2 rounded-2xl px-8 py-3.5 text-base font-semibold text-navy-900 shadow-gold transition-shadow duration-300 hover:shadow-lg"
          >
            <ShoppingBag size={20} />
            Order Now
          </Link>
          <Link
            to="/menu"
            className="inline-flex items-center gap-2 rounded-2xl border border-navy-900/15 bg-white px-8 py-3.5 text-base font-medium text-navy-900 transition-all duration-300 hover:border-gold-400 hover:text-gold-700"
          >
            Explore Menu
            <ArrowRight size={18} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
