/**
 * Pure helpers for JahresplanerSidebar.
 *
 * The sidebar quantizes a year into 24 half-month rows (Jan top, Jan mid,
 * Feb top, …). These helpers convert between ISO dates, row indices, and
 * % positions, plus filter/span logic for Planungen and Stammkontexte.
 */
import { parseIso } from '@/domain/dateUtils'
import type { Planung, StammKontext } from '@/domain/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

export const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const

/** Convert an ISO date into a fractional row index (0–24) within a year. */
export function dateToRow(iso: string, year: number): number {
  const d = parseIso(iso)
  const m = d.getMonth()
  const day = d.getDate()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  return m * 2 + ((day - 1) / (daysInMonth - 1)) * 2
}

export function rowToPercent(row: number): number {
  return (row / 24) * 100
}

export function planungInYear(p: Planung, year: number): boolean {
  const prefix = `${year}`
  if (p.treffen.some((t) => t.datum.startsWith(prefix))) return true
  return p.zeitraum.start <= `${year}-12-31` && p.zeitraum.ende >= `${year}-01-01`
}

export function kontextInYear(k: StammKontext, year: number): boolean {
  const prefix = `${year}`
  return (
    k.treffen.some((t) => t.datum.startsWith(prefix))
    || k.stammaktionen.some((a) => a.beginn.startsWith(prefix) || a.ende.startsWith(prefix))
  )
}

export function kontextRowSpan(k: StammKontext, year: number): { top: number; bottom: number } | null {
  const dates: string[] = []
  for (const t of k.treffen) if (t.datum.startsWith(`${year}`)) dates.push(t.datum)
  for (const a of k.stammaktionen) {
    if (a.beginn.startsWith(`${year}`)) dates.push(a.beginn)
    if (a.ende.startsWith(`${year}`)) dates.push(a.ende)
  }
  if (dates.length === 0) return null
  dates.sort()
  const firstMonth = parseInt(dates[0]!.slice(5, 7), 10) - 1
  const lastMonth = parseInt(dates[dates.length - 1]!.slice(5, 7), 10) - 1
  return { top: firstMonth * 2, bottom: (lastMonth + 1) * 2 }
}

export function planungRowSpan(p: Planung, year: number): { top: number; bottom: number } | null {
  if (!planungInYear(p, year)) return null
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const clampedStart = p.zeitraum.start < yearStart ? yearStart : p.zeitraum.start
  const clampedEnd = p.zeitraum.ende > yearEnd ? yearEnd : p.zeitraum.ende
  return { top: dateToRow(clampedStart, year), bottom: dateToRow(clampedEnd, year) }
}

export function formatKontextRange(k: StammKontext): string {
  const allDates = [
    ...k.treffen.map((t) => t.datum),
    ...k.stammaktionen.map((a) => a.beginn),
    ...k.stammaktionen.map((a) => a.ende),
  ].sort()
  if (allDates.length === 0) return ''
  const first = parseIso(allDates[0]!)
  const last = parseIso(allDates[allDates.length - 1]!)
  return `${format(first, 'MMM yyyy', { locale: de })} – ${format(last, 'MMM yyyy', { locale: de })}`
}

/** Translate a [startRow, endRow] selection into a [start, ende] ISO date pair. */
export function dragSelectionToZeitraum(
  startRow: number, endRow: number, year: number,
): { start: string; ende: string } | null {
  const minRow = Math.min(startRow, endRow)
  const maxRow = Math.max(startRow, endRow)
  const startMonth = Math.floor(minRow / 2)
  const endMonth = Math.floor(maxRow / 2)
  if (endMonth < startMonth) return null
  const startDay = minRow % 2 === 0 ? '01' : '15'
  const endDay = maxRow % 2 === 0 ? '15' : new Date(year, endMonth + 1, 0).getDate().toString().padStart(2, '0')
  return {
    start: `${year}-${(startMonth + 1).toString().padStart(2, '0')}-${startDay}`,
    ende: `${year}-${(endMonth + 1).toString().padStart(2, '0')}-${endDay}`,
  }
}
