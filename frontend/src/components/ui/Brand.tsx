import { useId } from 'react'
import { site } from '@/content/site'

/*
 * The SignatureMile emblem: an S over an M (Cormorant Garamond), inside a
 * double ring. The S is cut out of the M rather than drawn over it, so the
 * mark reads the same on any background.
 */

/** Outlines of the two letters, in a 100 × 100 box. */
export const LETTER_S = { d: 'M16.4-51.8Q16.4-47.9 18.4-45.1Q20.4-42.2 23.6-39.9Q26.7-37.6 30.2-35.4Q34-33.1 37.5-30.5Q40.9-27.9 43.2-24.6Q45.4-21.2 45.4-16.4Q45.4-11.2 42.7-7.2Q40-3.3 35.3-1Q30.5 1.2 24.1 1.2Q21.4 1.2 18.4 0.7Q15.5 0.2 13-0.7Q10.4-1.6 8.8-2.6Q8.4-2.9 8.2-3.3Q7.9-3.7 7.8-4.5L7.2-19.6Q7.2-19.8 7.2-20Q7.4-20.1 7.7-20.2Q8.2-20.2 8.3-19.8Q9.5-16.8 11.2-13.5Q12.8-10.1 15-7.3Q17.2-4.5 20.1-2.7Q22.9-1 26.6-1Q29.2-1 31.5-1.9Q33.8-2.8 35.3-5.1Q36.8-7.3 36.8-11.2Q36.8-15.9 34.6-19.2Q32.5-22.6 29.2-25.1Q25.9-27.6 22.3-29.8Q18.8-32.1 15.6-34.5Q12.4-36.9 10.4-40.1Q8.3-43.2 8.3-47.7Q8.3-53.2 11.3-56.7Q14.3-60.2 18.9-61.9Q23.6-63.6 28.5-63.6Q31.8-63.6 35.2-63Q38.6-62.4 41-61.3Q41.9-61 42.2-60.5Q42.5-60 42.5-59.4L42.7-45.9Q42.7-45.5 42.3-45.4Q41.8-45.3 41.6-45.6Q41.1-47.1 40.1-49.7Q39.1-52.4 37.3-55.1Q35.5-57.8 32.8-59.7Q30.1-61.6 26.2-61.6Q23.2-61.6 21-60.4Q18.8-59.2 17.6-57.1Q16.4-54.9 16.4-51.8', transform: 'translate(29.71 74.07) scale(0.7716)' }
export const LETTER_M = { d: 'M11.9-11.4L12.8-56.3Q9.5-61.3 4.2-61.3Q4-61.3 4-61.9Q4-62.5 4.2-62.5Q6-62.5 8-62.4Q9.9-62.3 11.3-62.3Q13.2-62.3 14.8-62.4Q16.3-62.5 17.1-62.5Q18.5-62.5 19.3-61.6Q20.1-60.6 21.7-57.3L43.9-12.2L64.8-60Q65.3-61.2 66-61.9Q66.8-62.5 67.8-62.5Q68.5-62.5 69.5-62.4Q70.6-62.3 72-62.3Q74.8-62.3 76.7-62.4Q78.6-62.5 80.6-62.5Q80.8-62.5 80.8-61.9Q80.8-61.3 80.6-61.3Q75.8-61.3 73.6-59.7Q71.4-58.2 71.5-54.1L73.6-8.1Q73.8-5.2 74.4-3.7Q75-2.2 76.7-1.7Q78.4-1.2 81.9-1.2Q82.1-1.2 82.1-0.6Q82.1 0 81.9 0Q79.4 0 76.3-0.1Q73.2-0.2 69.7-0.2Q66.4-0.2 63.5-0.1Q60.6 0 58.3 0Q58 0 58-0.6Q58-1.2 58.3-1.2Q63.2-1.2 64.6-2.5Q66-3.8 65.7-8.1L63.8-52.1L41.7-0.7Q41.6-0.3 41-0.3Q40.3-0.3 40.1-0.7L15.2-51.7L14.4-11.4Q14.3-6.2 16.3-3.7Q18.2-1.2 22.8-1.2Q23.1-1.2 23.1-0.6Q23.1 0 22.8 0Q20.6 0 18.3-0.1Q16-0.2 13.1-0.2Q10.4-0.2 8-0.1Q5.6 0 3.5 0Q3.3 0 3.3-0.6Q3.3-1.2 3.5-1.2Q7.7-1.2 9.8-3.7Q11.8-6.2 11.9-11.4', transform: 'translate(22.67 71.00) scale(0.6400)' }

/** `ivory` is the colour of the S, `gold` of the M and the rings. */
export function Monogram({ className = 'size-11', ivory = 'currentColor', gold = 'var(--color-gold-400)' }: { className?: string; ivory?: string; gold?: string }) {
  const cut = useId()
  return (
    <svg viewBox="0 0 100 100" className={className} aria-hidden>
      <circle cx="50" cy="50" r="47.5" fill="none" stroke={gold} strokeWidth="1.5" />
      <circle cx="50" cy="50" r="43.5" fill="none" stroke={gold} strokeWidth="0.5" />
      <mask id={cut} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
        <rect width="100" height="100" fill="white" />
        <path transform={LETTER_S.transform} d={LETTER_S.d} fill="black" stroke="black" strokeWidth="5" />
      </mask>
      <g mask={`url(#${cut})`}>
        <path transform={LETTER_M.transform} d={LETTER_M.d} fill={gold} />
      </g>
      <path transform={LETTER_S.transform} d={LETTER_S.d} fill={ivory} />
    </svg>
  )
}

/** Emblem and name, as in the header and footer. The name is built from `site`, so a new name needs no new artwork. */
export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className}`}>
      <Monogram className="size-11 shrink-0 text-bone-50" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[1.3125rem] font-medium tracking-[0.2em] uppercase">{site.name}</span>
        <span className="mt-1.5 text-[0.5rem] font-semibold tracking-[0.42em] text-gold-400 uppercase">{site.descriptor}</span>
      </span>
    </span>
  )
}
