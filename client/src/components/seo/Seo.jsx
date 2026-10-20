import { Helmet } from 'react-helmet-async';
import brand from '../../config/brand.config';
import { canonicalUrl } from '../../config/seo.config';

export default function Seo({
  title = brand.seoTitle,
  description = brand.seoDescription,
  path = '/',
  image = brand.ogImage,
  jsonLd,
  robots = 'index, follow',
}) {
  const canonical = canonicalUrl(path);
  const ogImage = image.startsWith('http') ? image : `${brand.siteUrl}${image}`;

  return (
    <Helmet>
      <html lang="en-IN" />
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={brand.keywords.join(', ')} />
      <meta name="robots" content={robots} />
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
      <meta property="og:image:alt" content={`${brand.name} in ${brand.city}, ${brand.district}`} />

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
