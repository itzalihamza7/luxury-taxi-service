/**
 * Placeholder with the proportions of a page header, shown for the instant
 * between following a link and the page's content arriving.
 */
export function PageSkeleton() {
  return (
    <div aria-busy="true">
      <div className="on-dark grain min-h-[34rem] bg-ink-950" />
      <div className="min-h-[40rem] bg-bone-50" />
    </div>
  )
}
