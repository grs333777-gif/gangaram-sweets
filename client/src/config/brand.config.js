/**
 * Brand Configuration
 * Change the brand name here to switch between variants.
 * No component needs to be touched.
 */
const brand = {
  // ─── Switch between "Gangaram Sweets" / "Gangaram Restaurant" ───
  name: 'Gangaram Restaurant',
  shortName: 'Gangaram',
  tagline: 'Taste of Purity',
  taglineHindi: 'गंगाराम',
  description:
    'Indore\'s most trusted name for pure desi ghee sweets, namkeen, and festive gift boxes. Heritage recipes, made fresh daily.',

  // ─── Contact & Location ───
  phone: '+91-731-XXXXXXX',
  whatsapp: '+91-98XXXXXXXX',
  email: 'info@gangaram.in',
  address: 'Main Branch, MG Road, Indore, Madhya Pradesh 452001',
  mapUrl: 'https://maps.google.com/?q=Gangaram+Sweets+Indore',
  city: 'Indore',
  state: 'Madhya Pradesh',

  // ─── Business ───
  fssaiNumber: 'FSSAI: XXXXXXXXXXXX',
  yearFounded: 1965,
  get yearsOfTrust() {
    return new Date().getFullYear() - this.yearFounded;
  },
  openingHours: '8:00 AM – 10:00 PM',
  freeDeliveryAbove: 500, // ₹
  minOrderAmount: 200,
  deliveryFee: 40,

  // ─── Social ───
  social: {
    instagram: 'https://instagram.com/gangaram_indore',
    facebook: 'https://facebook.com/gangaramindore',
    youtube: '',
    twitter: '',
  },

  // ─── SEO ───
  siteUrl: 'https://gangaram.in',
  ogImage: '/og-image.jpg',

  // ─── Trust strip items ───
  trustPoints: [
    'Pure Desi Ghee',
    'Fresh Daily',
    `Trusted for 60+ Years`,
    'Free Delivery above ₹500',
  ],
};

export default brand;
