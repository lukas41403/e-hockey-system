import { describe, expect, it } from 'vitest'
import { formatIban, isValidIban, normalizeIban } from './iban'

describe('iban', () => {
  it.each(['SK3112000000198742637541', 'SK31 1200 0000 1987 4263 7541', 'sk3112000000198742637541', 'CZ6508000000192000145399', 'DE89370400440532013000'])(
    'accepts %s',
    (iban) => expect(isValidIban(iban)).toBe(true),
  )
  it.each([
    ['wrong checksum', 'SK3112000000198742637542'],
    ['wrong length', 'SK311200000019874263754'],
    ['unknown country', 'XX3112000000198742637541'],
    ['letters in SK BBAN', 'SK31120000001987426375AB'],
    ['empty', ''],
  ])('rejects %s', (_, iban) => expect(isValidIban(iban)).toBe(false))
  it('normalizes and formats', () => {
    expect(normalizeIban(' sk31 1200 0000 1987 4263 7541 ')).toBe('SK3112000000198742637541')
    expect(formatIban('SK3112000000198742637541')).toBe('SK31 1200 0000 1987 4263 7541')
  })
})
