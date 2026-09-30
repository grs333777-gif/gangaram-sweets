import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Plus, Star } from 'lucide-react';
import products from '../../data/products';
import useCartStore from '../../store/cartStore';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

const bestsellers = products.filter((p) => p.isBestseller);

export default function Bestsellers() {
  const scrollRef = useRef(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const addToCart = useCartStore((s) => s.addToCart);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    el?.addEventListener('scroll', checkScroll, { passive: true });
    return () => el?.removeEventListener('scroll', checkScroll);
  }, []);

  const scroll = (dir) => {
    scrollRef.current?.scrollBy({ left: dir * 300, behavior: 'smooth' });
  };

  return (
    <section className="py-16 sm:py-20 bg-white pattern-jaali">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <p className="text-gold-600 text-sm font-medium tracking-[0.2em] uppercase mb-2">
            Most Loved
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900 mb-3">
            Our Bestsellers
          </h2>
          <OrnamentalDivider className="my-4" width={180} />
        </motion.div>

        {/* Carousel */}
        <div className="relative">
          {/* Arrows */}
          {canScrollLeft && (
            <button
              onClick={() => scroll(-1)}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-card-hover flex items-center justify-center text-navy-900 hover:bg-navy-900 hover:text-white transition-colors"
              aria-label="Scroll left"
            >
              <ChevronLeft size={20} />
            </button>
          )}
          {canScrollRight && (
            <button
              onClick={() => scroll(1)}
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-card-hover flex items-center justify-center text-navy-900 hover:bg-navy-900 hover:text-white transition-colors"
              aria-label="Scroll right"
            >
              <ChevronRight size={20} />
            </button>
          )}

          <div
            ref={scrollRef}
            className="flex gap-5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4 -mx-4 px-4"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {bestsellers.map((product, i) => (
              <motion.div
                key={product._id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.05 }}
                className="flex-shrink-0 w-64 sm:w-72 snap-start"
              >
                <div className="group bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden border border-cream-100">
                  {/* Image */}
                  <div className="relative aspect-square overflow-hidden">
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                      decoding="async"
                      width="288"
                      height="288"
                    />
                    {/* Bestseller tag */}
                    <span className="absolute top-3 left-3 bg-magenta-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                      ★ Bestseller
                    </span>
                    {/* Veg badge */}
                    {product.isVeg && (
                      <span className="absolute top-3 right-3 veg-badge bg-white" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <p className="text-xs text-muted mb-1">{product.categoryName}</p>
                    <h3 className="font-heading text-base font-bold text-navy-900 mb-1 truncate">
                      {product.name}
                    </h3>
                    <p className="text-xs text-muted line-clamp-2 mb-3 leading-relaxed">
                      {product.description}
                    </p>

                    {/* Price + Add */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-navy-900">
                          ₹{product.variants[0].price}
                        </span>
                        <span className="text-xs text-muted ml-1">
                          / {product.variants[0].weight}
                        </span>
                      </div>
                      <button
                        onClick={() => addToCart(product, product.variants[0])}
                        className="w-9 h-9 rounded-xl bg-navy-900 text-white flex items-center justify-center hover:bg-gold-600 transition-colors duration-200"
                        aria-label={`Add ${product.name} to cart`}
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
