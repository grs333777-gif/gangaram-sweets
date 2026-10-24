/**
 * Brand Configuration
 * Change the brand name here to switch between variants.
 * No component needs to be touched.
 */
const brand = {
  name: 'Gangaram Sweets',
  shortName: 'Gangaram',
  tagline: 'Taste of Purity',
  taglineHindi: 'गंगाराम',
  description:
    'Heritage mithai brand since 1978 — pure desi ghee sweets, namkeen, and festive gift boxes at our Dalsinghsarai branch in Samastipur, Bihar.',

  // ─── Contact & Location ───
  phone: '+91 95071 46000',
  whatsapp: '+91 95071 46000',
  email: 'gangaramdss12@gmail.com',
  streetAddress: 'Thana Road',
  address: 'Thana Road, Dalsinghsarai, Samastipur, Bihar 848114',
  mapUrl: 'https://www.google.com/maps?q=25.6668333,85.8395',
  city: 'Dalsinghsarai',
  district: 'Samastipur',
  state: 'Bihar',
  pincode: '848114',
  country: 'India',
  geo: {
    latitude: 25.6668333,
    longitude: 85.8395,
  },

  // ─── Business ───
  fssaiNumber: 'FSSAI: XXXXXXXXXXXX',
  yearFounded: 1978,
  yearBranchOpened: 2026,
  get yearsOfTrust() {
    return new Date().getFullYear() - this.yearFounded;
  },
  openingHours: '8:00 AM – 10:00 PM',
  openingHoursSchema: 'Mo-Su 08:00-22:00',
  freeDeliveryAbove: 0, // ₹ — delivery is always free
  minOrderAmount: 500,
  deliveryFee: 0,
  deliveryRadiusKm: 3,

  // ─── Social ───
  social: {
    instagram: '',
    facebook: '',
    youtube: '',
    twitter: '',
  },

  // ─── SEO ───
  siteUrl: 'https://www.gangaramsweets.in',
  logo: '/logo.jpeg',
  ogImage: '/og-image.jpg',
  keywords: [
    'Gangaram Sweets',
    'Gangaram DSS',
    'dalsinghsarai',
    'dalsingsarai',
    'dss',
    'sweet shop in Dalsinghsarai',
    'mithai shop in Dalsinghsarai',
    'sweets shop in Samastipur',
    'desi ghee sweets',
  ],
  alternateNames: ['Gangaram', 'Gangaram DSS', 'Gangaram Dalsinghsarai'],
  get seoTitle() {
    return `${this.name}, ${this.city} | Desi Ghee Mithai`;
  },
  get seoDescription() {
    return `Discover ${this.name} in ${this.city}, ${this.district}, ${this.state}. Explore traditional Indian mithai, including Gulab Jamun, Rasgulla and Rasmalai.`;
  },

  // ─── Trust strip items ───
  trustPoints: [
    'Pure Desi Ghee',
    'Fresh Daily',
    `Trusted for 60+ Years`,
    'Free delivery',
  ],
};

export default brand;
