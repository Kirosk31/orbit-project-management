import { CheckIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { cn, getContrastTextColor } from '@/lib/utils'

interface ColorSwatchPickerProps {
  colors: readonly string[]
  value: string
  onChange: (color: string) => void
  /** id of the visible label naming this group. */
  labelledBy?: string
  className?: string
}

/** A radio group of square swatches; the chosen tile carries a check. */
export function ColorSwatchPicker({
  colors,
  value,
  onChange,
  labelledBy,
  className,
}: ColorSwatchPickerProps): ReactNode {
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={cn('flex flex-wrap gap-1.5', className)}
    >
      {colors.map((color) => {
        const selected = value.toLowerCase() === color.toLowerCase()
        return (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={color}
            onClick={() => onChange(color)}
            className={cn(
              'flex size-7 items-center justify-center rounded-sm transition-[box-shadow] duration-150',
              selected
                ? 'ring-2 ring-ring ring-offset-2 ring-offset-card'
                : 'hover:ring-2 hover:ring-border hover:ring-offset-1 hover:ring-offset-card',
            )}
            style={{ backgroundColor: color }}
          >
            {selected && (
              <CheckIcon
                className="size-3.5"
                style={{ color: getContrastTextColor(color) }}
                aria-hidden="true"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
