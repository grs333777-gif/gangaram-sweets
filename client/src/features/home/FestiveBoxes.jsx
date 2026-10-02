import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function FestiveBoxes() {
  return (
    <section className="bg-white py-16 sm:py-24">
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-10 items-center">
          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.32em] text-gold-600">
              Gifting
            </p>
            <h2 className="font-heading mb-4 text-4xl leading-tight text-navy-900 sm:text-5xl">
              Festive <span className="italic">Gift Boxes</span>
            </h2>
            <p className="mb-6 text-base leading-relaxed text-muted sm:text-lg">
              Make every celebration sweeter with our exquisitely curated gift hampers.
              Premium sweets in designer boxes — perfect for Diwali, weddings, corporate gifting, and every special moment.
            </p>
            <div className="flex flex-wrap gap-3 mb-8">
              {['Diwali Hampers', 'Wedding Trays', 'Corporate Gifts', 'Custom Boxes'].map((tag) => (
                <span
                  key={tag}
                  className="border border-cream-200 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
            <Link
              to="/menu?category=sweets-dessert"
              className="btn-gold-shimmer inline-flex items-center gap-2 text-white font-semibold px-8 py-3 rounded-2xl text-sm shadow-gold"
            >
              View Gift Collections
              <ArrowRight size={16} />
            </Link>
          </motion.div>

          {/* Image collage */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="rounded-2xl overflow-hidden border-2 border-gold-400/20 shadow-gold">
                  <img
                    src="/images/sweets.jpg"
                    alt="Diwali Sweet Box"
                    className="w-full h-48 object-cover"
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="192"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden border-2 border-gold-400/20">
                  <img
                    src="/images/kaju-katli.jpg"
                    alt="Premium Sweets"
                    className="w-full h-32 object-cover"
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="128"
                  />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="rounded-2xl overflow-hidden border-2 border-gold-400/20">
                  <img
                    src="/images/laddu.jpg"
                    alt="Laddu Box"
                    className="w-full h-32 object-cover"
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="128"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden border-2 border-gold-400/20 shadow-gold">
                  <img
                    src="/images/gulab-jamun.jpg"
                    alt="Gulab Jamun Gift Pack"
                    className="w-full h-48 object-cover"
                    loading="lazy"
                    decoding="async"
                    width="400"
                    height="192"
                  />
                </div>
              </div>
            </div>
            {/* Floating badge */}
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-gold-600 text-white text-sm font-bold px-6 py-2 rounded-full shadow-gold"
            >
              Starting at ₹600
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
