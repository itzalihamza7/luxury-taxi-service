import { Backdrop } from '@/components/art/Backdrop'
import { ButtonLink } from '@/components/ui/Button'
import { getCommon } from '@/i18n/server'

export default async function NotFound() {
  const t = await getCommon()
  return (
    <section className="on-dark grain relative flex min-h-[80dvh] items-center bg-ink-950 py-40 text-bone-100">
      <Backdrop />
      <div className="container-page relative">
        <p className="font-display text-8xl text-gold-300/80 sm:text-9xl">404</p>
        <h1 className="display mt-6 max-w-2xl text-4xl text-bone-50 sm:text-6xl">{t.notFound.title}</h1>
        <p className="mt-5 max-w-xl text-lg text-bone-100/65">{t.notFound.text}</p>
        <div className="mt-9 flex flex-wrap gap-4">
          <ButtonLink href="/" size="lg" arrow>
            {t.notFound.home}
          </ButtonLink>
          <ButtonLink href="/booking" variant="outline-light" size="lg">
            {t.actions.book}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
