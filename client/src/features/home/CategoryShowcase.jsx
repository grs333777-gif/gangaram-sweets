import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import categories from '../../data/categories';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

export default function CategoryShowcase() {
  return (
    <section className="py-16 sm:py-20 bg-cream-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-gold-600 text-sm font-medium tracking-[0.2em] uppercase mb-2">
            Our Specialties
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900 mb-3">
            Explore Our Categories
          </h2>
          <OrnamentalDivider className="my-4" width={180} />
          <p className="text-muted max-w-xl mx-auto">
            From traditional mithai to Indore&apos;s iconic street food, discover handcrafted flavors for every palate.
          </p>
        </motion.div>

        {/* Category grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat._id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
            >
              <Link
                to={`/menu?category=${cat.slug}`}
                className="group block relative overflow-hidden rounded-2xl bg-white shadow-card hover:shadow-card-hover transition-all duration-300"
              >
                <div className="aspect-square overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    loading="lazy"
                    decoding="async"
                    width="300"
                    height="300"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-navy-900/20 to-transparent" />
                </div>

                {/* Label */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h3 className="font-heading text-lg font-bold text-white mb-0.5">
                    {cat.name}
                  </h3>
                  <p className="text-white/70 text-xs leading-snug line-clamp-2">
                    {cat.description}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-gold-300 text-xs font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <span>Explore</span>
                    <ArrowRight size={14} />
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
