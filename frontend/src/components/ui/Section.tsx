import type { ReactNode } from 'react'

/**
 * Render `*word*` as an italic accent, the house style for headings:
 * `Arrive *unhurried*` -> Arrive <em>unhurried</em>. The gold is a shade deeper
 * on light surfaces, where the lighter one would be too faint to read.
 */
export function Accent({ text }: { text: string }) {
  const parts = text.split(/\*(.+?)\*/g)
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <em key={index} className="text-gold-600 italic in-[.on-dark]:text-gold-400">
            {part}
          </em>
        ) : (
          part
        ),
      )}
    </>
  )
}

type Tone = 'light' | 'bone' | 'dark'

const tones: Record<Tone, string> = {
  light: 'bg-bone-50 text-ink-900',
  bone: 'bg-bone-100 text-ink-900',
  dark: 'on-dark grain bg-ink-950 text-bone-100',
}

export function Section({
  tone = 'light',
  id,
  className = '',
  children,
}: {
  tone?: Tone
  id?: string
  className?: string
  children: ReactNode
}) {
  return (
    <section id={id} className={`${tones[tone]} py-20 sm:py-28 ${className}`}>
      <div className="container-page">{children}</div>
    </section>
  )
}

export function Eyebrow({ children, onDark, className = '', inHeading }: { children: ReactNode; onDark?: boolean; className?: string; inHeading?: boolean }) {
  const look = `eyebrow flex items-center gap-3 ${onDark ? 'text-gold-300' : 'text-gold-700'} ${className}`
  const rule = <span aria-hidden className={`h-px w-8 ${onDark ? 'bg-gold-300/60' : 'bg-gold-700/50'}`} />
  // Inside a page's <h1> the label becomes part of the heading search engines read
  // (e.g. "Chauffeur services in Madrid"), so it resets the heading's font and spacing.
  return inHeading ? (
    <span className={`${look} font-sans leading-normal`}>
      {rule}
      {children}
    </span>
  ) : (
    <p className={look}>
      {rule}
      {children}
    </p>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  lead,
  onDark,
  align = 'left',
  as: Heading = 'h2',
  children,
}: {
  eyebrow?: string
  title: string
  lead?: string
  onDark?: boolean
  align?: 'left' | 'center'
  as?: 'h1' | 'h2' | 'h3'
  /** Optional element shown beside the heading on wide screens (e.g. a "view all" link). */
  children?: ReactNode
}) {
  const centered = align === 'center'
  return (
    <div className={`reveal mb-12 flex flex-col gap-6 sm:mb-16 ${centered ? 'items-center text-center' : 'lg:flex-row lg:items-end lg:justify-between'}`}>
      <div className={centered ? 'max-w-2xl' : 'max-w-3xl'}>
        {eyebrow ? (
          <Eyebrow onDark={onDark} className={centered ? 'justify-center' : ''}>
            {eyebrow}
          </Eyebrow>
        ) : null}
        <Heading className="display mt-5 text-4xl sm:text-5xl lg:text-[3.5rem]">
          <Accent text={title} />
        </Heading>
        {lead ? <p className={`mt-5 max-w-2xl text-base leading-relaxed sm:text-lg ${onDark ? 'text-bone-100/65' : 'text-ink-900/65'}`}>{lead}</p> : null}
      </div>
      {children ? <div className="shrink-0">{children}</div> : null}
    </div>
  )
}
