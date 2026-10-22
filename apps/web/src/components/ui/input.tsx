import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-card px-3 py-1 text-base transition-[border-color,background-color] duration-150 outline-none file:mr-3 file:inline-flex file:h-6 file:rounded-sm file:border-0 file:bg-muted file:px-2 file:text-[0.8125rem] file:font-medium file:text-foreground placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'hover:border-[color-mix(in_oklch,var(--input)_70%,var(--foreground))] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25',
        'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
