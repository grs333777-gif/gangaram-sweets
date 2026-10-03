import { Helmet } from 'react-helmet-async';
import brand from '../../config/brand.config';
import { featuredProducts } from '../../config/seo.config';

export default function Seo({
  title = brand.seoTitle,
  description = brand.seoDescription,
  path = '/',
  image = brand.ogImage,
  jsonLd,
}) {
  const canonical = path === '/' ? brand.siteUrl : `${brand.siteUrl}${path}`;
  const ogImage = image.startsWith('http') ? image : `${brand.siteUrl}${image}`;
  const productImages = featuredProducts.map((product) => `${brand.siteUrl}${product.image}`);

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta
        name="keywords"
        content={`Gangaram Sweets, ${brand.city} sweets, Samastipur mithai, Bihar sweet shop, desi ghee sweets, namkeen, festive gift box`}
      />
      <link rel="canonical" href={canonical} />

      <meta property="og:locale" content="en_IN" />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={brand.name} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={`${brand.name} — signature mithai from ${brand.city}`} />
      {productImages.map((src) => (
        <meta key={src} property="og:image" content={src} />
      ))}

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {jsonLd ? (
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      ) : null}
    </Helmet>
  );
}
