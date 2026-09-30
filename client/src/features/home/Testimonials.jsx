import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import testimonials from '../../data/testimonials';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

export default function Testimonials() {
  const [current, setCurrent] = useState(0);
  const visibleCount = 3;

  const next = () => setCurrent((c) => (c + 1) % testimonials.length);
  const prev = () => setCurrent((c) => (c - 1 + testimonials.length) % testimonials.length);

  // Get visible testimonials in a sliding window
  const visible = [];
  for (let i = 0; i < visibleCount; i++) {
    visible.push(testimonials[(current + i) % testimonials.length]);
  }

  return (
    <section className="py-16 sm:py-20 bg-cream-100 pattern-jaali">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-gold-600 text-sm font-medium tracking-[0.2em] uppercase mb-2">
            What Our Customers Say
          </p>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900 mb-3">
            Loved by Thousands
          </h2>
          <OrnamentalDivider className="my-4" width={180} />
        </motion.div>

        {/* Testimonial cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {visible.map((t, i) => (
            <motion.div
              key={t._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-card relative"
            >
              <Quote size={32} className="text-gold-200 absolute top-4 right-4" />
              {/* Stars */}
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: t.rating }).map((_, j) => (
                  <Star key={j} size={16} className="text-gold-400 fill-gold-400" />
                ))}
              </div>
              {/* Text */}
              <p className="text-sm text-muted leading-relaxed mb-4 line-clamp-4">
                &quot;{t.text}&quot;
              </p>
              {/* Author */}
              <div className="flex items-center gap-3 pt-3 border-t border-cream-100">
                <div className="w-10 h-10 rounded-full bg-navy-900 text-white flex items-center justify-center text-sm font-bold">
                  {t.avatar}
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">{t.name}</p>
                  <p className="text-xs text-muted">{t.location}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Nav dots & arrows */}
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={prev}
            className="w-9 h-9 rounded-full border border-navy-200 flex items-center justify-center text-navy-900 hover:bg-navy-900 hover:text-white transition-colors"
            aria-label="Previous testimonials"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex gap-1.5">
            {testimonials.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-colors ${
                  i === current ? 'bg-gold-500 w-6' : 'bg-navy-200'
                }`}
                aria-label={`Go to testimonial ${i + 1}`}
              />
            ))}
          </div>
          <button
            onClick={next}
            className="w-9 h-9 rounded-full border border-navy-200 flex items-center justify-center text-navy-900 hover:bg-navy-900 hover:text-white transition-colors"
            aria-label="Next testimonials"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
}
