import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import brand from '../../config/brand.config';
import heroSign from '../../assets/hero-sign.jpg';

const rise = (delay) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] },
});

export default function Hero() {
  return (
    <section className="bg-[#F6EFE6]">
      <div className="mx-auto grid max-w-[1440px] items-center lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
        <div className="px-6 pb-12 pt-28 sm:px-10 sm:pt-32 lg:py-24 lg:pl-16 lg:pr-10 xl:pl-24">
          <motion.p
            {...rise(0.05)}
            className="mb-6 text-[11px] font-medium uppercase tracking-[0.34em] text-gold-600"
          >
            {brand.city} · Since {brand.yearFounded}
          </motion.p>

          <motion.p
            {...rise(0.12)}
            className="font-hindi mb-4 text-lg text-navy-800"
          >
            {brand.taglineHindi}
          </motion.p>

          <motion.h2
            {...rise(0.18)}
            className="font-heading text-[3.4rem] leading-[0.92] text-navy-900 sm:text-7xl lg:text-[5.25rem]"
          >
            Taste of
            <span className="block italic font-normal">Purity</span>
          </motion.h2>

          <motion.p
            {...rise(0.28)}
            className="mt-6 max-w-sm text-[15px] font-light leading-relaxed text-muted sm:text-base"
          >
            Pure desi ghee sweets and namkeen, prepared the way Indore has known them for generations.
          </motion.p>

          <motion.div
            {...rise(0.38)}
            className="mt-9 flex flex-wrap items-center gap-7"
          >
            <Link
              to="/menu"
              className="btn-gold-shimmer inline-flex items-center px-7 py-3.5 text-[11px]"
            >
              Order Now
            </Link>
            <Link
              to="/menu"
              className="text-[11px] font-medium uppercase tracking-[0.2em] text-navy-900 underline decoration-gold-500 underline-offset-[10px] transition-colors hover:text-gold-700"
            >
              View the menu
            </Link>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="relative min-h-[320px] sm:min-h-[420px] lg:min-h-[640px] lg:self-stretch"
        >
          <img
            src={heroSign}
            alt="Gangaram storefront sign"
            className="absolute inset-0 h-full w-full object-cover object-[72%_center]"
            width="1152"
            height="864"
            fetchPriority="high"
          />
        </motion.div>
      </div>
    </section>
  );
}
