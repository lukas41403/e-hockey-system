import { describe, expect, it } from 'vitest'
import { formatPhone, normalizePhone } from './phone'

describe('phone', () => {
  it.each([
    ['0905 123 456', '+421905123456'],
    ['0905123456', '+421905123456'],
    ['+421 905 123 456', '+421905123456'],
    ['00421905123456', '+421905123456'],
    ['905 123 456', '+421905123456'],
  ])('normalizes Slovak %s', (input, expected) => expect(normalizePhone(input)).toBe(expected))
  it('normalizes Czech national numbers for CZ', () => {
    expect(normalizePhone('731 200 013', 'CZ')).toBe('+420731200013')
  })
  it.each(['', 'abc', '12345', '+0123456789'])('rejects %j', (input) => expect(normalizePhone(input)).toBeNull())
  it('formats SK and CZ numbers', () => {
    expect(formatPhone('+421905123456')).toBe('+421 905 123 456')
    expect(formatPhone('+420731200013')).toBe('+420 731 200 013')
    expect(formatPhone('+4915112345678')).toBe('+4915112345678')
  })
})
