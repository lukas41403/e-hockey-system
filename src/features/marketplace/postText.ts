import { formatMoney, type Currency } from '@/lib/money'

interface PostPricing {
  pricing_mode: 'fixed' | 'dynamic'
  price_per_skater_cents: number | null
  estimated_full_price_cents: number | null
  estimated_price_cents: number | null
  currency: Currency
}

/** "12,00 €" for a fixed price, "približne 10,50 až 12,00 €" for an estimate. */
export function postPriceText(post: PostPricing): string | null {
  if (post.pricing_mode === 'fixed') return post.price_per_skater_cents ? formatMoney(post.price_per_skater_cents, post.currency) : null
  const low = post.estimated_full_price_cents
  const high = post.estimated_price_cents
  if (low == null && high == null) return null
  if (low != null && high != null && low !== high) {
    return `približne ${formatMoney(Math.min(low, high), post.currency)} až ${formatMoney(Math.max(low, high), post.currency)}`
  }
  return `približne ${formatMoney((low ?? high)!, post.currency)}`
}
