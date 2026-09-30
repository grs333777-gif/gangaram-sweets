import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail, Clock } from 'lucide-react';
import brand from '../../config/brand.config';
import OrnamentalDivider from '../ui/OrnamentalDivider';

const quickLinks = [
  { name: 'Home', path: '/' },
  { name: 'Menu / Order', path: '/menu' },
  { name: 'About Us', path: '/about' },
  { name: 'Contact', path: '/contact' },
  { name: 'Track Order', path: '/track-order' },
];

const policies = [
  { name: 'Terms & Conditions', path: '/terms' },
  { name: 'Privacy Policy', path: '/privacy' },
  { name: 'Refund & Shipping', path: '/refund-shipping' },
];

// const socialLinks = [
//   { icon: Instagram, url: brand.social.instagram, name: 'Instagram' },
//   { icon: Facebook, url: brand.social.facebook, name: 'Facebook' },
// ];

export default function Footer() {
  return (
    <footer className="bg-navy-900 text-white relative overflow-hidden">
      {/* Mandala pattern overlay */}
      <div className="absolute inset-0 pattern-mandala opacity-30 pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        {/* Top section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8 mb-12">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-4">
              <img
                src="/logo.jpeg"
                alt={`${brand.name} Logo`}
                className="h-14 w-14 rounded-full object-cover border-2 border-gold-400"
                width="56"
                height="56"
                loading="lazy"
              />
              <div>
                <h3 className="font-heading text-lg font-bold">{brand.name}</h3>
                <p className="text-gold-400 text-xs tracking-[0.2em] uppercase">{brand.tagline}</p>
              </div>
            </div>
            <p className="text-navy-300 text-sm leading-relaxed mb-4">
              {brand.description}
            </p>
            {/* Social links */}
            {/* <div className="flex gap-3">
              {socialLinks.map((social) => (
                <a
                  key={social.name}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 rounded-xl bg-navy-700 flex items-center justify-center hover:bg-gold-600 transition-colors duration-200"
                  aria-label={`Follow us on ${social.name}`}
                >
                  <social.icon size={18} />
                </a>
              ))}
            </div> */}
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-heading text-base font-semibold mb-4 text-gold-400">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-navy-300 text-sm hover:text-white hover:pl-1 transition-all duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-heading text-base font-semibold mb-4 text-gold-400">
              Visit Us
            </h4>
            <ul className="space-y-3">
              <li className="flex gap-3 text-sm text-navy-300">
                <MapPin size={18} className="text-gold-400 shrink-0 mt-0.5" />
                <span>{brand.address}</span>
              </li>
              <li>
                <a
                  href={`tel:${brand.phone}`}
                  className="flex gap-3 text-sm text-navy-300 hover:text-white transition-colors"
                >
                  <Phone size={18} className="text-gold-400 shrink-0" />
                  <span>{brand.phone}</span>
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${brand.email}`}
                  className="flex gap-3 text-sm text-navy-300 hover:text-white transition-colors"
                >
                  <Mail size={18} className="text-gold-400 shrink-0" />
                  <span>{brand.email}</span>
                </a>
              </li>
              <li className="flex gap-3 text-sm text-navy-300">
                <Clock size={18} className="text-gold-400 shrink-0" />
                <span>{brand.openingHours}</span>
              </li>
            </ul>
          </div>

          {/* Policies & FSSAI */}
          <div>
            <h4 className="font-heading text-base font-semibold mb-4 text-gold-400">
              Policies
            </h4>
            <ul className="space-y-2.5">
              {policies.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className="text-navy-300 text-sm hover:text-white hover:pl-1 transition-all duration-200"
                  >
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
            {/* FSSAI */}
            <div className="mt-6 p-3 rounded-xl bg-navy-800 border border-navy-700">
              <p className="text-xs text-navy-300 uppercase tracking-wider mb-1">
                Food Safety License
              </p>
              <p className="text-sm font-medium text-gold-400">
                {brand.fssaiNumber}
              </p>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-navy-700 pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-navy-400">
            <p>
              © {new Date().getFullYear()} {brand.name}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
