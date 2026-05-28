// Phase 6.5: bespoke SVG art for all 10 Knowmad Levels, mirroring the web
// frontend's `public/knowmad/rank-badges/` set. Bundled as inline XML so
// react-native-svg's SvgXml can render them without Metro asset config.

export const KNOWMAD_RANK_TITLES: Record<number, string> = {
  1: "Initiate",
  2: "Explorer",
  3: "Seeker",
  4: "Pathfinder",
  5: "Sage",
  6: "Wayfinder",
  7: "Trailblazer",
  8: "Pioneer",
  9: "Luminary",
  10: "Grandmaster Knowmad",
};

export const KNOWMAD_RANK_COLORS: Record<number, string> = {
  1: "#64748b",
  2: "#059669",
  3: "#0e7490",
  4: "#1d4ed8",
  5: "#6d28d9",
  6: "#3730a3",
  7: "#b91c1c",
  8: "#0f766e",
  9: "#7e22ce",
  10: "#b45309",
};

export const KNOWMAD_RANK_SVGS: Record<number, string> = {
  1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#cbd5e1"/>
      <stop offset="100%" stop-color="#475569"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#94a3b8" stroke-width="0.5" opacity="0.5"/>
  <text x="16" y="21" text-anchor="middle" font-family="system-ui,sans-serif" font-size="13" font-weight="700" fill="white" opacity="0.95">I</text>
</svg>`,

  2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="100%" stop-color="#047857"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#34d399" stroke-width="0.5" opacity="0.4"/>
  <g fill="white" opacity="0.95">
    <polygon points="16,7 17.5,14.5 16,13 14.5,14.5"/>
    <polygon points="16,25 14.5,17.5 16,19 17.5,17.5" opacity="0.5"/>
    <polygon points="7,16 14.5,14.5 13,16 14.5,17.5" opacity="0.5"/>
    <polygon points="25,16 17.5,17.5 19,16 17.5,14.5" opacity="0.5"/>
  </g>
  <circle cx="16" cy="16" r="2" fill="white" opacity="0.9"/>
</svg>`,

  3: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#67e8f9"/>
      <stop offset="100%" stop-color="#0e7490"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#22d3ee" stroke-width="0.5" opacity="0.4"/>
  <circle cx="14.5" cy="14.5" r="5" fill="none" stroke="white" stroke-width="2.2" opacity="0.95"/>
  <line x1="18.5" y1="18.5" x2="22" y2="22" stroke="white" stroke-width="2.2" stroke-linecap="round" opacity="0.95"/>
</svg>`,

  4: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#93c5fd"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#60a5fa" stroke-width="0.5" opacity="0.4"/>
  <polygon points="16,8 23,16 16,24 9,16" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round" opacity="0.95"/>
  <polygon points="16,11 20,16 16,21 12,16" fill="white" opacity="0.6"/>
</svg>`,

  5: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#c4b5fd"/>
      <stop offset="100%" stop-color="#6d28d9"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#a78bfa" stroke-width="0.5" opacity="0.4"/>
  <polygon points="16,7 17.91,13.09 24.51,13.09 19.29,16.91 21.21,23 16,19.18 10.79,23 12.71,16.91 7.49,13.09 14.09,13.09" fill="white" opacity="0.95"/>
</svg>`,

  6: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#a5b4fc"/>
      <stop offset="100%" stop-color="#3730a3"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#818cf8" stroke-width="0.5" opacity="0.4"/>
  <g fill="white" opacity="0.95">
    <polygon points="16,7 17.2,14.8 16,13 14.8,14.8"/>
    <polygon points="16,25 14.8,17.2 16,19 17.2,17.2"/>
    <polygon points="7,16 14.8,17.2 13,16 14.8,14.8"/>
    <polygon points="25,16 17.2,14.8 19,16 17.2,17.2"/>
    <polygon points="9.5,9.5 15.3,15.3 13.6,13.6 13.6,15.3" opacity="0.6"/>
    <polygon points="22.5,9.5 16.7,15.3 18.4,13.6 18.4,15.3" opacity="0.6"/>
    <polygon points="9.5,22.5 15.3,16.7 13.6,18.4 15.3,18.4" opacity="0.6"/>
    <polygon points="22.5,22.5 16.7,16.7 18.4,18.4 16.7,18.4" opacity="0.6"/>
  </g>
  <circle cx="16" cy="16" r="2.5" fill="white" opacity="0.9"/>
</svg>`,

  7: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fdba74"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#fb923c" stroke-width="0.5" opacity="0.4"/>
  <path d="M16 25 C11 22 9 18 11 14 C12 11 14 10 13 7 C16 9 17 11 15 13 C18 11 19 8 21 7 C22 11 20 14 22 17 C23 20 21 23 16 25 Z" fill="white" opacity="0.95"/>
  <path d="M16 22 C14 20 13 18 14.5 16 C15.5 15 16 14.5 16 22 Z" fill="#fdba74" opacity="0.6"/>
</svg>`,

  8: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#5eead4"/>
      <stop offset="100%" stop-color="#0f766e"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ccfbf1" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#ccfbf1" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="15" fill="url(#glow)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#5eead4" stroke-width="0.5" opacity="0.45"/>
  <path d="M5 23 L11 14 L15 19 L17 17 L21 22 L26 16 L27 23 Z" fill="white" opacity="0.4"/>
  <path d="M6 25 L13 11 L17 18 L20 14 L26 25 Z" fill="white" opacity="0.95"/>
  <path d="M11.5 16 L13 11 L15 15 L16.5 13 L17 18 Z" fill="#ccfbf1" opacity="0.7"/>
  <line x1="13" y1="12" x2="13" y2="7" stroke="white" stroke-width="0.6"/>
  <path d="M13 7 L17 8 L13 9.5 Z" fill="#5eead4" opacity="0.95"/>
</svg>`,

  9: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#d8b4fe"/>
      <stop offset="100%" stop-color="#7e22ce"/>
    </radialGradient>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#faf5ff" stop-opacity="0.55"/>
      <stop offset="55%" stop-color="#faf5ff" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="#faf5ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="core" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="60%" stop-color="#faf5ff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#e9d5ff" stop-opacity="0.4"/>
    </radialGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="15" fill="url(#halo)"/>
  <circle cx="16" cy="16" r="13" fill="none" stroke="#e9d5ff" stroke-width="0.5" opacity="0.5"/>
  <path d="M16 4 L17 14 L16 16 L15 14 Z" fill="white" opacity="0.9"/>
  <path d="M16 28 L17 18 L16 16 L15 18 Z" fill="white" opacity="0.9"/>
  <path d="M4 16 L14 15 L16 16 L14 17 Z" fill="white" opacity="0.9"/>
  <path d="M28 16 L18 15 L16 16 L18 17 Z" fill="white" opacity="0.9"/>
  <path d="M7.5 7.5 L14.5 14.5 L16 16 L14.5 14.5 Z" fill="white" opacity="0.7"/>
  <path d="M24.5 7.5 L17.5 14.5 L16 16 L17.5 14.5 Z" fill="white" opacity="0.7"/>
  <path d="M7.5 24.5 L14.5 17.5 L16 16 L14.5 17.5 Z" fill="white" opacity="0.7"/>
  <path d="M24.5 24.5 L17.5 17.5 L16 16 L17.5 17.5 Z" fill="white" opacity="0.7"/>
  <circle cx="16" cy="16" r="4.5" fill="url(#core)"/>
  <circle cx="16" cy="16" r="2.2" fill="#ffffff"/>
</svg>`,

  10: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
  <defs>
    <radialGradient id="g" cx="40%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#fde68a"/>
      <stop offset="100%" stop-color="#b45309"/>
    </radialGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#fef3c7" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="crown-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="1"/>
      <stop offset="100%" stop-color="#fef3c7" stop-opacity="0.92"/>
    </linearGradient>
  </defs>
  <circle cx="16" cy="16" r="15" fill="url(#g)"/>
  <circle cx="16" cy="16" r="15" fill="url(#glow)"/>
  <circle cx="16" cy="16" r="13.5" fill="none" stroke="#fbbf24" stroke-width="0.8" opacity="0.7"/>
  <circle cx="16" cy="16" r="12" fill="none" stroke="#fef3c7" stroke-width="0.3" opacity="0.4"/>
  <path d="M6 18 Q5 14 7 11 Q8 13 8 15 Q9 14 10 14 Q9 16 8 17 Q9 17 10 17 Q9 18 8 19 Q9 19 10 19 Q9 20 8 20 Z" fill="#fef3c7" opacity="0.55"/>
  <path d="M26 18 Q27 14 25 11 Q24 13 24 15 Q23 14 22 14 Q23 16 24 17 Q23 17 22 17 Q23 18 24 19 Q23 19 22 19 Q23 20 24 20 Z" fill="#fef3c7" opacity="0.55"/>
  <path d="M8 21 L8 16 L11.5 19.5 L16 12 L20.5 19.5 L24 16 L24 21 Z" fill="url(#crown-grad)" stroke="white" stroke-linejoin="round" stroke-width="0.5"/>
  <rect x="8" y="21" width="16" height="2.6" rx="1.2" fill="url(#crown-grad)"/>
  <circle cx="16" cy="13.5" r="1.4" fill="#fbbf24"/>
  <circle cx="16" cy="13.5" r="0.6" fill="#fef3c7" opacity="0.9"/>
  <circle cx="11.5" cy="18.3" r="1.1" fill="#fbbf24" opacity="0.85"/>
  <circle cx="20.5" cy="18.3" r="1.1" fill="#fbbf24" opacity="0.85"/>
  <circle cx="9.5" cy="22.3" r="0.7" fill="#b45309" opacity="0.8"/>
  <circle cx="22.5" cy="22.3" r="0.7" fill="#b45309" opacity="0.8"/>
  <path d="M16 9 L16.6 10.6 L18.3 10.7 L17 11.7 L17.5 13.3 L16 12.3 L14.5 13.3 L15 11.7 L13.7 10.7 L15.4 10.6 Z" fill="#ffffff" opacity="0.95"/>
</svg>`,
};

export function clampKnowmadLevel(level: number | null | undefined): number {
  if (!Number.isFinite(level ?? NaN)) return 1;
  return Math.max(1, Math.min(10, Math.round(level as number)));
}
