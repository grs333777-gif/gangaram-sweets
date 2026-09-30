import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { Heart, Leaf, Clock, Users, Award, ChefHat } from 'lucide-react';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';
import { useScrollAnimation } from '../../hooks/useScrollAnimation';

const timeline = [
  { year: brand.yearFounded, title: 'The Beginning', desc: `${brand.shortName} was founded with a small sweet shop and a big dream — to bring pure, authentic sweets to Indore.` },
  { year: 1980, title: 'Growing Reputation', desc: 'Word of our pure desi ghee sweets spread across the city. We became a household name for festivals and celebrations.' },
  { year: 1995, title: 'Expanding Horizons', desc: 'Opened our second branch and introduced our popular namkeen range alongside traditional sweets.' },
  { year: 2010, title: 'Modern Kitchen', desc: 'Invested in a state-of-the-art kitchen while preserving our traditional recipes and handcrafted processes.' },
  { year: 2024, title: 'Online Ordering', desc: 'Bringing the taste of purity to your doorstep with online ordering and delivery services.' },
];

const values = [
  { icon: Leaf, title: 'Purity', desc: 'Only pure desi ghee, fresh milk, and premium ingredients. No shortcuts, no preservatives.' },
  { icon: Heart, title: 'Tradition', desc: 'Heritage recipes passed down through generations, made with the same love and care.' },
  { icon: Clock, title: 'Freshness', desc: 'Made fresh daily in small batches. From our kitchen to your hands, always fresh.' },
  { icon: Users, title: 'Community', desc: 'A part of Indore\'s fabric for decades. We celebrate with our community, every day.' },
];

const stats = [
  { value: `${brand.yearsOfTrust}+`, label: 'Years of Trust' },
  { value: '50K+', label: 'Happy Customers' },
  { value: '100+', label: 'Sweet Varieties' },
  { value: '365', label: 'Days Fresh' },
];

export default function AboutPage() {
  return (
    <>
      <Helmet>
        <title>About Us — {brand.name} | Our Story &amp; Heritage</title>
        <meta name="description" content={`Learn about ${brand.name}'s journey from ${brand.yearFounded} to becoming Indore's most trusted sweet brand. Pure desi ghee, heritage recipes, and a commitment to excellence.`} />
      </Helmet>

      {/* Cinematic Header */}
      <section className="bg-gradient-to-b from-navy-900 via-navy-800 to-navy-900 pt-28 pb-16 relative overflow-hidden">
        <div className="absolute inset-0 pattern-mandala opacity-15" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.img
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            src="/logo.jpeg"
            alt={`${brand.name} Logo`}
            className="w-24 h-24 mx-auto rounded-full border-4 border-gold-400/40 shadow-gold mb-6"
            width="96"
            height="96"
          />
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-3"
          >
            Our <span className="text-gold-gradient">Story</span>
          </motion.h1>
          <OrnamentalDivider className="my-4" width={200} />
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-navy-300 text-base sm:text-lg max-w-2xl mx-auto"
          >
            A legacy of purity, tradition, and love — serving Indore since {brand.yearFounded}.
          </motion.p>
        </div>
      </section>

      {/* Meet the Founder */}
      <section className="py-16 sm:py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-10 items-center">
            {/* Portrait */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2"
            >
              <div className="relative max-w-sm mx-auto">
                {/* Gold frame */}
                <div className="rounded-t-[120px] rounded-b-2xl overflow-hidden border-4 border-gold-400/40 shadow-gold bg-cream-100">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&fit=crop&crop=face"
                    alt="Shri Gangaram Ji - Founder"
                    className="w-full h-80 sm:h-96 object-cover object-top"
                    loading="lazy"
                    width="400"
                    height="384"
                  />
                </div>
                {/* Name plate */}
                <div className="text-center mt-4">
                  <h3 className="font-heading text-xl font-bold text-navy-900">
                    Shri Gangaram Ji
                  </h3>
                  <p className="text-gold-600 text-sm font-medium">Founder & Visionary</p>
                </div>
              </div>
            </motion.div>

            {/* Bio */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-3"
            >
              <p className="text-gold-600 text-sm font-medium tracking-[0.2em] uppercase mb-2">
                Meet Our Founder
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                The Man Behind the{' '}
                <span className="text-gold-gradient">Legacy</span>
              </h2>

              {/* Pull quote */}
              <blockquote className="border-l-4 border-gold-400 pl-4 mb-6">
                <p className="font-heading text-lg sm:text-xl text-navy-700 italic leading-relaxed">
                  &ldquo;When you use the purest ingredients with honest intent, every sweet becomes a blessing.&rdquo;
                </p>
              </blockquote>

              <p className="text-muted leading-relaxed mb-4">
                In {brand.yearFounded}, Shri Gangaram Ji started with a humble shop and an unwavering commitment — to create sweets that families could trust completely. Using only pure desi ghee, fresh milk from local dairies, and the finest dry fruits, he set a standard that remains uncompromised to this day.
              </p>
              <p className="text-muted leading-relaxed mb-4">
                What began as a small shop in Indore has grown into a beloved institution, but the values remain the same: purity first, taste always, and every customer is family.
              </p>
              <p className="text-muted leading-relaxed">
                Today, the next generation carries forward this legacy, blending time-honored recipes with modern hygiene standards, ensuring that every bite of {brand.shortName} sweet is a taste of heritage.
              </p>

              {/* Signature */}
              <div className="mt-6 pt-4 border-t border-cream-200">
                <p className="font-heading text-lg italic text-gold-600">— The {brand.shortName} Family</p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Heritage Timeline */}
      <section className="py-16 sm:py-20 bg-white pattern-jaali">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-gold-600 text-sm font-medium tracking-[0.2em] uppercase mb-2">
              Our Journey
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900 mb-3">
              Heritage Timeline
            </h2>
            <OrnamentalDivider className="my-4" width={180} />
          </motion.div>

          <div className="relative">
            {/* Center line */}
            <div className="absolute left-4 sm:left-1/2 top-0 bottom-0 w-0.5 bg-gold-300 -translate-x-1/2" />

            {timeline.map((item, i) => (
              <motion.div
                key={item.year}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex items-start gap-4 sm:gap-0 mb-10 ${
                  i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
                }`}
              >
                {/* Dot */}
                <div className="absolute left-4 sm:left-1/2 w-4 h-4 rounded-full bg-gold-500 border-4 border-cream-50 -translate-x-1/2 z-10 mt-1" />

                {/* Content card */}
                <div className={`ml-10 sm:ml-0 sm:w-[45%] ${i % 2 === 0 ? 'sm:pr-8 sm:text-right' : 'sm:pl-8'}`}>
                  <span className="inline-block bg-navy-900 text-gold-300 text-xs font-bold px-3 py-1 rounded-lg mb-2">
                    {item.year}
                  </span>
                  <h3 className="font-heading text-lg font-bold text-navy-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-sm text-muted leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 sm:py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-12"
          >
            <p className="text-gold-600 text-sm font-medium tracking-[0.2em] uppercase mb-2">
              What Drives Us
            </p>
            <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900">
              Our Values
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((val, i) => (
              <motion.div
                key={val.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white rounded-2xl p-6 text-center shadow-card hover:shadow-card-hover transition-shadow duration-300"
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-white mb-4">
                  <val.icon size={28} />
                </div>
                <h3 className="font-heading text-lg font-bold text-navy-900 mb-2">
                  {val.title}
                </h3>
                <p className="text-sm text-muted leading-relaxed">
                  {val.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Counter */}
      <section className="py-14 bg-navy-900 relative overflow-hidden">
        <div className="absolute inset-0 pattern-mandala opacity-20" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="text-center"
              >
                <p className="text-3xl sm:text-4xl font-heading font-bold text-gold-400 mb-1">
                  {stat.value}
                </p>
                <p className="text-sm text-navy-300">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
