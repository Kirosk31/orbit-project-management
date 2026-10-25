import { en } from '@orbit/locales/en'
import { es } from '@orbit/locales/es'
import { fr } from '@orbit/locales/fr'
import { ptBR } from '@orbit/locales/pt-br'

import { CATALOG_FOR, type CatalogKey, type SiteLocale } from './config'

/** The catalogs are `as const`; every locale shares the English shape with plain strings. */
type Widen<T> = { readonly [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }

export type Dictionary = Widen<typeof en>

const CATALOGS: Record<CatalogKey, Dictionary> = { en, es, fr, 'pt-br': ptBR }

/** The same catalog the app ships, so site and product never drift apart. */
export function getDictionary(locale: SiteLocale): Dictionary {
  return CATALOGS[CATALOG_FOR[locale]]
}

/** Fills i18next-style {{placeholders}}. */
export function format(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) =>
    key in values ? String(values[key]) : match,
  )
}
