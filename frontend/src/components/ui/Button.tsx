import { ArrowRight, LoaderCircle } from 'lucide-react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { Link } from './Link'

type Variant = 'gold' | 'dark' | 'outline' | 'outline-light' | 'ghost'
type Size = 'md' | 'lg'

/** Square, in spaced small capitals: the formal register of the brand. */
const base =
  'group inline-flex items-center justify-center gap-3 rounded-none text-center text-[0.6875rem] font-semibold tracking-[0.2em] uppercase transition-colors duration-300 ease-out-expo disabled:cursor-not-allowed disabled:opacity-50 sm:whitespace-nowrap'

const variants: Record<Variant, string> = {
  // Primary action, on dark surfaces and over photographs.
  gold: 'bg-gold-300 text-ink-950 hover:bg-bone-50',
  // Primary action on light surfaces.
  dark: 'bg-ink-950 text-bone-50 hover:bg-ink-700',
  // Secondary, on light surfaces.
  outline: 'border border-ink-900/25 text-ink-900 hover:border-ink-950 hover:bg-ink-950 hover:text-bone-50',
  // Secondary, on dark surfaces.
  'outline-light': 'border border-bone-50/30 text-bone-50 hover:border-gold-300 hover:text-gold-300',
  ghost: 'text-current hover:text-gold-400 px-0',
}

const sizes: Record<Size, string> = {
  // min-height rather than height: on very narrow phones a long label wraps instead of overflowing.
  md: 'min-h-12 px-7 py-2',
  lg: 'min-h-14 px-9 py-3 sm:px-10',
}

interface Common {
  variant?: Variant
  size?: Size
  /** Show a trailing arrow that nudges forward on hover. */
  arrow?: boolean
  className?: string
  children: ReactNode
}

function classes({ variant = 'gold', size = 'md', className = '' }: Pick<Common, 'variant' | 'size' | 'className'>) {
  return `${base} ${variants[variant]} ${variant === 'ghost' ? 'h-auto' : sizes[size]} ${className}`
}

const Arrow = () => <ArrowRight aria-hidden className="size-4 shrink-0 transition-transform duration-300 ease-out-expo group-hover:translate-x-1" />

export function ButtonLink({ href, arrow, children, variant, size, className, ...rest }: Common & { href: string } & { 'aria-label'?: string }) {
  return (
    <Link href={href} className={classes({ variant, size, className })} {...rest}>
      {children}
      {arrow ? <Arrow /> : null}
    </Link>
  )
}

export function Button({
  arrow,
  loading,
  children,
  variant,
  size,
  className,
  disabled,
  type = 'button',
  ...rest
}: Common & { loading?: boolean } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type={type} className={classes({ variant, size, className })} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading ? <LoaderCircle aria-hidden className="size-4 animate-spin" /> : null}
      {children}
      {arrow && !loading ? <Arrow /> : null}
    </button>
  )
}
