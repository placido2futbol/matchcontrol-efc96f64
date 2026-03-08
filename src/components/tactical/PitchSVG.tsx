export default function PitchSVG() {
  return (
    <svg viewBox="0 0 1050 680" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid meet">
      {/* Background */}
      <defs>
        <pattern id="grass" patternUnits="userSpaceOnUse" width="40" height="40">
          <rect width="40" height="40" fill="hsl(145, 55%, 28%)" />
          <rect x="0" y="0" width="20" height="40" fill="hsl(145, 55%, 26%)" />
        </pattern>
      </defs>
      <rect width="1050" height="680" fill="url(#grass)" rx="8" />
      
      {/* Field outline */}
      <rect x="40" y="40" width="970" height="600" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2.5" />
      
      {/* Center line */}
      <line x1="525" y1="40" x2="525" y2="640" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      
      {/* Center circle */}
      <circle cx="525" cy="340" r="80" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <circle cx="525" cy="340" r="4" fill="rgba(255,255,255,0.7)" />
      
      {/* Left penalty area */}
      <rect x="40" y="160" width="150" height="360" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <rect x="40" y="240" width="55" height="200" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <circle cx="155" cy="340" r="4" fill="rgba(255,255,255,0.7)" />
      <path d="M 190 240 A 80 80 0 0 1 190 440" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      
      {/* Right penalty area */}
      <rect x="860" y="160" width="150" height="360" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <rect x="955" y="240" width="55" height="200" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <circle cx="895" cy="340" r="4" fill="rgba(255,255,255,0.7)" />
      <path d="M 860 240 A 80 80 0 0 0 860 440" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      
      {/* Corner arcs */}
      <path d="M 40 50 A 10 10 0 0 1 50 40" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <path d="M 1000 40 A 10 10 0 0 1 1010 50" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <path d="M 50 640 A 10 10 0 0 1 40 630" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      <path d="M 1010 630 A 10 10 0 0 1 1000 640" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth="2" />
      
      {/* Goals */}
      <rect x="25" y="290" width="15" height="100" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" rx="2" />
      <rect x="1010" y="290" width="15" height="100" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" rx="2" />
    </svg>
  );
}
