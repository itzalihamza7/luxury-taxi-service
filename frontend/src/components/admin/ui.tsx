import type { ReactNode } from 'react'

/* The few building blocks the admin panel's pages share. */

/** A white panel on the grey page. */
export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-ink-900/10 bg-white shadow-[0_1px_2px_rgba(12,18,27,0.04)] ${className}`}>{children}</div>
}

/** The title row of a card, with room for a link or button on the right. */
export function CardHeader({ title, hint, children }: { title: string; hint?: string; children?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-ink-900/10 px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-[0.9375rem] font-semibold tracking-tight">{title}</h2>
        {hint ? <p className="mt-0.5 text-sm text-ink-900/60">{hint}</p> : null}
      </div>
      {children}
    </div>
  )
}

/** Shown in place of a list that has nothing in it. */
export function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-12 text-center text-sm text-ink-900/60">{children}</p>
}

/** The sentence under the top bar that says what a page is for. */
export function Lead({ children }: { children: ReactNode }) {
  return <p className="max-w-3xl text-sm leading-relaxed text-ink-900/65">{children}</p>
}
