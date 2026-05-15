/**
 * planungskalenderGrid — pure helper that builds the continuous week-row grid
 * for the Planungsansicht Kalender (concept §8).
 *
 * Unlike the Jahreskalender (12 separate MiniMonths), this generates a single
 * scrollable strip of week rows spanning the Planung's zeitraum.  Months flow
 * into each other; visual separation comes from alternating background shade
 * (even/odd month index) and a small month label in the first cell of each
 * new month.
 *
 * All dates are ISO 'yyyy-MM-dd'.  Week starts on Monday (Mo–So).
 */
import type {IsoDate, Treffen} from '@/domain/types';

// ─── Types ──────────────────────────────────────────────────────────────────

export type CalendarCell =
  | { kind: 'empty'; shaded: boolean }
  | {
      kind: 'day'
      iso: IsoDate
      day: number
      /** 0 = Mo … 6 = So */
      weekday: number
      /** Month index 0–11 */
      monthIndex: number
      /** Full year */
      year: number
      /** Alternating shade per month (even monthIndex → shaded). */
      shaded: boolean
      /** True if this is the first day of a new month in the grid → show label. */
      monthLabel: string | null
      /** True if this day falls within the Planung's zeitraum. */
      inZeitraum: boolean
    }

export type CalendarWeekRow = readonly CalendarCell[]

export type TreffenLookup = ReadonlyMap<IsoDate, Treffen>

// ─── Helpers ────────────────────────────────────────────────────────────────

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

function isoFor(year: number, month: number, day: number): IsoDate {
  return `${year}-${pad2(month + 1)}-${pad2(day)}`
}

/** Monday = 0, …, Sunday = 6. */
function dowMon(date: Date): number {
  return (date.getDay() + 6) % 7
}

const MONTH_LABELS_SHORT = [
  'Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun',
  'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez',
] as const

// ─── Grid builder ───────────────────────────────────────────────────────────

/**
 * Build the continuous week-row grid for a Planung's zeitraum.
 *
 * The grid starts at the Monday of the week containing `zeitraumStart` and
 * ends at the Sunday of the week containing `zeitraumEnde`.  Days outside
 * the zeitraum but inside the bounding weeks are marked `inZeitraum: false`.
 *
 * @returns An array of week rows (each exactly 7 cells, Mo–So).
 */
export function buildPlanungskalenderGrid(
  zeitraumStart: IsoDate,
  zeitraumEnde: IsoDate,
): CalendarWeekRow[] {
  const start = new Date(zeitraumStart)
  const end = new Date(zeitraumEnde)

  // Clamp to bounding Monday and Sunday.
  const firstMonday = new Date(start)
  firstMonday.setDate(firstMonday.getDate() - dowMon(firstMonday))

  const lastSunday = new Date(end)
  lastSunday.setDate(lastSunday.getDate() + (6 - dowMon(lastSunday)))

  const rows: CalendarWeekRow[] = []
  const cursor = new Date(firstMonday)
  let prevMonth = -1

  while (cursor <= lastSunday) {
    const week: CalendarCell[] = []
    for (let d = 0; d < 7; d++) {
      const y = cursor.getFullYear()
      const m = cursor.getMonth()
      const day = cursor.getDate()
      const iso = isoFor(y, m, day)
      const isNewMonth = m !== prevMonth
      const shaded = m % 2 === 0

      week.push({
        kind: 'day',
        iso,
        day,
        weekday: d,
        monthIndex: m,
        year: y,
        shaded,
        monthLabel: isNewMonth ? MONTH_LABELS_SHORT[m] : null,
        inZeitraum: iso >= zeitraumStart && iso <= zeitraumEnde,
      })

      prevMonth = m
      cursor.setDate(cursor.getDate() + 1)
    }
    rows.push(week)
  }

  return rows
}

// ─── Treffen-Lookup builder ─────────────────────────────────────────────────

/**
 * Build a Map<IsoDate, Treffen> from a Planung's treffen array for O(1)
 * lookups per calendar cell.
 */
export function buildTreffenLookup(treffen: readonly Treffen[]): TreffenLookup {
  const map = new Map<IsoDate, Treffen>()
  for (const t of treffen) {
    map.set(t.datum, t)
  }
  return map
}

/**
 * Short weekday headers matching the wireframe: Mo Di Mi Do Fr Sa So.
 */
export const WEEKDAY_HEADERS_LONG = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'] as const
