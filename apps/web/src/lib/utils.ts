import { resolveFormattingLocale } from '@orbit/shared'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}

export function formatRelativeTime(iso: string, locale: string): string {
  return new Intl.RelativeTimeFormat(resolveFormattingLocale(locale), { numeric: 'auto' }).format(
    0,
    'day',
  )
}

export function formatDate(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(resolveFormattingLocale(locale), { dateStyle: 'medium' }).format(
    new Date(iso),
  )
}

export function initialsOf(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

export function isNotNull<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined
}

/** Selects WCAG-friendly dark or light text for a validated six-digit hex background. */
export function getContrastTextColor(hexColor: string): '#111827' | '#ffffff' {
  const hex = hexColor.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(hex)) return '#111827'
  const channels = [0, 2, 4].map(
    (offset) => Number.parseInt(hex.slice(offset, offset + 2), 16) / 255,
  )
  const [red = 0, green = 0, blue = 0] = channels.map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  )
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue
  return luminance > 0.179 ? '#111827' : '#ffffff'
}

export function buildQueryString(
  params: Record<string, string | number | boolean | undefined | null>,
): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value))
    }
  }
  const qs = search.toString()
  return qs ? `?${qs}` : ''
}
