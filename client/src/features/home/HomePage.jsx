import Seo from '../../components/seo/Seo';
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
      <Seo path="/" />

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
