export default function OrnamentalDivider({ className = '', width = 72 }) {
  return (
    <div className={`flex items-center justify-center ${className}`} aria-hidden="true">
      <span className="block h-px bg-gold-400/80" style={{ width }} />
    </div>
  );
}
