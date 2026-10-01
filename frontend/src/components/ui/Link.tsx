'use client'

import NextLink from 'next/link'
import type { ComponentProps } from 'react'
import { href as localized } from '@/i18n/config'
import { useI18n } from '@/i18n/client'

type Props = Omit<ComponentProps<typeof NextLink>, 'href'> & { href: string }

/**
 * Link that keeps the visitor in their language: internal paths (`/fleet`) get
 * the current language prefix. External, `tel:`, `mailto:` and `#` links are
 * rendered as plain anchors.
 */
export function Link({ href, children, ...rest }: Props) {
  const { locale } = useI18n()

  if (!href.startsWith('/')) {
    const external = /^https?:/.test(href)
    return (
      <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <NextLink href={localized(locale, href)} {...rest}>
      {children}
    </NextLink>
  )
}
