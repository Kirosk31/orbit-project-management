/**
 * Swatches for projects, columns and labels, drawn from the azulejo world:
 * cobalt, sky tile, ochre, leaf, clay, plum and slate. Mid-lightness so a
 * tile reads on both porcelain and night grounds.
 */
export const PALETTE_COLORS = [
  '#224bb2',
  '#2f86b8',
  '#c98a1b',
  '#2f8a5b',
  '#b4532a',
  '#7a4b9c',
  '#5b6b80',
] as const

export const COLUMN_COLORS: readonly string[] = ['#5b6b80', ...PALETTE_COLORS.slice(0, 6)]
