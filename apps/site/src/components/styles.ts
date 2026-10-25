/** Button recipes matching the app's primitives, without pulling in Radix. */
const BASE =
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-[background-color,border-color,color,translate] duration-150 ease-out active:translate-y-px focus-visible:outline-2 focus-visible:outline-offset-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg]:size-4'

export const button = {
  /** Light-on-cobalt call to action, used on rail surfaces. */
  onRail: `${BASE} h-10 px-5 bg-rail-foreground text-rail hover:bg-[color-mix(in_srgb,var(--rail-foreground)_88%,var(--rail-accent))] focus-visible:outline-rail-foreground`,
  onRailSmall: `${BASE} h-9 px-3.5 bg-rail-foreground text-rail hover:bg-[color-mix(in_srgb,var(--rail-foreground)_88%,var(--rail-accent))] focus-visible:outline-rail-foreground`,
  ghostOnRail: `${BASE} h-10 px-5 text-rail-foreground hover:bg-rail-accent focus-visible:outline-rail-foreground`,
  ghostOnRailSmall: `${BASE} h-9 px-3.5 text-rail-foreground hover:bg-rail-accent focus-visible:outline-rail-foreground`,
  iconOnRail: `${BASE} size-9 text-rail-foreground hover:bg-rail-accent focus-visible:outline-rail-foreground`,
  primary: `${BASE} h-10 px-5 bg-primary text-primary-foreground hover:bg-[color-mix(in_srgb,var(--primary)_86%,var(--foreground))] focus-visible:outline-ring`,
  ghost: `${BASE} h-9 px-3 text-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring`,
} as const

export const display = { fontStretch: '112%' } as const
