import { describe, expect, it } from 'vitest'
import { decodePayBySquare, encodePayBySquare } from './paybysquare'

describe('PAY by square', () => {
  it('decodes back to the same payment details', () => {
    const qr = encodePayBySquare({
      iban: 'SK31 1200 0000 1987 4263 7541',
      amountCents: 1050,
      currency: 'EUR',
      variableSymbol: '1000234',
      message: 'Ľubomír Švec - Štvrtková partička Nitra',
      beneficiaryName: 'Martin Kováč',
    })
    expect(qr).toMatch(/^[0-9A-V]+$/)
    expect(decodePayBySquare(qr)).toEqual({
      iban: 'SK3112000000198742637541',
      amountCents: 1050,
      currency: 'EUR',
      variableSymbol: '1000234',
      message: 'Lubomir Svec - Stvrtkova particka Nitra',
      beneficiaryName: 'Martin Kovac',
    })
  })
  it('keeps odd cent amounts exact', () => {
    const decoded = decodePayBySquare(
      encodePayBySquare({
        iban: 'SK3112000000198742637541',
        amountCents: 1234,
        currency: 'EUR',
        variableSymbol: '9999999999',
        message: 'Test',
        beneficiaryName: 'Test',
      }),
    )
    expect(decoded.amountCents).toBe(1234)
    expect(decoded.variableSymbol).toBe('9999999999')
  })
})
