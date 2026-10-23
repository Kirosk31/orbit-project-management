import type { CSSProperties, ReactNode } from 'react'

import { cn } from '@/lib/utils'

export type TileState = 'done' | 'open' | 'overdue'

export interface Tile {
  id: string
  state: TileState
}

interface TilePanelProps {
  tiles: Tile[]
  /** Accessible summary, e.g. "7 of 10 tasks done, 1 overdue". */
  label: string
  /** Edge of one tile in px. */
  size?: number
  /** Tiles per row; the panel wraps after this many. */
  columns?: number
  /** Tiles beyond this count collapse into a "+N" tile. */
  max?: number
  className?: string
}

/**
 * Orbit's signature progress module, after Athos Bulcão's azulejo panels:
 * one tile per task, a quarter-circle module rotated in a repeating rhythm.
 * A finished task glazes its tile in the brand color; an overdue one turns ochre.
 */
export function TilePanel({
  tiles,
  label,
  size = 14,
  columns = 12,
  max = 48,
  className,
}: TilePanelProps): ReactNode {
  const visible = tiles.length > max ? tiles.slice(0, max - 1) : tiles
  const overflow = tiles.length - visible.length

  return (
    <div
      role="img"
      aria-label={label}
      className={cn('grid w-fit gap-[3px]', className)}
      style={{
        gridTemplateColumns: `repeat(${Math.min(columns, Math.max(tiles.length, 1))}, ${size}px)`,
      }}
    >
      {visible.map((tile, index) => (
        <TileGlyph key={tile.id} state={tile.state} size={size} turn={rotationFor(index)} />
      ))}
      {overflow > 0 && (
        <span
          className="flex items-center justify-center px-0.5 text-[0.6875rem] leading-none font-semibold text-muted-foreground tabular-nums"
          style={{ minWidth: size, height: size }}
          aria-hidden="true"
        >
          +{overflow > 99 ? 99 : overflow}
        </span>
      )}
    </div>
  )
}

/** Bulcão's panels repeat one module in a small set of rotations. */
function rotationFor(index: number): number {
  return [0, 90, 180, 90, 270, 0, 180, 270][index % 8] ?? 0
}

interface TileGlyphProps {
  state: TileState
  size: number
  turn: number
}

export function TileGlyph({ state, size, turn }: TileGlyphProps): ReactNode {
  const style: CSSProperties = { width: size, height: size }
  return (
    <svg
      viewBox="0 0 16 16"
      style={style}
      className="block overflow-hidden rounded-[2px]"
      data-state={state}
      aria-hidden="true"
    >
      <rect
        width="16"
        height="16"
        className="transition-[fill] duration-300 ease-out"
        fill={
          state === 'done'
            ? 'var(--tile-done)'
            : state === 'overdue'
              ? 'var(--tile-overdue)'
              : 'var(--tile-open)'
        }
      />
      <g transform={`rotate(${turn} 8 8)`}>
        {state === 'open' ? (
          <path
            d="M0 9a7 7 0 0 1 7 7"
            fill="none"
            stroke="color-mix(in srgb, var(--muted-foreground) 45%, transparent)"
            strokeWidth="1.25"
          />
        ) : (
          <path
            d="M0 5a11 11 0 0 1 11 11H0z"
            className="origin-bottom-left transition-transform duration-300 ease-out"
            fill={state === 'done' ? 'var(--tile-glaze)' : 'var(--warning-foreground)'}
            fillOpacity={state === 'done' ? 0.92 : 0.55}
          />
        )}
      </g>
    </svg>
  )
}
