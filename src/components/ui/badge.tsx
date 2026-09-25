import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'

const badgeVariants = cva(
  'inline-flex h-6 shrink-0 items-center gap-1 rounded-sm px-2 text-xs font-semibold whitespace-nowrap [&_svg]:size-3.5',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground',
        neutral: 'bg-surface-2 text-foreground',
        outline: 'border border-border text-muted-foreground',
        debt: 'bg-debt/12 text-debt',
        goalie: 'bg-goalie/20 text-goalie-text',
        solid: 'bg-primary text-primary-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
)

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
