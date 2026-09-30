/**
 * OrnamentalDivider – Inline SVG flourish inspired by the Gangaram logo
 * The decorative gold arch / scroll motif used as section dividers
 */
export default function OrnamentalDivider({ className = '', color = 'currentColor', width = 200 }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <svg
        width={width}
        height={width * 0.25}
        viewBox="0 0 200 50"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Center diamond */}
        <path
          d="M100 42 L108 34 L100 26 L92 34 Z"
          fill="url(#goldGrad)"
        />
        {/* Left scroll */}
        <path
          d="M92 34 Q70 34 60 24 Q50 14 30 18 Q20 20 18 28"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M18 28 Q16 34 22 36 Q28 38 30 32"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Extended left line */}
        <path
          d="M30 18 Q20 8 8 14"
          stroke="url(#goldGrad)"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
        {/* Right scroll (mirrored) */}
        <path
          d="M108 34 Q130 34 140 24 Q150 14 170 18 Q180 20 182 28"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M182 28 Q184 34 178 36 Q172 38 170 32"
          stroke="url(#goldGrad)"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        {/* Extended right line */}
        <path
          d="M170 18 Q180 8 192 14"
          stroke="url(#goldGrad)"
          strokeWidth="1"
          fill="none"
          strokeLinecap="round"
        />
        {/* Top center arch */}
        <path
          d="M85 26 Q100 8 115 26"
          stroke="url(#goldGrad)"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
        />
        {/* Small center dot */}
        <circle cx="100" cy="14" r="2" fill="url(#goldGrad)" />
        {/* Horizontal lines */}
        <line x1="5" y1="34" x2="88" y2="34" stroke="url(#goldGrad)" strokeWidth="0.5" opacity="0.5" />
        <line x1="112" y1="34" x2="195" y2="34" stroke="url(#goldGrad)" strokeWidth="0.5" opacity="0.5" />

        <defs>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#A67C4A" />
            <stop offset="50%" stopColor="#E9C27F" />
            <stop offset="100%" stopColor="#A67C4A" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
}
