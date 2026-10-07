import { ButtonLink } from '@/components/ui/Button'
import { Photo } from '@/components/ui/Photo'
import { Accent, Eyebrow } from '@/components/ui/Section'
import { getCommon } from '@/i18n/server'
import { PhoneButton, WhatsAppButton } from './ContactButtons'

/** Closing call to action shown at the end of most pages, over Madrid by night. */
export async function CtaBand() {
  const t = await getCommon()
  return (
    <section className="on-dark grain relative overflow-hidden bg-ink-900 text-bone-100">
      <div aria-hidden className="absolute inset-0">
        <Photo src="/images/site/metropolis.jpg" alt="" sizes="100vw" className="opacity-40" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-950/70 to-ink-950" />
        <div
          className="absolute left-1/2 top-1/2 h-[36rem] w-[60rem] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-60 blur-3xl"
          style={{ background: 'radial-gradient(closest-side, rgba(212,182,126,0.14), transparent 70%)' }}
        />
      </div>
      <div className="container-page reveal relative flex flex-col items-center py-24 text-center sm:py-32">
        <Eyebrow onDark className="justify-center">
          {t.cta.eyebrow}
        </Eyebrow>
        <h2 className="display mt-6 max-w-3xl text-4xl text-bone-50 sm:text-6xl">
          <Accent text={t.cta.title} />
        </h2>
        <p className="mt-6 max-w-xl text-base leading-relaxed text-bone-100/75 sm:text-lg">{t.cta.text}</p>
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink href="/booking" size="lg" arrow>
            {t.actions.book}
          </ButtonLink>
          <WhatsAppButton />
          <PhoneButton />
        </div>
        <p className="mt-8 text-xs tracking-wide text-bone-100/60">{t.contact.notice}</p>
      </div>
    </section>
  )
}
