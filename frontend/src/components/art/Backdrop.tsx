/**
 * Decorative backdrop for dark hero areas: a warm glow on the horizon and long
 * light trails, like headlights on a night road. Purely ornamental.
 */
export function Backdrop({ variant = 'page' }: { variant?: 'home' | 'page' }) {
  const home = variant === 'home'
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      {/* Horizon glow */}
      <div
        className="absolute -right-[20%] h-[70rem] w-[70rem] rounded-full opacity-70 blur-3xl"
        style={{
          top: home ? '-10%' : '-45%',
          background: 'radial-gradient(closest-side, rgba(210,173,104,0.20), rgba(210,173,104,0.06) 55%, transparent 75%)',
        }}
      />
      <div
        className="absolute -left-[25%] bottom-[-40%] h-[50rem] w-[50rem] rounded-full opacity-60 blur-3xl"
        style={{ background: 'radial-gradient(closest-side, rgba(67,73,85,0.55), transparent 70%)' }}
      />

      {/* Light trails */}
      <svg viewBox="0 0 1600 900" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <defs>
          <linearGradient id="trail-gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#d2ad68" stopOpacity="0" />
            <stop offset="0.45" stopColor="#e1c68e" stopOpacity="0.55" />
            <stop offset="1" stopColor="#f6ecd6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="trail-pale" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="0.6" stopColor="#ffffff" stopOpacity="0.16" />
            <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g fill="none" strokeLinecap="round">
          <path d="M-100 820C300 700 620 640 900 520S1400 250 1750 180" stroke="url(#trail-gold)" strokeWidth="1.4" />
          <path d="M-100 860C320 760 660 700 940 580S1430 320 1750 250" stroke="url(#trail-gold)" strokeWidth="0.9" opacity="0.7" />
          <path d="M-100 900C340 820 700 760 980 640S1460 390 1750 330" stroke="url(#trail-pale)" strokeWidth="0.8" />
          <path d="M-100 780C280 640 580 580 860 460S1370 190 1750 110" stroke="url(#trail-pale)" strokeWidth="0.7" />
          <path
            d="M-100 840C310 730 640 670 920 550S1415 285 1750 215"
            stroke="#f6ecd6"
            strokeOpacity="0.5"
            strokeWidth="1.1"
            strokeDasharray="90 1110"
            className="animate-drift"
          />
        </g>
      </svg>

      {/* Fade into the section below */}
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ink-950 to-transparent" />
    </div>
  )
}
