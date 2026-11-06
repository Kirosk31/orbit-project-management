import { NextResponse, type NextRequest } from 'next/server'

import { isSiteLocale, negotiateLocale } from './i18n/config'

/** Sends locale-less URLs to the reader's language, e.g. / → /es-CR. */
export function proxy(request: NextRequest): NextResponse | undefined {
  const { pathname } = request.nextUrl
  const first = pathname.split('/')[1] ?? ''
  if (isSiteLocale(first)) return undefined

  const locale = negotiateLocale(request.headers.get('accept-language'))
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname === '/' ? '' : pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  // Skip Next internals, metadata routes and anything with a file extension.
  matcher: ['/((?!_next|api|sitemap.xml|robots.txt|favicon.svg|.*\\..*).*)'],
}
