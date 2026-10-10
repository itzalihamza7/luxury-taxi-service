import { site } from '@/content/site'

/** Monogram: the first letter of the brand inside a fine double ring. */
export function Monogram({ className = 'size-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.9" />
      <circle cx="20" cy="20" r="15.5" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.45" />
      <text
        x="20"
        y="27.5"
        textAnchor="middle"
        fontFamily="var(--font-instrument), Georgia, serif"
        fontSize="21"
        fill="currentColor"
      >
        {site.name.charAt(0)}
      </text>
    </svg>
  )
}

/** Wordmark built from the configured brand name, so renaming the business updates the logo. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Monogram className="size-9 text-gold-300" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.25rem] tracking-[0.12em] uppercase">{site.name}</span>
        <span className="mt-1 text-[0.5625rem] font-medium tracking-[0.3em] uppercase opacity-60">{site.descriptor}</span>
      </span>
    </span>
  )
}
