/** Joins class names, skipping empty ones. Callers never pass conflicting utilities. */
export function classNames(...names: Array<string | false | null | undefined>): string {
  return names.filter(Boolean).join(' ')
}
