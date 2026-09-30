import brand from '../../config/brand.config';

const trustItems = [
  'Pure desi ghee',
  'Made fresh daily',
  `${brand.yearsOfTrust}+ years`,
  `Free delivery over ₹${brand.freeDeliveryAbove}`,
];

export default function TrustStrip() {
  return (
    <section className="border-y border-cream-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-10 gap-y-3 px-5 py-5 sm:px-8">
        {trustItems.map((item) => (
          <span
            key={item}
            className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted"
          >
            {item}
          </span>
        ))}
      </div>
    </section>
  );
}
