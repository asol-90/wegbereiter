/**
 * Pure helpers for AbwesenheitsSidebar. No React, no hooks.
 */
import { parseIso, toIso } from '@/domain/dateUtils'
import type { Abwesenheit, IsoDate } from '@/domain/types'
import { addDays, differenceInCalendarDays, endOfWeek, startOfWeek } from 'date-fns'

export const ACCENT_HUE_SEQUENCE = [220, 160, 40, 280, 70, 320]
const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const

export type WeekRow = {
  monday: IsoDate
  isMonthBorder: boolean
  monthLabel?: string
}

export function buildWeekRows(start: IsoDate, ende: IsoDate): WeekRow[] {
  const rows: WeekRow[] = []
  const sDate = startOfWeek(parseIso(start), { weekStartsOn: 1 })
  const eDate = endOfWeek(parseIso(ende), { weekStartsOn: 1 })
  let cursor = sDate
  let lastMonth = -1

  while (cursor <= eDate) {
    const iso = toIso(cursor) as IsoDate
    const weekEnd = addDays(cursor, 6)

    let isMonthBorder = false
    let monthLabel: string | undefined
    for (let d = new Date(cursor); d <= weekEnd; d = addDays(d, 1)) {
      if (d.getDate() === 1 && d.getMonth() !== lastMonth) {
        isMonthBorder = true
        monthLabel = MONTH_SHORT[d.getMonth()]
        lastMonth = d.getMonth()
        break
      }
    }
    if (rows.length === 0 && !monthLabel) {
      monthLabel = MONTH_SHORT[cursor.getMonth()]
      lastMonth = cursor.getMonth()
    }

    rows.push({ monday: iso, isMonthBorder: isMonthBorder || rows.length === 0, monthLabel })
    cursor = addDays(cursor, 7)
  }
  return rows
}

export function formatDateShort(iso: IsoDate): string {
  const d = parseIso(iso)
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${dayNames[d.getDay()]}, ${day}.${month}.`
}

export function dateToRow(iso: IsoDate, rows: WeekRow[]): number {
  if (rows.length === 0) return 0
  const firstMonday = parseIso(rows[0].monday)
  return differenceInCalendarDays(parseIso(iso), firstMonday) / 7
}

export function rowToDate(row: number, rows: WeekRow[]): IsoDate {
  if (rows.length === 0) return '' as IsoDate
  const firstMonday = parseIso(rows[0].monday)
  return toIso(addDays(firstMonday, Math.round(row * 7))) as IsoDate
}

export function clampDate(iso: IsoDate, start: IsoDate, ende: IsoDate): IsoDate {
  if (iso < start) return start
  if (iso > ende) return ende
  return iso
}

export type ResizeDelta = {
  abs: Abwesenheit
  delta: number
  edge: 'top' | 'bottom'
  weekRows: WeekRow[]
  start: IsoDate
  ende: IsoDate
}

/**
 * Compute the resized [von, bis] pair when the user is dragging a resize handle.
 * Returns the original bounds if the resize would invert the range.
 */
export function applyResize({ abs, delta, edge, weekRows, start, ende }: ResizeDelta): { von: IsoDate; bis: IsoDate } {
  let von = abs.von
  let bis = abs.bis
  if (edge === 'top') {
    von = clampDate(rowToDate(dateToRow(abs.von, weekRows) + delta, weekRows), start, ende)
  } else {
    bis = clampDate(rowToDate(dateToRow(abs.bis, weekRows) + delta, weekRows), start, ende)
  }
  if (von >= bis) return { von: abs.von, bis: abs.bis }
  return { von, bis }
}

export function createSelectionDates(
  startRow: number, currentRow: number, weekRows: WeekRow[], start: IsoDate, ende: IsoDate,
): { von: IsoDate; bis: IsoDate } | null {
  const minRow = Math.min(startRow, currentRow)
  const maxRow = Math.max(startRow, currentRow)
  if (maxRow - minRow <= 0.15) return null
  const von = clampDate(rowToDate(minRow, weekRows), start, ende)
  const bis = clampDate(rowToDate(maxRow, weekRows), start, ende)
  return { von, bis }
}
