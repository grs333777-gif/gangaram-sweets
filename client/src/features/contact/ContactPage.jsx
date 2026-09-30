import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { MapPin, Phone, Mail, Clock, MessageCircle } from 'lucide-react';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

const details = [
  {
    icon: MapPin,
    label: 'Address',
    value: brand.address,
    href: brand.mapUrl,
  },
  {
    icon: Phone,
    label: 'Phone',
    value: brand.phone,
    href: `tel:${brand.phone}`,
  },
  {
    icon: MessageCircle,
    label: 'WhatsApp',
    value: brand.whatsapp,
    href: `https://wa.me/${brand.whatsapp?.replace(/[^0-9]/g, '')}`,
    external: true,
  },
  {
    icon: Mail,
    label: 'Email',
    value: brand.email,
    href: `mailto:${brand.email}`,
  },
  {
    icon: Clock,
    label: 'Opening Hours',
    value: `${brand.openingHours} · Open all days`,
  },
];

export default function ContactPage() {
  return (
    <>
      <Helmet>
        <title>Contact Us — {brand.name} | Get in Touch</title>
        <meta name="description" content={`Contact ${brand.name} at ${brand.address}. Call ${brand.phone} or email ${brand.email}.`} />
      </Helmet>

      <section className="relative overflow-hidden bg-gradient-to-b from-navy-900 to-navy-800 pt-28 pb-12">
        <div className="absolute inset-0 pattern-mandala opacity-15" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-2 font-heading text-3xl font-bold text-white sm:text-4xl"
          >
            Get in <span className="text-gold-gradient">Touch</span>
          </motion.h1>
          <OrnamentalDivider className="my-4" width={160} />
          <p className="text-sm text-navy-300 sm:text-base">
            Visit the shop, call us, or write to us. We would love to hear from you.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="space-y-4">
          {details.map((item) => {
            const body = (
              <>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy-900 text-gold-400">
                  <item.icon size={18} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-navy-900">{item.label}</p>
                  <p className="text-sm text-muted">{item.value}</p>
                </div>
              </>
            );

            if (!item.href) {
              return (
                <div key={item.label} className="flex gap-3 rounded-2xl border border-cream-200 bg-white p-4">
                  {body}
                </div>
              );
            }

            return (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? '_blank' : undefined}
                rel={item.external ? 'noopener noreferrer' : undefined}
                className="flex gap-3 rounded-2xl border border-cream-200 bg-white p-4 transition-colors hover:border-gold-400"
              >
                {body}
              </a>
            );
          })}
        </div>

        <div className="mt-8 h-72 overflow-hidden rounded-2xl border border-cream-200 bg-cream-100">
          <iframe
            src={`https://maps.google.com/maps?q=${encodeURIComponent(brand.address)}&z=15&output=embed`}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Gangaram location map"
          />
        </div>
      </div>
    </>
  );
}
