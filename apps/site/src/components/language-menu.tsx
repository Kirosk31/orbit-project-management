import { CheckIcon, GlobeIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { LOCALE_LABEL, SITE_LOCALES, type SiteLocale } from '@/i18n/config'

import { button } from './styles'

/** Plain links in a native disclosure: works without JavaScript and is crawlable. */
export function LanguageMenu({ locale, label }: { locale: SiteLocale; label: string }): ReactNode {
  return (
    <details className="group relative">
      <summary className={`${button.ghostOnRailSmall} cursor-pointer`}>
        <GlobeIcon aria-hidden="true" />
        <span className="sr-only">{label}: </span>
        <span>{locale}</span>
      </summary>
      <ul className="absolute right-0 z-50 mt-2 w-56 rounded-lg border bg-popover p-1 text-popover-foreground shadow-overlay">
        {SITE_LOCALES.map((option) => (
          <li key={option}>
            <a
              href={`/${option}`}
              hrefLang={option}
              lang={option}
              aria-current={option === locale ? 'page' : undefined}
              className="flex items-center justify-between rounded-md px-2.5 py-2 text-sm hover:bg-muted"
            >
              {LOCALE_LABEL[option]}
              {option === locale && (
                <CheckIcon className="size-4 text-primary" aria-hidden="true" />
              )}
            </a>
          </li>
        ))}
      </ul>
    </details>
  )
}
