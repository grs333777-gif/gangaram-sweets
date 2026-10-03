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
  mapUrl:
    'https://www.google.com/maps/place/Thana+Rd,+Bihar+848114/@25.6693575,85.8341322,17z/data=!3m1!4b1!4m6!3m5!1s0x39ed8968c9fce9b3:0x24edbe523a60f2ea!8m2!3d25.6693575!4d85.8367071!16s%2Fg%2F11b6bqgh51?entry=ttu',
  city: 'Dalsinghsarai',
  district: 'Samastipur',
  state: 'Bihar',
  pincode: '848114',
  country: 'India',
  geo: {
    latitude: 25.6693575,
    longitude: 85.8367071,
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
  freeDeliveryAbove: 500, // ₹
  minOrderAmount: 200,
  deliveryFee: 40,

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
  get seoTitle() {
    return `${this.name} | Heritage Sweet Shop Since ${this.yearFounded} — ${this.city}, ${this.district}`;
  },
  get seoDescription() {
    return `Indulge in authentic desi ghee sweets at ${this.name}, a heritage mithai brand since ${this.yearFounded}. Now serving ${this.city}, ${this.district}, ${this.state} from our branch opened in ${this.yearBranchOpened}. Fresh mithai, namkeen, and festive gift boxes.`;
  },

  // ─── Trust strip items ───
  trustPoints: [
    'Pure Desi Ghee',
    'Fresh Daily',
    `Trusted for 60+ Years`,
    'Free Delivery above ₹500',
  ],
};

export default brand;
