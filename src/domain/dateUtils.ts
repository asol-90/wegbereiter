/**
 * Date utilities. All dates are ISO-Strings 'yyyy-MM-dd' unless noted.
 *
 * Rationale: keeping dates as strings in the domain layer avoids timezone
 * surprises and keeps IndexedDB round-trips lossless.
 */
import {
  addDays,
  addWeeks,
  differenceInCalendarDays,
  format,
  getDay,
  isAfter,
  isBefore,
  isEqual,
  parseISO,
  startOfDay,
} from 'date-fns'
import type { IsoDate, Rhythmus, Weekday } from './types'

export const WEEKDAY_INDEX: Record<Weekday, number> = {
  montag: 1,
  dienstag: 2,
  mittwoch: 3,
  donnerstag: 4,
  freitag: 5,
  samstag: 6,
  // date-fns uses 0=Sunday, 1=Monday, … 6=Saturday
  sonntag: 0,
}

export function toIso(d: Date): IsoDate {
  return format(d, 'yyyy-MM-dd')
}

export function parseIso(iso: IsoDate): Date {
  return startOfDay(parseISO(iso))
}

export function isoToday(now: Date = new Date()): IsoDate {
  return toIso(now)
}

export function rhythmusWeekInterval(r: Rhythmus): number {
  switch (r.kind) {
    case 'weekly':
      return 1
    case 'biweekly':
      return 2
    case 'monthly':
      return 4
    case 'custom':
      return Math.max(1, Math.floor(r.weekCount))
  }
}

/**
 * Generate the sequence of dates for regular meetings.
 *
 * Algorithm: find the first occurrence of `weekday` within [start, ende],
 * then step forward by `rhythmusWeekInterval` weeks until after `ende`.
 */
export function generateTermine(
  start: IsoDate,
  ende: IsoDate,
  weekday: Weekday,
  rhythmus: Rhythmus,
): IsoDate[] {
  const startDate = parseIso(start)
  const endeDate = parseIso(ende)
  if (isBefore(endeDate, startDate)) return []

  const targetDow = WEEKDAY_INDEX[weekday]
  let cursor = startDate
  const currentDow = getDay(cursor)
  const daysToAdd = (targetDow - currentDow + 7) % 7
  cursor = addDays(cursor, daysToAdd)

  const weeks = rhythmusWeekInterval(rhythmus)
  const result: IsoDate[] = []
  while (!isAfter(cursor, endeDate)) {
    result.push(toIso(cursor))
    cursor = addWeeks(cursor, weeks)
  }
  return result
}

export function isoEquals(a: IsoDate, b: IsoDate): boolean {
  return isEqual(parseIso(a), parseIso(b))
}

export function daysBetween(a: IsoDate, b: IsoDate): number {
  return differenceInCalendarDays(parseIso(b), parseIso(a))
}

export function weeksBetween(a: IsoDate, b: IsoDate): number {
  return Math.round(daysBetween(a, b) / 7)
}
