import { motion } from 'framer-motion';
import { Heart, Leaf, Clock, Users } from 'lucide-react';
import brand from '../../config/brand.config';
import Seo from '../../components/seo/Seo';
import ownerPhoto from '../../assets/owner.jpeg';
import fatherPhoto from '../../assets/owner_f.jpeg';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

const timeline = [
  { year: brand.yearFounded, title: 'The Beginning', desc: `${brand.shortName} was founded with a small sweet shop and a big dream — to bring pure, authentic sweets to every celebration.` },
  { year: 1980, title: 'Growing Reputation', desc: 'Word of our pure desi ghee sweets spread across the city. We became a household name for festivals and celebrations.' },
  { year: 1995, title: 'Expanding Horizons', desc: 'Opened our second branch and introduced our popular namkeen range alongside traditional sweets.' },
  { year: 2010, title: 'Modern Kitchen', desc: 'Invested in a state-of-the-art kitchen while preserving our traditional recipes and handcrafted processes.' },
  { year: 2024, title: 'Online Ordering', desc: 'Bringing the taste of purity to your doorstep with online ordering and delivery services.' },
  { year: brand.yearBranchOpened, title: 'Dalsinghsarai Branch', desc: `Opened our ${brand.city} branch on Thana Road — bringing Gangaram's heritage mithai to ${brand.district}, ${brand.state}.` },
];

const values = [
  { icon: Leaf, title: 'Purity', desc: 'Only pure desi ghee, fresh milk, and premium ingredients. No shortcuts, no preservatives.' },
  { icon: Heart, title: 'Tradition', desc: 'Heritage recipes passed down through generations, made with the same love and care.' },
  { icon: Clock, title: 'Freshness', desc: 'Made fresh daily in small batches. From our kitchen to your hands, always fresh.' },
  { icon: Users, title: 'Community', desc: `A part of ${brand.city}'s fabric for decades. We celebrate with our community, every day.` },
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
      <Seo
        title={`About Us — ${brand.name} | Our Story Since ${brand.yearFounded}`}
        description={`The story of ${brand.name} — heritage since ${brand.yearFounded}, now at our ${brand.city}, ${brand.district} branch. Pure desi ghee mithai and recipes trusted for generations.`}
        path="/about"
      />

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
            A legacy of purity, tradition, and love — heritage since {brand.yearFounded}, now in {brand.city}.
          </motion.p>
        </div>
      </section>

      {/* Owner's Father */}
      <section className="py-16 sm:py-20 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-5 gap-10 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="md:col-span-2"
            >
              <div className="relative max-w-sm mx-auto">
                <div className="rounded-t-[120px] rounded-b-2xl overflow-hidden border-4 border-gold-400/40 shadow-gold bg-cream-100">
                  <img
                    src={fatherPhoto}
                    alt="Mr. Shambhu Prasad, father of the owner of Gangaram Sweets"
                    className="h-80 w-full origin-[100%_12%] scale-[1.0] object-cover object-[100%_12%] sm:h-96"
                    loading="lazy"
                    width="853"
                    height="1280"
                  />
                </div>
                <div className="text-center mt-4">
                  <h3 className="font-heading text-xl font-bold text-navy-900">
                    Shambhu Prasad
                  </h3>
                  <p className="text-gold-600 text-sm font-medium">Owner&apos;s Father</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="md:col-span-3"
            >
              <p className="text-gold-600 text-sm font-medium tracking-[0.2em] uppercase mb-2">
                The Foundation
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                Mr. Shambhu <span className="text-gold-gradient">Prasad</span>
              </h2>

              <p className="text-muted leading-relaxed mb-4">
                Mr. Shambhu Prasad began his business journey in the 1970s, carrying with him a strong sense of dedication, hard work, and commitment to quality. In 1980, he expanded his journey by entering the wholesale gold business, building lasting relationships through trust, integrity, and consistent service.
              </p>
              <p className="text-muted leading-relaxed mb-4">
                Over the years, the support of customers and his unwavering dedication helped establish a strong foundation for the family business. His approach was always rooted in maintaining quality and earning the trust of people through honest work and long-term relationships.
              </p>
              <p className="text-muted leading-relaxed">
                Today, the values he built over the years continue to be an important part of our identity at Gangaram Sweets. We carry forward his legacy by giving the same importance to purity, quality, trust, and customer satisfaction in everything we do.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Meet the Owner */}
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
                    src={ownerPhoto}
                    alt="Akash Soni, owner of Gangaram Sweets, Dalsinghsarai"
                    className="w-full h-80 object-cover object-[center_18%] sm:h-96"
                    loading="lazy"
                    width="1086"
                    height="1448"
                  />
                </div>
                <div className="text-center mt-4">
                  <h3 className="font-heading text-xl font-bold text-navy-900">
                    Akash Soni
                  </h3>
                  <p className="text-gold-600 text-sm font-medium">Owner</p>
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
                The Owner
              </p>
              <h2 className="font-heading text-3xl sm:text-4xl font-bold text-navy-900 mb-6">
                Mr. Akash <span className="text-gold-gradient">Soni</span>
              </h2>

              <p className="text-muted leading-relaxed mb-4">
                Mr. Akash Soni is a passionate entrepreneur whose journey reflects a deep-rooted family legacy, dedication, and a vision for creating memorable experiences.
              </p>
              <p className="text-muted leading-relaxed mb-4">
                Coming from a family with a strong entrepreneurial heritage, Akash Soni has carried forward the values of trust, quality, and commitment while building his own presence across multiple businesses. His journey extends beyond the sweet shop, with ventures in jewellery and automobile showrooms, giving him a diverse perspective on business and customer experience.
              </p>
              <p className="text-muted leading-relaxed mb-4">
                With his long-standing connection to the mithai business, Akash Soni understands that a great sweet shop is about much more than desserts. It is about the warmth of hospitality, the quality of every box, the trust of every customer, and the memories people take home with them.
              </p>
              <p className="text-muted leading-relaxed">
                At Gangaram Sweets, his vision is to bring together the richness of tradition with a modern approach to hospitality—creating a place where every guest feels welcomed and every box of mithai becomes a memorable gift.
              </p>

              <div className="mt-6 pt-4 border-t border-cream-200">
                <p className="font-heading text-lg italic text-gold-600">
                  Built on legacy. Driven by vision. Inspired by people.
                </p>
              </div>
            </motion.div>
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
