import { Helmet } from 'react-helmet-async';
import { motion } from 'framer-motion';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

const policies = {
  terms: {
    title: 'Terms & Conditions',
    sections: [
      { heading: 'Acceptance of Terms', content: `By accessing and using the ${brand.name} website, you accept and agree to be bound by the terms and provisions of this agreement.` },
      { heading: 'Products & Pricing', content: 'All prices are listed in Indian Rupees (INR) and are inclusive of applicable taxes. We reserve the right to modify prices without prior notice. Product images are for illustration purposes and actual products may vary slightly.' },
      { heading: 'Orders & Payments', content: 'All orders are subject to availability. We accept payments via UPI, credit/debit cards, net banking, and select wallets through our payment partner Razorpay. Orders once confirmed cannot be cancelled after preparation begins.' },
      { heading: 'Delivery', content: `We deliver within ${brand.city} and select areas. Delivery times are estimated and may vary based on order volume and location. We are not liable for delays caused by unforeseen circumstances.` },
      { heading: 'Quality Assurance', content: 'We use only the purest ingredients and maintain strict hygiene standards. All our sweets are prepared fresh. In case of any quality issues, please contact us within 24 hours of delivery.' },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    sections: [
      { heading: 'Information We Collect', content: 'We collect personal information such as name, phone number, email, and delivery address when you place an order. Payment information is processed securely through Razorpay and is never stored on our servers.' },
      { heading: 'How We Use Your Information', content: 'Your information is used to process orders, provide delivery updates, improve our services, and communicate offers (only with your consent). We do not sell or share your data with third parties for marketing purposes.' },
      { heading: 'Data Security', content: 'We implement industry-standard security measures to protect your personal information. All data transmission is encrypted using SSL/TLS protocols.' },
      { heading: 'Cookies', content: 'We use cookies to enhance your browsing experience, remember your cart items, and analyze website traffic. You can manage cookie preferences through your browser settings.' },
      { heading: 'Contact Us', content: `For any privacy-related queries, please contact us at ${brand.email} or call ${brand.phone}.` },
    ],
  },
  'refund-shipping': {
    title: 'Refund & Shipping Policy',
    sections: [
      { heading: 'Shipping', content: `We offer delivery within ${brand.city} and nearby areas. Orders above ₹${brand.freeDeliveryAbove} qualify for free delivery. Standard delivery fee is ₹${brand.deliveryFee}. Delivery typically takes 1-3 hours for in-city orders.` },
      { heading: 'Order Cancellation', content: 'Orders can be cancelled within 15 minutes of placement if preparation has not begun. Once preparation starts, cancellation is not possible for perishable items.' },
      { heading: 'Refunds', content: 'If you receive damaged or incorrect items, please contact us within 24 hours with photos. We will arrange a replacement or full refund. Refunds are processed within 5-7 business days to the original payment method.' },
      { heading: 'Returns', content: 'Due to the perishable nature of our products, we do not accept returns. However, if you are unsatisfied with the quality, please reach out and we will make it right.' },
      { heading: 'Bulk & Custom Orders', content: 'Bulk and custom orders (wedding trays, corporate gifting) have separate terms. Please contact us for details. Advance payment of 50% is required for custom orders.' },
    ],
  },
};

export default function PolicyPage({ type = 'terms' }) {
  const policy = policies[type] || policies.terms;

  return (
    <>
      <Helmet>
        <title>{policy.title} — {brand.name}</title>
      </Helmet>

      <section className="bg-gradient-to-b from-navy-900 to-navy-800 pt-28 pb-10 relative overflow-hidden">
        <div className="absolute inset-0 pattern-mandala opacity-15" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-white mb-2">{policy.title}</h1>
          <OrnamentalDivider className="my-4" width={160} />
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="space-y-8">
          {policy.sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <h2 className="font-heading text-lg font-bold text-navy-900 mb-2">
                {i + 1}. {section.heading}
              </h2>
              <p className="text-sm text-muted leading-relaxed">
                {section.content}
              </p>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 p-4 rounded-2xl bg-cream-100 text-center">
          <p className="text-sm text-muted">
            For questions, contact us at{' '}
            <a href={`mailto:${brand.email}`} className="text-navy-900 font-medium hover:underline">
              {brand.email}
            </a>
          </p>
        </div>
      </div>
    </>
  );
}
