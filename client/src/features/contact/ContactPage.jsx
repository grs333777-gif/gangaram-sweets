import { useState } from 'react';
import { motion } from 'framer-motion';
import { Helmet } from 'react-helmet-async';
import { MapPin, Phone, Mail, Clock, Send, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../../components/ui/OrnamentalDivider';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.message) {
      toast.error('Please fill in required fields');
      return;
    }
    setLoading(true);
    // Simulate API call for demo
    await new Promise((r) => setTimeout(r, 1000));
    toast.success('Message sent successfully! We\'ll get back to you soon.');
    setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    setLoading(false);
  };

  return (
    <>
      <Helmet>
        <title>Contact Us — {brand.name} | Get in Touch</title>
        <meta name="description" content={`Contact ${brand.name} in ${brand.city}. Call us, visit our shop, or send us a message. We'd love to hear from you!`} />
      </Helmet>

      {/* Header */}
      <section className="bg-gradient-to-b from-navy-900 to-navy-800 pt-28 pb-12 relative overflow-hidden">
        <div className="absolute inset-0 pattern-mandala opacity-15" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-heading text-3xl sm:text-4xl font-bold text-white mb-2"
          >
            Get in <span className="text-gold-gradient">Touch</span>
          </motion.h1>
          <OrnamentalDivider className="my-4" width={160} />
          <p className="text-navy-300 text-sm sm:text-base">
            We&apos;d love to hear from you. Reach out for orders, catering, or just to say hello!
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-5 gap-10">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="font-heading text-xl font-bold text-navy-900 mb-4">
                Visit Our Shop
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-gold-400 shrink-0">
                    <MapPin size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Address</p>
                    <p className="text-sm text-muted">{brand.address}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-gold-400 shrink-0">
                    <Phone size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Phone</p>
                    <a href={`tel:${brand.phone}`} className="text-sm text-muted hover:text-navy-900 transition-colors">
                      {brand.phone}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-gold-400 shrink-0">
                    <MessageCircle size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">WhatsApp</p>
                    <a href={`https://wa.me/${brand.whatsapp?.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="text-sm text-muted hover:text-navy-900 transition-colors">
                      {brand.whatsapp}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-gold-400 shrink-0">
                    <Mail size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Email</p>
                    <a href={`mailto:${brand.email}`} className="text-sm text-muted hover:text-navy-900 transition-colors">
                      {brand.email}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center text-gold-400 shrink-0">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-navy-900">Opening Hours</p>
                    <p className="text-sm text-muted">{brand.openingHours}</p>
                    <p className="text-xs text-muted">Open all days</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Map placeholder */}
            <div className="rounded-2xl overflow-hidden border border-cream-200 h-48 bg-cream-100">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d235014.29919129966!2d75.69937389453124!3d22.72374645!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3962fcad1b410ddb%3A0x96ec4da356240f4!2sIndore%2C%20Madhya%20Pradesh!5e0!3m2!1sen!2sin!4v1"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Gangaram Location Map"
              />
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-card p-6 sm:p-8 border border-cream-100">
              <h2 className="font-heading text-xl font-bold text-navy-900 mb-1">
                Send Us a Message
              </h2>
              <p className="text-sm text-muted mb-6">
                Have a question about orders, catering, or bulk requests? We&apos;re here to help.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-navy-900 mb-1">
                      Name <span className="text-error">*</span>
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
                      placeholder="Your name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-navy-900 mb-1">
                      Phone <span className="text-error">*</span>
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
                      placeholder="+91 98XXXXXXXX"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-navy-900 mb-1">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
                    placeholder="your@email.com"
                  />
                </div>

                <div>
                  <label htmlFor="subject" className="block text-sm font-medium text-navy-900 mb-1">
                    Subject
                  </label>
                  <input
                    id="subject"
                    type="text"
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent"
                    placeholder="Bulk order inquiry, catering..."
                  />
                </div>

                <div>
                  <label htmlFor="message" className="block text-sm font-medium text-navy-900 mb-1">
                    Message <span className="text-error">*</span>
                  </label>
                  <textarea
                    id="message"
                    rows="4"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-cream-200 text-sm focus:outline-none focus:ring-2 focus:ring-gold-400 focus:border-transparent resize-none"
                    placeholder="Tell us how we can help..."
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="btn-gold-shimmer w-full flex items-center justify-center gap-2 text-white font-semibold py-3 rounded-xl disabled:opacity-60"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Send size={18} />
                      Send Message
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
