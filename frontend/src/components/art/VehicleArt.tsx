import type { BodyType } from '@/lib/types'

/**
 * Line drawings of each vehicle type, side on. They inherit the text colour, so
 * they work on light and dark surfaces alike.
 *
 * To show a photograph instead, set `image_url` on the vehicle in the database
 * (for example `/images/fleet/s-class.jpg`, with the file in `public/`).
 */

interface Shape {
  /** Body outline, including the wheel arches. */
  body: string
  /** Glass areas. */
  glass: string[]
  /** Door seams, trim lines, lights and handles. */
  details: string[]
  /** Wheel centres on the x axis, the shared y, and the tyre radius. */
  wheels: { x: [number, number]; y: number; r: number }
}

/*
 * Drawn to scale from real dimensions (length, height, wheelbase, overhangs):
 * 70 units per metre for the cars and the van, 54 for the longer minibus.
 * Every vehicle stands on the same ground line (y = 158).
 */
const SHAPES: Record<BodyType, Shape> = {
  sedan: {
    body: 'M27 134C24 122 25 106 33 96L82 87C104 69 134 57 170 55L216 55C250 57 276 71 298 88L350 102C366 106 373 116 373 130L371 142H339A27 27 0 1 0 287 142H132A27 27 0 1 0 80 142H29Z',
    glass: ['M102 88C116 74 140 64 170 61L196 61L194 88Z', 'M202 61L215 61C242 63 264 74 282 88L200 88Z'],
    details: [
      'M197 88V138',
      'M284 90C288 106 288 122 284 138',
      'M128 88C123 102 125 114 133 124',
      'M40 108C150 102 262 104 360 114',
      'M354 106L369 114',
      'M29 102L45 98',
      'M150 98h12',
      'M232 98h12',
      'M276 86l10-3 2 6-10 2z',
    ],
    wheels: { x: [106, 313], y: 134, r: 24 },
  },
  limousine: {
    body: 'M16 134C13 122 14 106 22 96L78 86C100 68 130 56 168 54L222 54C256 56 284 70 306 88L362 102C378 106 386 116 386 130L384 142H349A27 27 0 1 0 297 142H125A27 27 0 1 0 73 142H18Z',
    glass: ['M98 88C110 76 124 68 144 63L142 88Z', 'M150 62L198 60L196 88L148 88Z', 'M204 60L220 60C248 62 272 74 290 88L202 88Z'],
    details: [
      'M199 88V138',
      'M145 88V136',
      'M292 90C296 106 296 122 292 138',
      'M30 108C150 102 270 104 372 114',
      'M366 106L382 114',
      'M18 102L34 98',
      'M158 98h12',
      'M238 98h12',
      'M284 86l10-3 2 6-10 2z',
    ],
    wheels: { x: [99, 323], y: 134, r: 24 },
  },
  hatchback: {
    body: 'M62 134C59 120 60 100 66 84C74 66 92 55 122 53L196 53C226 55 250 70 270 90L316 102C330 106 338 116 338 130L336 142H306A25 25 0 1 0 258 142H127A25 25 0 1 0 79 142H64Z',
    glass: ['M84 86C90 70 104 61 124 59L164 59L162 86Z', 'M170 59L195 59C218 61 238 72 254 86L168 86Z'],
    details: [
      'M165 86V138',
      'M256 88C260 104 260 122 256 138',
      'M70 108C150 102 240 104 326 114',
      'M320 106L334 114',
      'M62 96L72 92',
      'M128 96h11',
      'M206 96h11',
      'M248 84l10-3 2 6-10 2z',
    ],
    wheels: { x: [103, 282], y: 136, r: 22 },
  },
  van: {
    body: 'M20 138C18 100 19 60 24 40C27 30 34 26 46 26L258 26C276 28 296 48 322 80L364 96C376 100 380 110 380 126L378 142H342A26 26 0 1 0 292 142H118A26 26 0 1 0 68 142H22Z',
    glass: ['M264 34C278 38 294 54 310 76L262 76L262 34Z', 'M254 34V76H170V34Z', 'M162 34V76H34C32 62 33 46 38 34Z'],
    details: [
      'M166 76V138',
      'M258 76V140',
      'M46 84H250',
      'M30 108C150 104 280 106 372 116',
      'M360 100L376 108',
      'M20 70L27 70',
      'M21 90L28 90',
      'M176 92h13',
      'M238 92h13',
      'M306 72l11-2 2 7-11 1z',
    ],
    wheels: { x: [93, 317], y: 135, r: 23 },
  },
  minibus: {
    body: 'M11 140C9 100 9 50 13 26C15 16 22 12 34 12L292 12C308 14 322 30 340 70L374 88C384 93 389 104 389 124L387 144H357A23 23 0 1 0 313 144H123A23 23 0 1 0 79 144H13Z',
    glass: [
      'M298 20C310 24 322 42 334 70L296 70L296 20Z',
      'M288 22V62H242V22Z',
      'M236 22V62H190V22Z',
      'M184 22V62H138V22Z',
      'M132 22V62H86V22Z',
      'M80 22V62H24C22 48 23 34 28 22Z',
    ],
    details: [
      'M240 70V140',
      'M292 70V142',
      'M20 76H330',
      'M18 112C150 108 290 110 382 118',
      'M370 96L386 104',
      'M11 60L18 60',
      'M11 84L18 84',
      'M252 86h13',
      'M330 66l11-1 2 7-11 1z',
    ],
    wheels: { x: [101, 335], y: 138, r: 20 },
  },
}

function Wheel({ x, y, r }: { x: number; y: number; r: number }) {
  return (
    <g>
      <circle cx={x} cy={y} r={r} fill="currentColor" fillOpacity="0.1" />
      <circle cx={x} cy={y} r={r * 0.68} />
      <circle cx={x} cy={y} r={r * 0.16} fill="currentColor" stroke="none" />
      {[0, 72, 144, 216, 288].map((angle) => (
        <line
          key={angle}
          x1={x}
          y1={y}
          x2={x + Math.cos(((angle - 90) * Math.PI) / 180) * r * 0.68}
          y2={y + Math.sin(((angle - 90) * Math.PI) / 180) * r * 0.68}
          strokeOpacity="0.55"
        />
      ))}
    </g>
  )
}

export function VehicleArt({ bodyType, className = '', title }: { bodyType: BodyType; className?: string; title?: string }) {
  const shape = SHAPES[bodyType]
  const ground = shape.wheels.y + shape.wheels.r

  return (
    <svg
      viewBox="0 0 400 170"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.15"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {/* Soft shadow under the car */}
      <ellipse cx="200" cy={ground + 2} rx="178" ry="5" fill="currentColor" fillOpacity="0.1" stroke="none" />
      <line x1="6" y1={ground} x2="394" y2={ground} strokeOpacity="0.28" strokeWidth="0.75" />

      <path d={shape.body} fill="currentColor" fillOpacity="0.045" />
      {shape.glass.map((d) => (
        <path key={d} d={d} fill="currentColor" fillOpacity="0.1" strokeOpacity="0.7" strokeWidth="0.9" />
      ))}
      {shape.details.map((d) => (
        <path key={d} d={d} strokeOpacity="0.5" strokeWidth="0.85" />
      ))}
      {shape.wheels.x.map((x) => (
        <Wheel key={x} x={x} y={shape.wheels.y} r={shape.wheels.r} />
      ))}
    </svg>
  )
}

/** A vehicle's photo when one has been set, otherwise its line drawing. */
export function VehicleImage({
  bodyType,
  imageUrl,
  name,
  className = '',
}: {
  bodyType: BodyType
  imageUrl: string | null
  name: string
  className?: string
}) {
  if (imageUrl) {
    // Plain <img>: fleet photos are added by the operator and may live anywhere.
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={imageUrl} alt={name} loading="lazy" className={`${className} object-cover`} />
  }
  return <VehicleArt bodyType={bodyType} className={className} title={name} />
}
