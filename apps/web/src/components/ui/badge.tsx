import { Slot } from '@radix-ui/react-slot'
import { cva, type VariantProps } from 'class-variance-authority'
import * as React from 'react'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden whitespace-nowrap rounded-sm border px-1.5 py-px text-xs font-medium tabular-nums transition-colors [&>svg]:pointer-events-none [&>svg]:size-3',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-accent text-accent-foreground',
        secondary: 'border-transparent bg-secondary text-muted-foreground',
        destructive:
          'border-transparent bg-[color-mix(in_srgb,var(--destructive)_14%,transparent)] text-[color-mix(in_srgb,var(--destructive)_80%,var(--foreground))]',
        outline: 'border-border text-muted-foreground',
        success:
          'border-transparent bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-[color-mix(in_srgb,var(--success)_82%,var(--foreground))]',
        warning:
          'border-transparent bg-[color-mix(in_srgb,var(--ochre)_24%,transparent)] text-ochre-ink',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant,
  asChild = false,
  ...props
}: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : 'span'

  return <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
