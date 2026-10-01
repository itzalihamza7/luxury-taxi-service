import { Plus } from 'lucide-react'

export interface FaqItem {
  question: string
  answer: string
}

/**
 * Accordion built on native <details>, so it works without JavaScript and is
 * keyboard- and screen-reader-friendly by default.
 */
export function FaqList({ items, onDark }: { items: FaqItem[]; onDark?: boolean }) {
  const line = onDark ? 'border-white/10' : 'border-ink-900/10'
  return (
    <div className={`border-t ${line}`}>
      {items.map((item) => (
        <details key={item.question} className={`group border-b ${line}`}>
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 py-6 [&::-webkit-details-marker]:hidden">
            <h3 className="font-display text-xl leading-snug sm:text-2xl">{item.question}</h3>
            <span
              aria-hidden
              className={`mt-1 flex size-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 group-open:rotate-45 ${
                onDark ? 'border-white/20 text-gold-300' : 'border-ink-900/15 text-gold-700 group-open:border-gold-600 group-open:bg-gold-600 group-open:text-white'
              }`}
            >
              <Plus className="size-4" />
            </span>
          </summary>
          <p className={`max-w-3xl pb-7 pr-12 text-[0.9375rem] leading-relaxed ${onDark ? 'text-bone-100/65' : 'text-ink-900/70'}`}>{item.answer}</p>
        </details>
      ))}
    </div>
  )
}

/** Structured data so search engines can show the questions directly in results. */
export function faqJsonLd(items: FaqItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  }
}
