// Phone numbers are stored in E.164 ("+421905123456").

export function normalizePhone(input: string, defaultCountry: 'SK' | 'CZ' = 'SK'): string | null {
  let value = input.replace(/[\s\-()./]/g, '')
  if (value === '') return null
  if (value.startsWith('00')) value = `+${value.slice(2)}`
  if (value.startsWith('+')) return /^\+[1-9]\d{7,14}$/.test(value) ? value : null
  if (!/^\d+$/.test(value)) return null
  // Slovak national format: 0905 123 456
  if (/^0\d{9}$/.test(value)) return `+421${value.slice(1)}`
  // Czech national format: 731 200 013
  if (defaultCountry === 'CZ' && /^[1-9]\d{8}$/.test(value)) return `+420${value}`
  if (defaultCountry === 'SK' && /^9\d{8}$/.test(value)) return `+421${value}`
  return null
}

/** "+421 905 123 456" for SK/CZ numbers, otherwise unchanged. */
export function formatPhone(e164: string): string {
  const match = /^\+(421|420)(\d{3})(\d{3})(\d{3})$/.exec(e164)
  return match ? `+${match[1]} ${match[2]} ${match[3]} ${match[4]}` : e164
}
