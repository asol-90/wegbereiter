/**
 * Pure helpers for the Jahreskalender: build the 6×7 day grid of a month
 * (Mon–Sun), and classify each ISO date against a FerienCacheEntry so the
 * render layer can style Ferien-Bänder und Feiertage.
 *
 * All dates in ISO 'yyyy-MM-dd'. Week starts on Monday to match the wireframe.
 */
import type {Feiertag, Ferien, FerienCacheEntry, IsoDate} from '@/domain/types';

export type MonthCell =
  | { kind: 'empty' }
  | { kind: 'day'; iso: IsoDate; day: number; weekday: number /* 0 = Mon … 6 = Sun */ }

export type WeekRow = [
  MonthCell,
  MonthCell,
  MonthCell,
  MonthCell,
  MonthCell,
  MonthCell,
  MonthCell,
]

/** Zero-pad a number to two digits. */
function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

/** Days in a given month (year/monthIndex 0-based). */
export function daysInMonth(year: number, monthIndex: number): number {
  // Day 0 of next month = last day of this month.
  return new Date(year, monthIndex + 1, 0).getDate()
}

/** Build an ISO date string for (year, 0-based monthIndex, 1-based day). */
function isoFor(year: number, monthIndex: number, day: number): IsoDate {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`
}

/** Mon=0, Tue=1, …, Sun=6. */
function dayOfWeekMondayFirst(year: number, monthIndex: number, day: number): number {
  const jsDow = new Date(year, monthIndex, day).getDay() // 0=Sun..6=Sat
  return (jsDow + 6) % 7
}

/**
 * Build the 6×7 grid for a month. Leading/trailing cells outside the month
 * are returned as `{ kind: 'empty' }`. Always exactly 6 rows of 7 cells.
 */
export function buildMonthGrid(year: number, monthIndex: number): WeekRow[] {
  const count = daysInMonth(year, monthIndex)
  const leading = dayOfWeekMondayFirst(year, monthIndex, 1)

  const cells: MonthCell[] = []
  for (let i = 0; i < leading; i += 1) cells.push({ kind: 'empty' })
  for (let d = 1; d <= count; d += 1) {
    cells.push({
      kind: 'day',
      iso: isoFor(year, monthIndex, d),
      day: d,
      weekday: dayOfWeekMondayFirst(year, monthIndex, d),
    })
  }
  while (cells.length < 42) cells.push({ kind: 'empty' })

  const rows: WeekRow[] = []
  for (let r = 0; r < 6; r += 1) {
    rows.push(cells.slice(r * 7, r * 7 + 7) as unknown as WeekRow)
  }
  return rows
}

/** Classification of a single day for Ferien/Feiertag shading. */
export type DayClassification = {
  /** The ferien this day belongs to, if any. */
  ferien?: Ferien
  /** True if this is the first day of its ferien range (for pill left-rounding). */
  ferienFirst?: boolean
  /** True if this is the last day. */
  ferienLast?: boolean
  /** The feiertag if the day is one. */
  feiertag?: Feiertag
}

export function classifyDay(
  iso: IsoDate,
  entry: FerienCacheEntry | null | undefined,
): DayClassification {
  if (!entry) return {}
  const ferien = entry.ferien.find((f) => iso >= f.start && iso <= f.ende)
  const feiertag = entry.feiertage.find((f) => f.datum === iso)
  const out: DayClassification = {}
  if (ferien) {
    out.ferien = ferien
    if (iso === ferien.start) out.ferienFirst = true
    if (iso === ferien.ende) out.ferienLast = true
  }
  if (feiertag) {
    out.feiertag = feiertag
    // Standalone Feiertag (not inside a Ferien range) gets pill-rounding
    if (!ferien) {
      out.ferienFirst = true
      out.ferienLast = true
    }
  }
  return out
}

export const MONTH_NAMES_DE = [
  'Januar',
  'Februar',
  'März',
  'April',
  'Mai',
  'Juni',
  'Juli',
  'August',
  'September',
  'Oktober',
  'November',
  'Dezember',
] as const

export const WEEKDAY_HEADERS = ['M', 'D', 'M', 'D', 'F', 'S', 'S'] as const
