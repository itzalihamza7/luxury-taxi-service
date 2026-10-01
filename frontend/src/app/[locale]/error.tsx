'use client'

import { useEffect } from 'react'
import { Button, ButtonLink } from '@/components/ui/Button'
import { phoneHref, site } from '@/content/site'
import { useI18n } from '@/i18n/client'

/** Shown when a page fails to render. The header and footer stay in place. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const { t } = useI18n()

  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <section className="on-dark grain flex min-h-[70dvh] items-center bg-ink-950 py-40 text-bone-100">
      <div className="container-page">
        <h1 className="display max-w-2xl text-4xl text-bone-50 sm:text-6xl">{t.errorPage.title}</h1>
        <p className="mt-5 max-w-xl text-lg text-bone-100/65">{t.errorPage.text}</p>
        <div className="mt-9 flex flex-wrap gap-4">
          <Button size="lg" onClick={reset}>
            {t.actions.retry}
          </Button>
          <ButtonLink href={phoneHref} variant="outline-light" size="lg">
            {site.phone}
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}
