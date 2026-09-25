// IBAN validation mirroring private.is_valid_iban in the database.

const LENGTHS: Record<string, number> = {
  SK: 24, CZ: 24, AT: 20, BE: 16, BG: 22, CH: 21, CY: 28, DE: 22, DK: 18, EE: 20, ES: 24,
  FI: 18, FR: 27, GB: 22, GR: 27, HR: 21, HU: 28, IE: 22, IT: 27, LI: 21, LT: 20, LU: 20,
  LV: 21, MT: 31, NL: 18, NO: 15, PL: 28, PT: 25, RO: 24, SE: 24, SI: 19, UA: 29,
}

export function normalizeIban(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase()
}

export function isValidIban(value: string): boolean {
  const iban = normalizeIban(value)
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false
  const country = iban.slice(0, 2)
  if (LENGTHS[country] !== iban.length) return false
  if ((country === 'SK' || country === 'CZ') && !/^\d{20}$/.test(iban.slice(4))) return false
  const rearranged = iban.slice(4) + iban.slice(0, 4)
  let remainder = 0
  for (const char of rearranged) {
    const code = char.charCodeAt(0)
    remainder = code >= 65 ? (remainder * 100 + (code - 55)) % 97 : (remainder * 10 + (code - 48)) % 97
  }
  return remainder === 1
}

/** "SK31 1200 0000 1987 4263 7541" */
export function formatIban(value: string): string {
  return normalizeIban(value).replace(/(.{4})(?=.)/g, '$1 ')
}
