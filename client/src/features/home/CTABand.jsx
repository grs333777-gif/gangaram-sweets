import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import brand from '../../config/brand.config';

export default function CTABand() {
  return (
    <section className="bg-cream-50 py-20 sm:py-28">
      <div className="relative max-w-3xl mx-auto px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="font-heading mb-4 text-4xl leading-tight text-navy-900 sm:text-5xl lg:text-6xl">
            Ready for the <span className="italic">taste of purity?</span>
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-base font-light text-muted sm:text-lg">
            Order your favorite sweets online and get them delivered fresh to your doorstep.
            Pure desi ghee, heritage recipes, and love in every bite.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/menu"
              className="btn-gold-shimmer inline-flex items-center px-8 py-3.5 text-xs"
            >
              Order Now
            </Link>
            <a
              href={`tel:${brand.phone}`}
              className="text-xs font-medium uppercase tracking-[0.18em] text-navy-900 underline decoration-gold-400 underline-offset-8"
            >
              Call {brand.phone}
            </a>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
