/**
 * Helper-Funktionen rund um die Kontext-Blöcke in der Sidebar-Timeline.
 *
 * Liegen in eigener Datei, damit KontextBlock.tsx fast-refresh-fähig
 * bleibt (nur Komponenten exportieren).
 */
import { parseIso } from '@/domain/dateUtils'
import type { StammKontext } from '@/domain/types'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

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

export function kontextRowSpan(k: StammKontext, year: number): { top: number; bottom: number } | null {
  const dates: string[] = []
  for (const t of k.treffen) {
    if (t.datum.startsWith(`${year}`)) dates.push(t.datum)
  }
  for (const a of k.stammaktionen) {
    if (a.beginn.startsWith(`${year}`)) dates.push(a.beginn)
    if (a.ende.startsWith(`${year}`)) dates.push(a.ende)
  }
  if (dates.length === 0) return null
  dates.sort()
  const first = dates[0]!
  const last = dates[dates.length - 1]!
  const firstMonth = parseInt(first.slice(5, 7), 10) - 1
  const lastMonth = parseInt(last.slice(5, 7), 10) - 1
  return { top: firstMonth * 2, bottom: (lastMonth + 1) * 2 }
}

export function kontextInYear(k: StammKontext, year: number): boolean {
  const prefix = `${year}`
  return (
    k.treffen.some((t) => t.datum.startsWith(prefix)) ||
    k.stammaktionen.some((a) => a.beginn.startsWith(prefix) || a.ende.startsWith(prefix))
  )
}
