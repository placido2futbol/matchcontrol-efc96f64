export default function HalfPitchSVG() {
  return (
    <svg viewBox="0 0 1050 750" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Background grass */}
      <defs>
        <pattern id="grass-half" patternUnits="userSpaceOnUse" width="40" height="40">
          <rect width="40" height="40" fill="hsl(145, 55%, 28%)" />
          <rect x="0" y="0" width="20" height="40" fill="hsl(145, 55%, 26%)" />
        </pattern>
      </defs>
      <rect width="1050" height="750" fill="url(#grass-half)" rx="8" />

      {/* Field outline (half pitch) */}
      <rect x="60" y="40" width="930" height="670" fill="none" stroke="rgba(255,255,255,0.75)" strokeWidth="2.5" />

      {/* Goal at top */}
      <rect x="425" y="18" width="200" height="22" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" rx="2" />

      {/* 6-yard box */}
      <rect x="355" y="40" width="340" height="75" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />

      {/* Penalty area */}
      <rect x="210" y="40" width="630" height="210" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />

      {/* Penalty spot */}
      <circle cx="525" cy="190" r="4" fill="rgba(255,255,255,0.7)" />

      {/* Penalty arc */}
      <path d="M 380 250 A 120 120 0 0 0 670 250" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />

      {/* Center line (bottom of half pitch) */}
      <line x1="60" y1="710" x2="990" y2="710" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />

      {/* Center circle arc (only top half visible) */}
      <path d="M 415 710 A 110 110 0 0 1 635 710" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <circle cx="525" cy="710" r="4" fill="rgba(255,255,255,0.7)" />

      {/* Corner arcs */}
      <path d="M 60 52 A 12 12 0 0 1 72 40" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <path d="M 978 40 A 12 12 0 0 1 990 52" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
    </svg>
  );
}
