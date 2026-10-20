import brand from './brand.config';

const absolute = (path) => `${brand.siteUrl}${path}`;

export function canonicalUrl(path = '/') {
  if (!path || path === '/') return `${brand.siteUrl}/`;
  return `${brand.siteUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

export function breadcrumbJsonLd(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: canonicalUrl(item.path),
    })),
  };
}

export function buildStructuredData() {
  const logoUrl = absolute(brand.logo);
  const images = [
    absolute(brand.ogImage),
    logoUrl,
    absolute('/images/menu/sweets-dessert/gulab-jamun.jpg'),
  ];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': `${brand.siteUrl}/#website`,
        name: brand.name,
        alternateName: brand.alternateNames,
        url: `${brand.siteUrl}/`,
        description: brand.seoDescription,
        inLanguage: 'en-IN',
        publisher: { '@id': `${brand.siteUrl}/#organization` },
      },
      {
        '@type': 'Organization',
        '@id': `${brand.siteUrl}/#organization`,
        name: brand.name,
        alternateName: brand.alternateNames,
        url: `${brand.siteUrl}/`,
        logo: {
          '@type': 'ImageObject',
          url: logoUrl,
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
        alternateName: brand.alternateNames,
        description: brand.seoDescription,
        url: `${brand.siteUrl}/`,
        image: images,
        logo: logoUrl,
        telephone: brand.phone,
        email: brand.email,
        priceRange: '₹₹',
        currenciesAccepted: 'INR',
        paymentAccepted: 'Cash, UPI, Cards',
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
    ],
  };
}
