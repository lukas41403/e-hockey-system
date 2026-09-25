import { describe, expect, it } from 'vitest'
import { centsToInput, formatAmountForBank, formatMoney, parseMoneyInput, quickTopUpAmounts } from './money'

const plain = (value: string) => value.replace(/[\u00a0\u202f]/g, ' ')

describe('formatMoney', () => {
  it('formats euros with two decimals and a decimal comma', () => {
    expect(plain(formatMoney(1050, 'EUR'))).toBe('10,50 €')
    expect(plain(formatMoney(1000, 'EUR'))).toBe('10,00 €')
    expect(plain(formatMoney(125050, 'EUR'))).toBe('1 250,50 €')
  })
  it('formats crowns without decimals when whole', () => {
    expect(plain(formatMoney(45000, 'CZK'))).toBe('450 Kč')
    expect(plain(formatMoney(45050, 'CZK'))).toBe('450,50 Kč')
  })
  it('shows negative amounts and optional plus sign', () => {
    expect(plain(formatMoney(-1050, 'EUR'))).toBe('-10,50 €')
    expect(plain(formatMoney(5000, 'EUR', { signed: true }))).toBe('+50,00 €')
    expect(plain(formatMoney(0, 'EUR', { signed: true }))).toBe('0,00 €')
  })
})

describe('parseMoneyInput', () => {
  it.each([
    ['10', 1000],
    ['10,5', 1050],
    ['10,50', 1050],
    ['10.50', 1050],
    [' 1 000,50 € ', 100050],
    ['450 Kč', 45000],
    ['0,05', 5],
  ])('parses %j', (input, cents) => {
    expect(parseMoneyInput(input)).toBe(cents)
  })
  it.each(['', 'abc', '10,555', '-5', '1,2,3', '10 eur 5'])('rejects %j', (input) => {
    expect(parseMoneyInput(input)).toBeNull()
  })
})

describe('helpers', () => {
  it('formats amounts for bank QR codes', () => {
    expect(formatAmountForBank(1050)).toBe('10.50')
    expect(formatAmountForBank(45000)).toBe('450.00')
    expect(formatAmountForBank(5)).toBe('0.05')
  })
  it('converts cents to an input value', () => {
    expect(centsToInput(1050)).toBe('10,50')
    expect(centsToInput(1000)).toBe('10')
    expect(centsToInput(-205)).toBe('-2,05')
  })
  it('suggests top-ups per currency', () => {
    expect(quickTopUpAmounts('EUR')).toEqual([2000, 5000, 10000])
    expect(quickTopUpAmounts('CZK')).toEqual([50000, 100000, 200000])
  })
})
