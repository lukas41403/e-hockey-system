import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from 'cn'
import { Slot } from 'radix-ui'

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-transparent font-semibold whitespace-nowrap transition-colors outline-none select-none disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-5',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/85',
        secondary: 'border-border bg-surface text-foreground hover:bg-surface-2',
        outline: 'border-input bg-transparent text-foreground hover:bg-surface-2',
        ghost: 'text-foreground hover:bg-surface-2',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        'destructive-outline': 'border-destructive/60 text-destructive hover:bg-destructive/10',
        goalie: 'bg-goalie text-goalie-foreground hover:bg-goalie/90',
        link: 'h-auto px-0 text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-11 px-4 text-base',
        sm: 'h-11 px-3 text-sm',
        lg: 'h-12 px-5 text-base',
        icon: 'size-11',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
)

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      data-slot="button"
      data-variant={variant ?? 'default'}
      className={cn(buttonVariants({ variant, size }), variant === 'link' && 'h-auto', className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
