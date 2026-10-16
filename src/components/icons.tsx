/*
 * 华语 Lah! icon set — 24×24, 1.8px rounded strokes in currentColor,
 * with a soft tinted fill (".duo") on the main shape. Keep new icons in this style.
 */
import type { ReactNode } from 'react'

function Svg({ children, className = 'h-6 w-6', strokeWidth = 1.8 }: { children: ReactNode; className?: string; strokeWidth?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`lah-icon ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  )
}

const DUO = { fill: 'currentColor', fillOpacity: 0.16 }
const DOT = { fill: 'currentColor', stroke: 'none' }
const HOLE = { fill: 'var(--color-surface)' }

export const ICONS = {
  /** MRT strip map — the learn path */
  map: (
    <>
      <path d="M7 3v18" strokeWidth={2.6} />
      <circle cx="7" cy="6" r="2.3" style={HOLE} />
      <circle cx="7" cy="12" r="2.3" style={HOLE} />
      <circle cx="7" cy="18" r="2.3" style={HOLE} />
      <path d="M12.5 6h7.5M12.5 12h5M12.5 18h6.5" />
    </>
  ),
  cards: (
    <>
      <rect x="3.5" y="5.5" width="11" height="14" rx="2" transform="rotate(-10 9 12.5)" style={DUO} />
      <rect x="9" y="4" width="11.5" height="15.5" rx="2" style={HOLE} />
      <path d="M12.5 9h5M15 9v6.5M12.5 12.5h5" />
    </>
  ),
  book: (
    <>
      <path d="M3.5 5.5C6 4.5 9 4.5 12 6.5c3-2 6-2 8.5-1v13c-2.5-1-5.5-1-8.5 1-3-2-6-2-8.5-1z" style={DUO} />
      <path d="M12 6.5v13" />
    </>
  ),
  otter: (
    <>
      <circle cx="6.2" cy="7" r="2.2" />
      <circle cx="17.8" cy="7" r="2.2" />
      <circle cx="12" cy="13" r="8" style={HOLE} />
      <ellipse cx="12" cy="15.6" rx="4" ry="2.8" style={DUO} />
      <circle cx="9.2" cy="11.6" r="1.1" style={DOT} />
      <circle cx="14.8" cy="11.6" r="1.1" style={DOT} />
      <ellipse cx="12" cy="14.6" rx="1.4" ry="1" style={DOT} />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="6.2" style={DUO} />
      <circle cx="12" cy="12" r="2.6" />
      <path d="M12 2.8v2.4M12 18.8v2.4M2.8 12h2.4M18.8 12h2.4M5.5 5.5l1.7 1.7M16.8 16.8l1.7 1.7M5.5 18.5l1.7-1.7M16.8 7.2l1.7-1.7" />
    </>
  ),
  speaker: (
    <>
      <path d="M4 9.5h3.2L11.5 6v12l-4.3-3.5H4z" style={DUO} />
      <path d="M15 9.2a4 4 0 0 1 0 5.6M17.7 6.7a7.6 7.6 0 0 1 0 10.6" />
    </>
  ),
  mute: (
    <>
      <path d="M4 9.5h3.2L11.5 6v12l-4.3-3.5H4z" style={DUO} />
      <path d="M15.5 9.5l5 5M20.5 9.5l-5 5" />
    </>
  ),
  turtle: (
    <>
      <path d="M4.5 15a7.5 6.5 0 0 1 15 0z" style={DUO} />
      <path d="M9 15l1.4-3.2h3.2L15 15M10.4 11.8l-1-2.8M13.6 11.8l1-2.8" />
      <circle cx="21" cy="13.4" r="1.6" />
      <path d="M7.5 15v2.6M16.5 15v2.6M4.5 15L3 16" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" style={DUO} />
      <path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M9 21h6" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" strokeWidth={2.2} />,
  /** Reader: photograph a sign or menu */
  camera: (
    <>
      <path d="M4 8.5A1.5 1.5 0 0 1 5.5 7h2.3l1.6-2.2h5.2L16.2 7h2.3A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5z" style={DUO} />
      <circle cx="12" cy="12.8" r="3.4" style={HOLE} />
    </>
  ),
  /** Paste or type text */
  paste: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2" style={DUO} />
      <path d="M9 4.5V3.5h6v1M8.5 10h7M8.5 13.5h7M8.5 17h4" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" strokeWidth={2.2} />,
  back: <path d="M15 18l-6-6 6-6" strokeWidth={2.2} />,
  next: <path d="M9 6l6 6-6 6" strokeWidth={2.2} />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" strokeWidth={2.4} />,
  lock: (
    <>
      <rect x="5" y="10.5" width="14" height="10" rx="2.5" style={DUO} />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
      <circle cx="12" cy="15.5" r="1.2" style={DOT} />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" style={DUO} />,
  /** Red lantern — the streak */
  lantern: (
    <>
      <path d="M12 2.5v2M9 4.5h6" />
      <ellipse cx="12" cy="11.8" rx="6.6" ry="6.2" style={DUO} />
      <path d="M12 5.6v12.4M9 6.3q-2.4 5.5 0 11M15 6.3q2.4 5.5 0 11" />
      <path d="M9.5 18.2h5M12 18.2v3M10.8 21.5h2.4" />
    </>
  ),
  /** Old Chinese coin — XP */
  coin: (
    <>
      <circle cx="12" cy="12" r="8.5" style={DUO} />
      <circle cx="12" cy="12" r="6.2" />
      <rect x="9.8" y="9.8" width="4.4" height="4.4" rx="0.6" />
    </>
  ),
  kopi: (
    <>
      <path d="M5 9h11v4.5a5.5 5.5 0 0 1-11 0z" style={DUO} />
      <path d="M16 10.5h1.5a2.2 2.2 0 0 1 0 4.4H16M3.5 20.5h14M8 3.5q1.2 1.5 0 3M12 3.5q1.2 1.5 0 3" />
    </>
  ),
  /** Ice kacang — a streak freeze */
  freeze: (
    <>
      <path d="M4.5 13h15a7.5 6 0 0 1-15 0z" style={DUO} />
      <path d="M6 13q6-11 12 0M9.2 8.6l1 2M13.4 7.4l-.5 2.6M15.8 10l-1.1 1.2M9.5 19.5h5" />
    </>
  ),
  bulb: (
    <>
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.6.5 1 1.3 1 2.2h5.2c0-.9.4-1.7 1-2.2A6 6 0 0 0 12 3z" style={DUO} />
      <path d="M9.5 18.5h5M10.5 21h3" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0z" style={DUO} />
      <path d="M7 6H4.5a2.5 2.5 0 0 0 2.6 3.5M17 6h2.5a2.5 2.5 0 0 1-2.6 3.5M12 14v3.5M8.5 20.5h7M9.5 17.5h5v3h-5z" />
    </>
  ),
  crown: <path d="M4 18h16l-1.5-9-4.5 4-2-6-2 6-4.5-4z" style={DUO} />,
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.2" style={DUO} />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <circle cx="16.8" cy="9.6" r="2.6" />
      <path d="M14.8 14.4a4.6 4.6 0 0 1 6.4 4.4" />
    </>
  ),
  angbao: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" style={DUO} />
      <path d="M5 7.5l7 4.5 7-4.5" />
      <circle cx="12" cy="12.6" r="2.2" style={DOT} />
    </>
  ),
  train: (
    <>
      <rect x="5.5" y="3.5" width="13" height="14" rx="3.5" style={DUO} />
      <path d="M7.5 6.5h9V11h-9z" />
      <circle cx="8.8" cy="14.2" r="1" style={DOT} />
      <circle cx="15.2" cy="14.2" r="1" style={DOT} />
      <path d="M8 17.5l-2 3M16 17.5l2 3M7.5 20.5h9" />
    </>
  ),
  target: (
    <>
      <circle cx="12" cy="12" r="8.5" style={DUO} />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.6" style={DOT} />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h10a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-3.5 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z" style={DUO} />
      <path d="M18.5 9H20a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-.5v2.5L16.5 18H13a2 2 0 0 1-2-2v-.5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" style={DUO} />
      <path d="M16 16l4.5 4.5" />
    </>
  ),
  share: <path d="M12 3v12M8 7l4-4 4 4M5 12v6.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V12" />,
  refresh: <path d="M20 11a8 8 0 1 0-2.3 5.7M20 4.5V11h-6.5" />,
  sun: (
    <>
      <circle cx="12" cy="12" r="4" style={DUO} />
      <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" style={DUO} />,
  chart: <path d="M4 20h16M7 20v-6M12 20V8M17 20v-9" strokeWidth={2.4} />,
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" style={DUO} />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  sparkle: <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" style={DUO} />,
  brush: (
    <>
      <path d="M20 4l-9 9" strokeWidth={2.4} />
      <path d="M10.5 13.2q-3.2-.3-4.8 2.6T3.5 20.5q3.8.6 5.6-1.6t1.4-5.7z" style={DUO} />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12s3.5-6.5 9.5-6.5 9.5 6.5 9.5 6.5-3.5 6.5-9.5 6.5S2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" style={DUO} />
    </>
  ),
  cloud: <path d="M7 18.5h10a4 4 0 0 0 .6-8 6 6 0 0 0-11.5 1.5A3.3 3.3 0 0 0 7 18.5z" style={DUO} />,
  logout: <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4M10 8l-4 4 4 4M6 12h10" />,
  download: <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 20h14" />,
  upload: <path d="M12 15V4M7.5 8.5L12 4l4.5 4.5M5 20h14" />,
  play: <path d="M8 5.5v13l10-6.5z" style={DUO} />,
  warning: (
    <>
      <path d="M12 4l9 15.5H3z" style={DUO} />
      <path d="M12 10v4" />
      <circle cx="12" cy="16.8" r="0.9" style={DOT} />
    </>
  ),
  broom: (
    <>
      <path d="M14 3l-4.5 9" />
      <path d="M8 11.5l5.5 2.5-2 7H5.5l-.5-3z" style={DUO} />
      <path d="M8 21l1-4M11 21l.5-3.5" />
    </>
  ),
  question: (
    <>
      <circle cx="12" cy="12" r="8.5" style={DUO} />
      <path d="M9.5 9.5a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.6v.5" />
      <circle cx="12" cy="17" r="0.9" style={DOT} />
    </>
  ),

  // ---- unit icons ----
  coins: (
    <>
      <path d="M3.5 8.5c0 1.4 2.7 2.5 6 2.5s6-1.1 6-2.5S12.8 6 9.5 6s-6 1.1-6 2.5z" style={DUO} />
      <path d="M3.5 8.5v3c0 1.4 2.7 2.5 6 2.5M3.5 11.5v3c0 1.4 2.7 2.5 6 2.5M15.5 8.5v2" />
      <circle cx="16.5" cy="16" r="4.5" style={DUO} />
      <rect x="15.3" y="14.8" width="2.4" height="2.4" rx="0.4" />
    </>
  ),
  bowl: (
    <>
      <path d="M3.5 12h17a8.5 7 0 0 1-17 0z" style={DUO} />
      <path d="M9 19.5h6M13 11.5l7-8M15.8 11.8L21.5 5M7 9.5q1-1.5 0-3" />
    </>
  ),
  hdb: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" style={DUO} />
      <path d="M8 6.5h2M14 6.5h2M8 10h2M14 10h2M8 13.5h2M14 13.5h2M10.5 21v-3.5h3V21M19 8h2.5M19 11h2.5" />
    </>
  ),
  family: (
    <>
      <circle cx="6.8" cy="8" r="2.4" />
      <circle cx="17.2" cy="8" r="2.4" />
      <circle cx="12" cy="12" r="2" style={DUO} />
      <path d="M2.5 19a4.3 4.3 0 0 1 7-3.4M21.5 19a4.3 4.3 0 0 0-7-3.4M8.8 20a3.2 3.2 0 0 1 6.4 0" />
    </>
  ),
  briefcase: (
    <>
      <rect x="3.5" y="7.5" width="17" height="12" rx="2" style={DUO} />
      <path d="M9 7.5v-2A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5v2M3.5 12.5h17" />
    </>
  ),
  gradcap: (
    <>
      <path d="M2.5 9L12 4.5 21.5 9 12 13.5z" style={DUO} />
      <path d="M6.5 11v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3V11M21.5 9v5" />
    </>
  ),
  lah: (
    <>
      <path d="M5 4.5h14a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-7l-4.5 3.5v-3.5H5A2.5 2.5 0 0 1 2.5 14V7A2.5 2.5 0 0 1 5 4.5z" style={DUO} />
      <circle cx="8" cy="10.5" r="1.1" style={DOT} />
      <circle cx="12" cy="10.5" r="1.1" style={DOT} />
      <circle cx="16" cy="10.5" r="1.1" style={DOT} />
    </>
  ),
  satay: (
    <>
      <path d="M3.5 20.5l17-17" />
      <rect x="6.5" y="13" width="5" height="4" rx="1.2" transform="rotate(-45 9 15)" style={DUO} />
      <rect x="9.5" y="10" width="5" height="4" rx="1.2" transform="rotate(-45 12 12)" style={DUO} />
      <rect x="12.5" y="7" width="5" height="4" rx="1.2" transform="rotate(-45 15 9)" style={DUO} />
    </>
  ),
  estate: (
    <>
      <rect x="2.5" y="8" width="7" height="12.5" rx="1" style={DUO} />
      <rect x="9.5" y="4" width="7" height="16.5" rx="1" style={DUO} />
      <path d="M4.5 11h3M4.5 14h3M11.5 7h3M11.5 10h3M11.5 13h3M19.5 20.5v-3" />
      <circle cx="19.5" cy="15" r="2.6" />
      <path d="M1.5 20.5h21" />
    </>
  ),
  megaphone: (
    <>
      <path d="M4 10v4h3l8.5 4.5v-13L7 10z" style={DUO} />
      <path d="M7 14l1.5 5h2.5l-1-4.5M18.5 9.5q1.6 2.5 0 5" />
    </>
  ),
  skyline: (
    <>
      <rect x="4.5" y="9" width="3.2" height="11.5" rx="0.6" style={DUO} />
      <rect x="9.4" y="9" width="3.2" height="11.5" rx="0.6" style={DUO} />
      <rect x="14.3" y="9" width="3.2" height="11.5" rx="0.6" style={DUO} />
      <path d="M3 8.5q8.5-2.2 16 0l1.6-1.2M2 20.5h20" />
      <path d="M20 20.5v-4M18.6 15.8h2.8" />
    </>
  ),
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof ICONS

export function Icon({ name, className, strokeWidth }: { name: IconName; className?: string; strokeWidth?: number }) {
  return (
    <Svg className={className} strokeWidth={strokeWidth}>
      {ICONS[name]}
    </Svg>
  )
}

/** Unit codes (like MRT line codes) and icons. */
export const UNIT_META: Record<string, { code: string; icon: IconName }> = {
  u01: { code: 'RB', icon: 'book' },
  u02: { code: 'NM', icon: 'coins' },
  u03: { code: 'HK', icon: 'bowl' },
  u04: { code: 'GA', icon: 'train' },
  u05: { code: 'HH', icon: 'hdb' },
  u06: { code: 'FP', icon: 'family' },
  u07: { code: 'WA', icon: 'briefcase' },
  u08: { code: 'SN', icon: 'gradcap' },
  u09: { code: 'FC', icon: 'angbao' },
  u10: { code: 'TL', icon: 'lah' },
  u11: { code: 'ML', icon: 'satay' },
  u12: { code: 'HL', icon: 'estate' },
  u13: { code: 'KT', icon: 'megaphone' },
  u14: { code: 'AS', icon: 'skyline' },
}

export function unitMeta(unitId: string) {
  return UNIT_META[unitId] ?? { code: unitId.toUpperCase(), icon: 'map' as IconName }
}

/** Small Singapore flag (crescent and five stars), for the "SG word" badge. */
export function SgFlag({ className = 'h-3 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 18 12" className={className} aria-hidden>
      <rect width="18" height="12" rx="1.5" fill="#fff" stroke="#e5d9d7" strokeWidth="0.5" />
      <path d="M0 1.5A1.5 1.5 0 0 1 1.5 0h15A1.5 1.5 0 0 1 18 1.5V6H0z" fill="#cf4136" />
      <circle cx="4" cy="3" r="2.1" fill="#fff" />
      <circle cx="4.9" cy="3" r="1.9" fill="#cf4136" />
      {[
        [7.2, 1.4],
        [8.6, 2.3],
        [8.1, 4],
        [6.3, 4],
        [5.8, 2.3],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="0.45" fill="#fff" />
      ))}
    </svg>
  )
}
