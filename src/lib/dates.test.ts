import { describe, expect, it } from 'vitest'
import {
  formatDateTimeLong,
  formatDateTimeShort,
  formatDayShort,
  formatDeadlinePhrase,
  formatTime,
  fromDateTimeLocalValue,
  toDateTimeLocalValue,
} from './dates'

// 2 Oct 2025 21:00 in Bratislava (CEST, UTC+2)
const THURSDAY = '2025-10-02T19:00:00Z'

describe('Slovak date formats in Bratislava time', () => {
  it('long format', () => {
    expect(formatDateTimeLong(THURSDAY)).toBe('štvrtok 2. októbra, 21:00')
  })
  it('short format for lists', () => {
    expect(formatDateTimeShort(THURSDAY)).toBe('št 2. 10., 21:00')
    expect(formatDayShort(THURSDAY)).toBe('št 2. 10.')
    expect(formatTime(THURSDAY)).toBe('21:00')
  })
  it('uses winter time after the DST change', () => {
    expect(formatDateTimeLong('2025-11-06T19:00:00Z')).toBe('štvrtok 6. novembra, 20:00')
  })
})

describe('deadline phrase', () => {
  const now = '2025-09-29T08:00:00Z' // Monday morning
  it('today and tomorrow', () => {
    expect(formatDeadlinePhrase('2025-09-29T19:00:00Z', now)).toBe('dnes do 21:00')
    expect(formatDeadlinePhrase('2025-09-30T19:00:00Z', now)).toBe('zajtra do 21:00')
  })
  it('weekday in genitive within a week', () => {
    expect(formatDeadlinePhrase('2025-10-01T19:00:00Z', now)).toBe('do stredy 21:00')
    expect(formatDeadlinePhrase(THURSDAY, now)).toBe('do štvrtka 21:00')
  })
  it('adds the date when further away', () => {
    expect(formatDeadlinePhrase('2025-10-08T19:00:00Z', now)).toBe('do stredy 8. 10., 21:00')
  })
})

describe('datetime-local conversion', () => {
  it('round-trips Bratislava wall time', () => {
    expect(toDateTimeLocalValue(THURSDAY)).toBe('2025-10-02T21:00')
    expect(fromDateTimeLocalValue('2025-10-02T21:00')).toBe('2025-10-02T19:00:00.000Z')
    expect(fromDateTimeLocalValue('2025-12-04T20:30')).toBe('2025-12-04T19:30:00.000Z')
  })
})
