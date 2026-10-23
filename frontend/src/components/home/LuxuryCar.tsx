import { useId } from 'react'

/*
 * A long luxury saloon, side on, facing right, drawn for the home page's
 * arrival sequence. Everything shares one coordinate system (1200 × 420, ground
 * at y = 356) so the rear door, drawn separately to turn in 3D, lines up with
 * the doorway it covers.
 */

export const CAR_VIEWBOX = { width: 1200, height: 420 }

const BODY =
  'M92 300C84 284 82 250 86 226C88 214 96 206 112 203C170 199 260 196 338 193C372 190 400 178 432 156C470 130 520 114 580 110C640 106 700 108 742 114C776 120 808 148 846 186C856 194 866 198 884 200C960 204 1050 210 1100 216C1114 218 1122 228 1122 246L1121 290C1120 310 1110 322 1090 326L980 326A78 78 0 1 0 840 326L370 326A78 78 0 1 0 230 326L130 324C110 322 96 314 92 300Z'
const GLASS = 'M446 194C468 158 510 130 562 124C612 118 690 118 734 124C760 128 788 156 816 194Z'
/** The rear door, which is also the shape of the doorway behind it. */
const DOOR = 'M636 121L636 324L456 324C449 324 444 318 444 310L444 198C468 160 502 136 540 127C570 122 604 121 636 121Z'
const DOOR_GLASS = 'M630 128L630 192L452 192C474 158 506 138 542 131C572 127 600 128 630 128Z'

/** Where the rear door sits on the car, in viewBox units. */
export const DOOR_BOX = { x: 444, y: 121, width: 192, height: 203 }

const GOLD = '#c9ae7f'
const LIGHT = '#f6ecd6'

function Paint({ id }: { id: string }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="0" y1="108" x2="0" y2="330">
      <stop offset="0" stopColor="#2a2f38" />
      <stop offset="0.38" stopColor="#151920" />
      <stop offset="0.52" stopColor="#0b0d11" />
      <stop offset="1" stopColor="#050608" />
    </linearGradient>
  )
}

function GlassFill({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stopColor="#1b212b" />
      <stop offset="0.5" stopColor="#090b0f" />
      <stop offset="1" stopColor="#11151b" />
    </linearGradient>
  )
}

function Wheel({ cx, rim }: { cx: number; rim: string }) {
  const spokes = Array.from({ length: 10 }, (_, index) => {
    const angle = (index / 10) * Math.PI * 2
    return { x1: cx + Math.cos(angle) * 12, y1: 292 + Math.sin(angle) * 12, x2: cx + Math.cos(angle) * 42, y2: 292 + Math.sin(angle) * 42 }
  })
  return (
    <g>
      <circle cx={cx} cy="292" r="64" fill="#07080a" />
      <circle cx={cx} cy="292" r="58" fill="none" stroke="#1d2129" strokeWidth="6" />
      {/* Turned by the scroll: the rim spins about its own centre. */}
      <g className="car-wheel" style={{ transformOrigin: `${cx}px 292px` }}>
        <circle cx={cx} cy="292" r="46" fill={`url(#${rim})`} stroke={GOLD} strokeOpacity="0.55" strokeWidth="1.2" />
        <g stroke={GOLD} strokeOpacity="0.5" strokeWidth="2.4" strokeLinecap="round">
          {spokes.map((spoke, index) => (
            <line key={index} {...spoke} />
          ))}
        </g>
        <circle cx={cx} cy="292" r="11" fill="#0d1014" stroke={GOLD} strokeOpacity="0.7" strokeWidth="1.2" />
      </g>
      <circle cx={cx} cy="292" r="3" fill={GOLD} fillOpacity="0.8" />
    </g>
  )
}

/**
 * The car without its rear door: through the doorway, `cabin` (an image URL)
 * shows the rear seats in warm light. The door is drawn over it by `RearDoor`.
 */
export function CarBody({ cabin, className = '' }: { cabin?: string; className?: string }) {
  const id = useId().replace(/:/g, '')
  const paint = `${id}-paint`
  const glass = `${id}-glass`
  const rim = `${id}-rim`
  const doorway = `${id}-doorway`
  return (
    <svg viewBox={`0 0 ${CAR_VIEWBOX.width} ${CAR_VIEWBOX.height}`} className={className} aria-hidden>
      <defs>
        <Paint id={paint} />
        <GlassFill id={glass} />
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.16" />
          <stop offset="0.6" stopColor="#fff" stopOpacity="0.04" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={rim} cx="0.4" cy="0.35" r="0.8">
          <stop offset="0" stopColor="#2b3038" />
          <stop offset="1" stopColor="#0c0e12" />
        </radialGradient>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={LIGHT} stopOpacity="0.55" />
          <stop offset="1" stopColor={LIGHT} stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-warm`} cx="0.5" cy="0.55" r="0.7">
          <stop offset="0" stopColor="#ffd99a" stopOpacity="0.18" />
          <stop offset="1" stopColor="#1a0f05" stopOpacity="0.55" />
        </radialGradient>
        <clipPath id={doorway}>
          <path d={DOOR} />
        </clipPath>
      </defs>

      <path d="M1118 228L1200 196L1200 268Z" fill={`url(#${id}-beam)`} />
      <ellipse cx="610" cy="352" rx="520" ry="10" fill="#000" opacity="0.7" />
      <path d={BODY} fill={`url(#${paint})`} />
      <path d="M110 238C330 230 760 230 1100 244" fill="none" stroke={`url(#${id}-sheen)`} strokeWidth="18" opacity="0.9" />
      <path d={GLASS} fill={`url(#${glass})`} />
      <path d="M446 194C468 158 510 130 562 124C612 118 690 118 734 124C760 128 788 156 816 194" fill="none" stroke={GOLD} strokeOpacity="0.55" strokeWidth="2" />
      <path d="M440 196H826" stroke={GOLD} strokeOpacity="0.7" strokeWidth="2.2" />
      <path d="M630 124V194" stroke="#06070a" strokeWidth="11" />
      <path d="M520 135C560 128 600 126 640 126" stroke="#fff" strokeOpacity="0.08" strokeWidth="5" />
      <path d={BODY} fill="none" stroke={GOLD} strokeOpacity="0.45" strokeWidth="1.6" />
      <g fill="none" stroke={GOLD} strokeWidth="1.3" strokeOpacity="0.45">
        <path d="M636 196V322" />
        <path d="M826 198C832 230 834 270 830 322" />
        <path d="M100 236C330 228 760 228 1104 242" />
        <path d="M104 286C140 290 200 292 222 292" />
        <path d="M1000 296C1040 298 1080 300 1112 298" />
      </g>
      <path d="M374 318H836" stroke={GOLD} strokeOpacity="0.35" strokeWidth="2.5" />
      <rect x="776" y="232" width="34" height="5" rx="2.5" fill={GOLD} fillOpacity="0.85" />
      <path d="M806 180C812 170 830 168 842 176L846 190L816 194Z" fill="#0d1014" stroke={GOLD} strokeOpacity="0.5" />
      <path d="M1076 220C1092 220 1110 224 1120 232L1116 240C1104 236 1088 234 1072 234Z" fill={LIGHT} />
      <path d="M1066 248H1114" stroke={LIGHT} strokeOpacity="0.75" strokeWidth="2" />
      <g stroke={GOLD} strokeOpacity="0.55" strokeWidth="1.4">
        <path d="M1112 252V286" />
        <path d="M1116 252V286" />
        <path d="M1120 254V284" />
      </g>
      <path d="M88 214C96 210 108 208 118 208L118 226C106 226 96 228 88 232Z" fill="#8b1d24" />
      <path d="M90 220H116" stroke="#ff5a5f" strokeOpacity="0.6" strokeWidth="1.5" />
      <path d="M120 318H160" stroke={GOLD} strokeOpacity="0.5" strokeWidth="3" strokeLinecap="round" />
      <Wheel cx={300} rim={rim} />
      <Wheel cx={910} rim={rim} />

      {/* The doorway: dark until the cabin picture is there, then the rear seats in warm light. */}
      <g clipPath={`url(#${doorway})`}>
        <rect x="440" y="118" width="200" height="210" fill="#0b0805" />
        {cabin ? <image href={cabin} x="380" y="96" width="330" height="248" preserveAspectRatio="xMidYMid slice" opacity="0.92" /> : null}
        <rect x="440" y="118" width="200" height="210" fill={`url(#${id}-warm)`} />
      </g>
    </svg>
  )
}

/** The rear door on its own, in the car's coordinates, to be turned on its hinge (its right edge). */
export function RearDoor({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '')
  return (
    <svg viewBox={`${DOOR_BOX.x} ${DOOR_BOX.y} ${DOOR_BOX.width} ${DOOR_BOX.height}`} className={className} aria-hidden>
      <defs>
        <Paint id={`${id}-paint`} />
        <GlassFill id={`${id}-glass`} />
      </defs>
      <path d={DOOR} fill={`url(#${id}-paint)`} stroke={GOLD} strokeOpacity="0.5" strokeWidth="1.3" />
      <path d={DOOR_GLASS} fill={`url(#${id}-glass)`} stroke={GOLD} strokeOpacity="0.55" strokeWidth="1.6" />
      <path d="M444 196H636" stroke={GOLD} strokeOpacity="0.7" strokeWidth="2.2" />
      <path d="M444 236C520 233 580 232 636 232" fill="none" stroke={GOLD} strokeOpacity="0.45" strokeWidth="1.3" />
      <rect x="588" y="232" width="34" height="5" rx="2.5" fill={GOLD} fillOpacity="0.85" />
      <path d="M456 318H636" stroke={GOLD} strokeOpacity="0.35" strokeWidth="2.5" />
    </svg>
  )
}
