import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import brand from '../../config/brand.config';

export default function OurStoryTeaser() {
  return (
    <section className="py-16 sm:py-20 bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden border-4 border-gold-400/30 shadow-gold">
              <img
                src="https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80"
                alt="Our traditional kitchen"
                className="w-full h-72 sm:h-96 object-cover"
                loading="lazy"
                decoding="async"
                width="600"
                height="384"
              />
            </div>
            {/* Floating year badge */}
            <motion.div
              initial={{ scale: 0 }}
              whileInView={{ scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4, type: 'spring' }}
              className="absolute -bottom-6 right-3 bg-navy-900 text-white px-6 py-4 rounded-2xl shadow-lg sm:right-6"
            >
              <p className="text-3xl font-heading font-bold text-gold-400">
                {brand.yearsOfTrust}+
              </p>
              <p className="text-xs text-navy-300">Years of Trust</p>
            </motion.div>
          </motion.div>

          {/* Text */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <p className="text-gold-600 text-sm font-medium tracking-[0.2em] uppercase mb-2">
              Our Heritage
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900 mb-4 leading-tight">
              A Legacy of{' '}
              <span className="text-gold-gradient">Pure Flavors</span>
            </h2>
            <p className="text-muted leading-relaxed mb-4">
              Since {brand.yearFounded}, {brand.name} has been crafting authentic sweets
              using time-honored recipes passed down through generations. Every ingredient
              is handpicked, every recipe perfected over decades.
            </p>
            <p className="text-muted leading-relaxed mb-6">
              Our commitment to using only pure desi ghee, fresh milk, and premium dry
              fruits has made us {brand.city}&apos;s most trusted name in traditional sweets.
            </p>
            {/* Values */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              {['Pure Ingredients', 'Heritage Recipes', 'Made Fresh Daily', 'Family Tradition'].map((val) => (
                <div key={val} className="flex items-center gap-2 text-sm text-navy-900">
                  <span className="w-2 h-2 rounded-full bg-gold-400" />
                  {val}
                </div>
              ))}
            </div>
            <Link
              to="/about"
              className="inline-flex items-center gap-2 text-navy-900 font-semibold hover:text-gold-600 transition-colors text-sm group"
            >
              Read Our Full Story
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
