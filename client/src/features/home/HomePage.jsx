import { Helmet } from 'react-helmet-async';
import brand from '../../config/brand.config';
import Hero from './Hero';
import TrustStrip from './TrustStrip';
import CategoryShowcase from './CategoryShowcase';
import Bestsellers from './Bestsellers';
import FestiveBoxes from './FestiveBoxes';
import OurStoryTeaser from './OurStoryTeaser';
import Testimonials from './Testimonials';
import CTABand from './CTABand';

export default function HomePage() {
  return (
    <>
      <Helmet>
        <title>{brand.name} — {brand.tagline} | Best Sweets in {brand.city}</title>
        <meta
          name="description"
          content={`${brand.name} – ${brand.description}. Order online for delivery in ${brand.city}.`}
        />
        <meta property="og:title" content={`${brand.name} — ${brand.tagline}`} />
        <meta property="og:description" content={brand.description} />
        <meta property="og:type" content="website" />
        <link rel="canonical" href={brand.siteUrl} />
      </Helmet>

      <div>
        <Hero />
        <div className="relative z-10 overflow-x-clip">
        <TrustStrip />
        <CategoryShowcase />
        <Bestsellers />
        <FestiveBoxes />
        <OurStoryTeaser />
        <Testimonials />
        <CTABand />
        </div>
      </div>
    </>
  );
}
