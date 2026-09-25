import { cn } from 'cn'
import { formatMoney, type Currency } from '@/lib/money'

/** Amount with tabular digits; debts in red line color, credits calm. */
export function Money({
  cents,
  currency,
  signed = false,
  tone = 'auto',
  className,
}: {
  cents: number
  currency: Currency
  signed?: boolean
  tone?: 'auto' | 'plain'
  className?: string
}) {
  return (
    <span className={cn('tabular-nums', tone === 'auto' && cents < 0 && 'text-debt', className)}>
      {formatMoney(cents, currency, { signed })}
    </span>
  )
}
