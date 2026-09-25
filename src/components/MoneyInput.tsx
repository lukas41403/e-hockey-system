import * as React from 'react'
import { cn } from 'cn'
import { Input } from '@/components/ui/input'
import { currencySymbol, type Currency } from '@/lib/money'

/** Text input for amounts ("10,50"), with the currency symbol as a suffix. */
export function MoneyInput({ currency, className, ...props }: React.ComponentProps<'input'> & { currency: Currency }) {
  return (
    <div className="relative">
      <Input inputMode="decimal" autoComplete="off" className={cn('pr-12 font-display-medium text-xl', className)} {...props} />
      <span aria-hidden="true" className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-base text-muted-foreground">
        {currencySymbol(currency)}
      </span>
    </div>
  )
}
