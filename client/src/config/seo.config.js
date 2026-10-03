import brand from './brand.config';

const absolute = (path) => `${brand.siteUrl}${path}`;

export const featuredProducts = [
  {
    name: 'Kaju Katli',
    description: 'Diamond-cut cashew mithai finished with silver varq, made fresh at Gangaram Sweets.',
    image: '/images/kaju-katli.jpg',
    url: '/menu?category=sweets-dessert',
  },
  {
    name: 'Gulab Jamun',
    description: 'Soft khoya dumplings soaked in warm saffron syrup.',
    image: '/images/gulab-jamun.jpg',
    url: '/menu?category=sweets-dessert',
    price: 40,
  },
  {
    name: 'Motichoor Laddu',
    description: 'Festive motichoor laddus made with pure desi ghee and fine boondi.',
    image: '/images/laddu.jpg',
    url: '/menu?category=sweets-dessert',
  },
  {
    name: 'Festive Sweet Box',
    description: 'Premium mixed mithai hamper for Diwali, weddings, and corporate gifting.',
    image: '/images/sweets.jpg',
    url: '/menu?category=sweets-dessert',
    price: 600,
  },
  {
    name: 'Assorted Barfi',
    description: 'A royal platter of milk barfi, pista, and dry-fruit sweets.',
    image: '/images/barfi.jpg',
    url: '/menu?category=sweets-dessert',
  },
];

export function buildStructuredData() {
  const logoUrl = absolute(brand.logo);
  const images = [
    absolute(brand.ogImage),
    ...featuredProducts.map((product) => absolute(product.image)),
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${brand.siteUrl}/#website`,
        name: brand.name,
        alternateName: ['Gangaram', 'Gangaram Mithai'],
        url: brand.siteUrl,
        description: brand.seoDescription,
        inLanguage: 'en-IN',
        publisher: { '@id': `${brand.siteUrl}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${brand.siteUrl}/#organization`,
        name: brand.name,
        url: brand.siteUrl,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
          width: 512,
          height: 512,
        },
        image: logoUrl,
        foundingDate: String(brand.yearFounded),
        email: brand.email,
        telephone: brand.phone,
        address: { '@id': `${brand.siteUrl}/#address` },
      },
      {
        '@type': ['Bakery', 'LocalBusiness', 'Store'],
        '@id': `${brand.siteUrl}/#localbusiness`,
        name: brand.name,
        alternateName: 'Gangaram',
        description: brand.seoDescription,
        url: brand.siteUrl,
        image: images,
        logo: logoUrl,
        telephone: brand.phone,
        email: brand.email,
        priceRange: '₹₹',
        currenciesAccepted: 'INR',
        paymentAccepted: 'Cash, UPI, Cards',
        openingDate: String(brand.yearBranchOpened),
        address: {
          '@id': `${brand.siteUrl}/#address`,
          '@type': 'PostalAddress',
          streetAddress: brand.streetAddress,
          addressLocality: brand.city,
          addressRegion: brand.state,
          postalCode: brand.pincode,
          addressCountry: 'IN',
        },
        geo: {
          '@type': 'GeoCoordinates',
          latitude: brand.geo.latitude,
          longitude: brand.geo.longitude,
        },
        hasMap: brand.mapUrl,
        openingHoursSpecification: {
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: [
            'Monday',
            'Tuesday',
            'Wednesday',
            'Thursday',
            'Friday',
            'Saturday',
            'Sunday',
          ],
          opens: '08:00',
          closes: '22:00',
        },
        areaServed: [
          { '@type': 'City', name: brand.city },
          { '@type': 'AdministrativeArea', name: brand.district },
          { '@type': 'State', name: brand.state },
        ],
        servesCuisine: ['Indian Sweets', 'Mithai', 'Namkeen'],
        menu: `${brand.siteUrl}/menu`,
        parentOrganization: { '@id': `${brand.siteUrl}/#organization` },
      },
      {
        '@type': 'ItemList',
        '@id': `${brand.siteUrl}/#featured-sweets`,
        name: `Signature sweets from ${brand.name}`,
        itemListOrder: 'https://schema.org/ItemListOrderAscending',
        numberOfItems: featuredProducts.length,
        itemListElement: featuredProducts.map((product, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          item: {
            '@type': 'Product',
            name: product.name,
            description: product.description,
            image: absolute(product.image),
            url: absolute(product.url),
            brand: {
              '@type': 'Brand',
              name: brand.name,
            },
            ...(product.price
              ? {
                  offers: {
                    '@type': 'Offer',
                    priceCurrency: 'INR',
                    price: String(product.price),
                    availability: 'https://schema.org/InStock',
                    url: absolute(product.url),
                    seller: { '@id': `${brand.siteUrl}/#localbusiness` },
                  },
                }
              : {}),
          },
        })),
      },
    ],
  };
}
