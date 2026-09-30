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
    'Dalsinghsarai\'s trusted name for pure desi ghee sweets, namkeen, and festive gift boxes. Heritage recipes, made fresh daily.',

  // ─── Contact & Location ───
  phone: '+91-731-XXXXXXX',
  whatsapp: '+91-98XXXXXXXX',
  email: 'Gangaramdss12@gmail.com',
  address: 'Thana Road, Dalsinghsarai, 851111',
  mapUrl: 'https://maps.google.com/?q=Thana+Road+Dalsinghsarai+851111',
  city: 'Dalsinghsarai',
  state: 'Bihar',

  // ─── Business ───
  fssaiNumber: 'FSSAI: XXXXXXXXXXXX',
  yearFounded: 1978,
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
