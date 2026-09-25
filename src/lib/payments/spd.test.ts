import { describe, expect, it } from 'vitest'
import { decodeSpd, encodeSpd } from './spd'

const payment = {
  iban: 'CZ65 0800 0000 1920 0014 5399',
  amountCents: 45000,
  currency: 'CZK' as const,
  variableSymbol: '1000234',
  message: 'Jiří Dvořák - Úterní hokej Brno',
  beneficiaryName: 'Petr Novák',
}

describe('SPD (QR Platba)', () => {
  it('produces the SPD 1.0 format', () => {
    expect(encodeSpd(payment)).toBe(
      'SPD*1.0*ACC:CZ6508000000192000145399*AM:450.00*CC:CZK*X-VS:1000234*MSG:Jiri Dvorak - Uterni hokej Brno*RN:Petr Novak',
    )
  })
  it('escapes the field separator inside values', () => {
    const text = encodeSpd({ ...payment, message: 'Hokej *utorok*' })
    expect(text).toContain('MSG:Hokej %2Autorok%2A')
    expect(decodeSpd(text).message).toBe('Hokej *utorok*')
  })
  it('round-trips', () => {
    expect(decodeSpd(encodeSpd(payment))).toEqual({
      ...payment,
      iban: 'CZ6508000000192000145399',
      message: 'Jiri Dvorak - Uterni hokej Brno',
      beneficiaryName: 'Petr Novak',
    })
  })
  it('limits the message to 60 characters', () => {
    const text = encodeSpd({ ...payment, message: 'x'.repeat(100) })
    expect(decodeSpd(text).message).toHaveLength(60)
  })
  it('rejects an invalid variable symbol', () => {
    expect(() => encodeSpd({ ...payment, variableSymbol: '12345678901' })).toThrow()
  })
})
