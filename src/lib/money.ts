// Money is always an integer number of the smallest currency unit (cents / haléře).

export type Currency = 'EUR' | 'CZK'

const formatters = new Map<string, Intl.NumberFormat>()

function formatter(currency: Currency, fractionDigits: 0 | 2, signed: boolean): Intl.NumberFormat {
  const key = `${currency}:${fractionDigits}:${signed}`
  let instance = formatters.get(key)
  if (!instance) {
    instance = new Intl.NumberFormat('sk-SK', {
      style: 'currency',
      currency,
      currencyDisplay: 'narrowSymbol',
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: 2,
      signDisplay: signed ? 'exceptZero' : 'auto',
    })
    formatters.set(key, instance)
  }
  return instance
}

/** "10,50 €", "450 Kč", "12,50 Kč". With `signed`, positive amounts get a plus sign. */
export function formatMoney(cents: number, currency: Currency, options: { signed?: boolean } = {}): string {
  const fractionDigits = currency === 'CZK' && cents % 100 === 0 ? 0 : 2
  return formatter(currency, fractionDigits, options.signed ?? false).format(cents / 100)
}

/** Plain decimal amount with a dot, for bank QR codes: 1050 -> "10.50". */
export function formatAmountForBank(cents: number): string {
  if (!Number.isInteger(cents) || cents < 0) throw new Error('Amount must be a non-negative integer')
  const whole = Math.floor(cents / 100)
  const fraction = String(cents % 100).padStart(2, '0')
  return `${whole}.${fraction}`
}

/** Value for a money input: 1050 -> "10,50", 1000 -> "10". */
export function centsToInput(cents: number): string {
  const whole = Math.trunc(cents / 100)
  const fraction = Math.abs(cents % 100)
  const sign = cents < 0 ? '-' : ''
  return fraction === 0 ? `${sign}${Math.abs(whole)}` : `${sign}${Math.abs(whole)},${String(fraction).padStart(2, '0')}`
}

/**
 * Parses what people type into an amount field: "10", "10,5", "10,50", "10.50", "1 000,50 €".
 * Returns cents, or null when the input is not a valid non-negative amount with at most two decimals.
 */
export function parseMoneyInput(input: string): number | null {
  const cleaned = input
    .replace(/[\s\u00a0\u202f]/g, '')
    .replace(/^(€|eur|kč|kc|czk)|(€|eur|kč|kc|czk)$/gi, '')
    .replace(',', '.')
  const match = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(cleaned)
  if (!match) return null
  const whole = Number(match[1])
  const fraction = Number((match[2] ?? '').padEnd(2, '0'))
  return whole * 100 + fraction
}

/** Suggested top-up amounts (in cents). */
export function quickTopUpAmounts(currency: Currency): number[] {
  return currency === 'EUR' ? [2000, 5000, 10000] : [50000, 100000, 200000]
}

export function currencySymbol(currency: Currency): string {
  return currency === 'EUR' ? '€' : 'Kč'
}
