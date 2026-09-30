import { motion } from 'framer-motion';
import { Leaf, Clock, Award, Truck } from 'lucide-react';
import brand from '../../config/brand.config';

const trustItems = [
  { icon: Leaf, text: 'Pure Desi Ghee', color: 'text-success' },
  { icon: Clock, text: 'Fresh Daily', color: 'text-gold-600' },
  { icon: Award, text: `Trusted ${brand.yearsOfTrust}+ Years`, color: 'text-navy-700' },
  { icon: Truck, text: `Free Delivery ₹${brand.freeDeliveryAbove}+`, color: 'text-magenta-500' },
];

export default function TrustStrip() {
  return (
    <section className="bg-cream-50 relative z-10 pt-2 pb-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-white rounded-2xl shadow-card border border-cream-200 px-6 py-5"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {trustItems.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex items-center gap-3"
              >
                <div className={`p-2.5 rounded-xl bg-cream-50 ${item.color}`}>
                  <item.icon size={22} />
                </div>
                <span className="text-sm font-medium text-navy-900">
                  {item.text}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
