// Tiny cartoon CRT — used as the "Back" button icon when the user is
// inside JMAtv routes. Echoes the big RetroTV on the Home page (wood-
// grain frame, rabbit ears, red ON AIR dot, glowing screen) but scaled
// to fit inside the standard 48/56/80px header button box.
//
// Pure inline SVG so it works everywhere without extra assets and the
// stroke color inherits from currentColor (matches HarpIcon's contract).

export default function RetroTVIcon({ className = '' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ width: '100%', height: '100%', display: 'block' }}
      aria-hidden="true"
      focusable="false"
    >
      {/* Rabbit ear antennas (behind body) */}
      <g stroke="#E5E7EB" strokeWidth="2.5" strokeLinecap="round">
        <line x1="24" y1="14" x2="18" y2="4" />
        <line x1="40" y1="14" x2="46" y2="4" />
        {/* ear tips */}
        <circle cx="18" cy="4" r="1.6" fill="#E5E7EB" stroke="none" />
        <circle cx="46" cy="4" r="1.6" fill="#E5E7EB" stroke="none" />
      </g>

      {/* Wood-grain TV body */}
      <rect
        x="6" y="12" width="52" height="42" rx="6"
        fill="#A0673A"
        stroke="#0A2540"
        strokeWidth="2.5"
      />
      {/* Wood-grain streaks */}
      <g stroke="#6B4423" strokeWidth="0.8" opacity="0.55">
        <line x1="10" y1="18" x2="54" y2="18" />
        <line x1="10" y1="24" x2="54" y2="24" />
        <line x1="10" y1="46" x2="54" y2="46" />
      </g>

      {/* Screen bezel */}
      <rect
        x="10" y="17" width="38" height="28" rx="3"
        fill="#0A2540"
        stroke="#0A2540"
        strokeWidth="1"
      />
      {/* Screen — glowing blue */}
      <rect
        x="12" y="19" width="34" height="24" rx="2"
        fill="#00A8E8"
      />
      {/* Play triangle on screen — recognizable "video" cue */}
      <polygon
        points="25,25 25,37 36,31"
        fill="#FFFFFF"
        stroke="#0A2540"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      {/* Screen glare */}
      <path
        d="M 13 21 L 22 21 L 15 33 L 13 33 Z"
        fill="#FFFFFF"
        opacity="0.18"
      />

      {/* Speaker grille + knobs on the right */}
      <g fill="#0A2540">
        <circle cx="52" cy="24" r="2" />
        <circle cx="52" cy="30" r="2" />
      </g>
      {/* ON AIR red dot */}
      <circle cx="52" cy="40" r="2.4" fill="#FF3B30" stroke="#0A2540" strokeWidth="1" />

      {/* Base feet */}
      <rect x="16" y="54" width="8" height="4" rx="1.5" fill="#0A2540" />
      <rect x="40" y="54" width="8" height="4" rx="1.5" fill="#0A2540" />
    </svg>
  );
}
