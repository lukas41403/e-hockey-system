// All dates are shown in Bratislava time, regardless of the device time zone.
import { TZDate } from '@date-fns/tz'

export const TIME_ZONE = 'Europe/Bratislava'

type DateInput = string | Date

const toDate = (value: DateInput) => (typeof value === 'string' ? new Date(value) : value)

const partsFormatter = new Intl.DateTimeFormat('sk-SK', {
  timeZone: TIME_ZONE,
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})
const shortPartsFormatter = new Intl.DateTimeFormat('sk-SK', {
  timeZone: TIME_ZONE,
  weekday: 'short',
  day: 'numeric',
  month: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

function parts(formatter: Intl.DateTimeFormat, value: DateInput): Record<string, string> {
  const result: Record<string, string> = {}
  for (const part of formatter.formatToParts(toDate(value))) {
    if (part.type !== 'literal') result[part.type] = part.value
  }
  return result
}

/** "štvrtok 2. októbra, 21:00" */
export function formatDateTimeLong(value: DateInput): string {
  const p = parts(partsFormatter, value)
  return `${p.weekday} ${p.day}. ${p.month}, ${p.hour}:${p.minute}`
}

/** "štvrtok 2. októbra" */
export function formatDateLong(value: DateInput): string {
  const p = parts(partsFormatter, value)
  return `${p.weekday} ${p.day}. ${p.month}`
}

/** "št 2. 10., 21:00" */
export function formatDateTimeShort(value: DateInput): string {
  const p = parts(shortPartsFormatter, value)
  return `${p.weekday} ${p.day}. ${p.month}., ${p.hour}:${p.minute}`
}

/** "št 2. 10." */
export function formatDayShort(value: DateInput): string {
  const p = parts(shortPartsFormatter, value)
  return `${p.weekday} ${p.day}. ${p.month}.`
}

/** "21:00" */
export function formatTime(value: DateInput): string {
  const p = parts(shortPartsFormatter, value)
  return `${p.hour}:${p.minute}`
}

/** Local calendar date "2025-10-02" in Bratislava. */
export function localDateKey(value: DateInput): string {
  const p = parts(isoDateFormatter, value)
  return `${p.year}-${p.month}-${p.day}`
}

const GENITIVE_WEEKDAYS: Record<string, string> = {
  pondelok: 'pondelka',
  utorok: 'utorka',
  streda: 'stredy',
  štvrtok: 'štvrtka',
  piatok: 'piatka',
  sobota: 'soboty',
  nedeľa: 'nedele',
}

function daysBetween(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(`${toKey}T00:00:00Z`) - Date.parse(`${fromKey}T00:00:00Z`)) / 86_400_000)
}

/**
 * Deadline phrase for "Bezplatne sa odhlásiš …": "dnes do 21:00", "zajtra do 21:00",
 * "do stredy 21:00", or with a date when it is more than 6 days away "do stredy 8. 10., 21:00".
 */
export function formatDeadlinePhrase(deadline: DateInput, now: DateInput = new Date()): string {
  const days = daysBetween(localDateKey(now), localDateKey(deadline))
  const time = formatTime(deadline)
  if (days === 0) return `dnes do ${time}`
  if (days === 1) return `zajtra do ${time}`
  const weekday = GENITIVE_WEEKDAYS[parts(partsFormatter, deadline).weekday ?? ''] ?? ''
  if (days > 1 && days <= 6) return `do ${weekday} ${time}`
  const p = parts(shortPartsFormatter, deadline)
  return `do ${weekday} ${p.day}. ${p.month}., ${time}`
}

/** "dnes", "zajtra", "o 3 dni" style relative day label for list headers; null when further away. */
export function relativeDayLabel(value: DateInput, now: DateInput = new Date()): string | null {
  const days = daysBetween(localDateKey(now), localDateKey(value))
  if (days === 0) return 'dnes'
  if (days === 1) return 'zajtra'
  return null
}

/** Value for <input type="datetime-local"> in Bratislava time: "2025-10-02T21:00". */
export function toDateTimeLocalValue(value: DateInput): string {
  const p = parts(isoDateFormatter, value)
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`
}

/** Interprets "2025-10-02T21:00" as Bratislava wall-clock time and returns an ISO timestamp. */
export function fromDateTimeLocalValue(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value)
  if (!match) throw new Error(`Invalid datetime-local value: ${value}`)
  const [, y, m, d, h, min] = match.map(Number) as [number, number, number, number, number, number]
  return new Date(new TZDate(y, m - 1, d, h, min, TIME_ZONE).getTime()).toISOString()
}

export function addMinutes(value: DateInput, minutes: number): Date {
  return new Date(toDate(value).getTime() + minutes * 60_000)
}

export function addHours(value: DateInput, hours: number): Date {
  return addMinutes(value, hours * 60)
}
