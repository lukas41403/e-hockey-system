import { describe, expect, it } from 'vitest'
import { csvAmount, toCsv } from './csv'

describe('csv', () => {
  it('uses BOM, semicolons and CRLF', () => {
    expect(toCsv(['Meno', 'Zostatok'], [['Ľubomír Švec', csvAmount(-7050)]])).toBe(
      '\uFEFFMeno;Zostatok\r\nĽubomír Švec;-70,50\r\n',
    )
  })
  it('quotes cells with separators, quotes and line breaks', () => {
    expect(toCsv(['a'], [['x;y'], ['say "hi"'], ['line\nbreak'], [null]])).toBe(
      '\uFEFFa\r\n"x;y"\r\n"say ""hi"""\r\n"line\nbreak"\r\n\r\n',
    )
  })
  it('formats amounts with a decimal comma', () => {
    expect(csvAmount(1050)).toBe('10,50')
    expect(csvAmount(5)).toBe('0,05')
    expect(csvAmount(0)).toBe('0,00')
  })
})
