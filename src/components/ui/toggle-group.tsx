import * as React from 'react'
import { cn } from 'cn'
import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui'

// Segmented control (single choice), e.g. country, pricing mode, position.
function ToggleGroup({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Root>) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="toggle-group"
      className={cn('flex w-full rounded-md border border-input bg-surface p-0.5', className)}
      {...props}
    />
  )
}

function ToggleGroupItem({ className, ...props }: React.ComponentProps<typeof ToggleGroupPrimitive.Item>) {
  return (
    <ToggleGroupPrimitive.Item
      data-slot="toggle-group-item"
      className={cn(
        'inline-flex h-10 flex-1 items-center justify-center gap-2 rounded-sm px-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground data-[state=on]:bg-boards data-[state=on]:text-white dark:data-[state=on]:bg-foreground dark:data-[state=on]:text-background [&_svg]:size-4',
        className,
      )}
      {...props}
    />
  )
}

export { ToggleGroup, ToggleGroupItem }
