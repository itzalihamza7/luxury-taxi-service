import { MessageCircle, Phone } from 'lucide-react'
import { Suspense } from 'react'
import { ButtonLink } from '@/components/ui/Button'
import { getCommon } from '@/i18n/server'
import { phoneHref, whatsappHref } from '@/lib/contact'
import { loadSettings, quietly } from '@/lib/server-api'

type Look = Pick<Parameters<typeof ButtonLink>[0], 'variant' | 'size' | 'className'>

/** The business details, or null if they cannot be loaded right now. */
export const contactDetails = () => quietly('the business details', loadSettings(), null)

async function WhatsApp({ message, known, ...look }: Look & { message?: string; known: boolean }) {
  const t = await getCommon()
  const settings = known ? await contactDetails() : null
  return (
    <ButtonLink href={settings ? whatsappHref(settings.whatsapp, message) : '/contact'} variant="outline-light" size="lg" {...look}>
      <MessageCircle aria-hidden className="size-4" />
      {t.actions.whatsapp}
    </ButtonLink>
  )
}

/**
 * "WhatsApp us", optionally with a message already typed. Until the business
 * details arrive it leads to the contact page, so it always works and never
 * shifts the layout.
 */
export function WhatsAppButton(props: Look & { message?: string }) {
  return (
    <Suspense fallback={<WhatsApp {...props} known={false} />}>
      <WhatsApp {...props} known />
    </Suspense>
  )
}

async function PhoneNumber(look: Look) {
  const settings = await contactDetails()
  if (!settings) return null
  return (
    <ButtonLink href={phoneHref(settings.phone)} variant="outline-light" size="lg" {...look}>
      <Phone aria-hidden className="size-4" />
      {settings.phone}
    </ButtonLink>
  )
}

/** A button showing the phone number, which calls it. Appears once the number is known. */
export function PhoneButton(look: Look) {
  return (
    <Suspense fallback={null}>
      <PhoneNumber {...look} />
    </Suspense>
  )
}
