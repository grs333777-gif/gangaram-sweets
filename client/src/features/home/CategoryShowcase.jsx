import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
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
          <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.32em] text-gold-600">
            The collection
          </p>
          <h2 className="font-heading text-4xl text-navy-900 sm:text-5xl">
            Explore Our Categories
          </h2>
          <OrnamentalDivider className="my-4" width={180} />
          <p className="text-muted max-w-xl mx-auto">
            From dosa and thali to chaat, Chinese and desserts — the full Gangaram menu.
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
                className="group block"
              >
                <div className="aspect-[4/5] overflow-hidden bg-cream-100">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                    width="300"
                    height="375"
                  />
                </div>
                <div className="pt-4">
                  <h3 className="font-heading text-2xl text-navy-900">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted line-clamp-2">
                    {cat.description}
                  </p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
