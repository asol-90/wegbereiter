/**
 * Jahreskalender — 12 MiniMonth grids in a 3×4 layout (linke Startseiten-Spalte).
 *
 * Shows Planungen as colored markers on their Treffen-Tage. Cross-hover with
 * the Planungsliste is driven by the `highlightedPlanungId` prop and the
 * `onPlanungHover` callback, controlled by the parent (OverviewPage) so that
 * both sides stay in sync.
 */
import { useMemo } from 'react'
import type { PlanungId } from '@/domain/ids'
import type { Planung, StammKontext, StammAktion } from '@/domain/types'
import type { PlanungMarker } from './MiniMonth'
import { IconButton } from '@/ui/primitives/IconButton'
import { MiniMonth } from './MiniMonth'
import { useFerienForYear } from './useFerienForYear'
import { useStammKontext } from '@/features/stammKontext'
import styles from './Jahreskalender.module.css'

export type JahreskalenderProps = {
  year: number
  planungen: readonly Planung[]
  highlightedPlanungId: PlanungId | null
  onPlanungHover: (id: PlanungId | null) => void
  canGoBack: boolean
  canGoForward: boolean
  isCurrentYear: boolean
  onGoBack: () => void
  onGoForward: () => void
  onGoToday: () => void
}

/**
 * Deterministic palette for distinguishing multiple Planungen. We stay in the
 * purple/blue family of the wireframe (var(--wb-s) family) so the markers
 * don't conflict semantically with WB colors elsewhere in the app.
 */
const PALETTE = [
  'var(--wb-s)',
  'var(--acc)',
  'var(--wb-i)',
  '#a897e8',
  '#6b63c9',
  '#8e88d4',
] as const

function colorForIndex(i: number): string {
  return PALETTE[i % PALETTE.length]
}

/**
 * Build a Set of 'YYYY-MM' keys for all months that a StammKontext covers.
 */
function stammMonths(kontexte: readonly StammKontext[], year: number): Set<string> {
  const months = new Set<string>()
  for (const k of kontexte) {
    for (const t of k.treffen) {
      if (t.datum.startsWith(`${year}`)) {
        months.add(t.datum.slice(0, 7))
      }
    }
    for (const a of k.stammaktionen) {
      const start = a.beginn
      const end = a.ende
      if (start.startsWith(`${year}`)) months.add(start.slice(0, 7))
      if (end.startsWith(`${year}`)) months.add(end.slice(0, 7))
    }
  }
  return months
}

/**
 * Collect all individual Stammtermin ISO dates per month key (YYYY-MM).
 */
function stammDatesPerMonth(
  kontexte: readonly StammKontext[],
  year: number,
): Map<string, string[]> {
  const result = new Map<string, string[]>()
  for (const k of kontexte) {
    for (const t of k.treffen) {
      if (t.datum.startsWith(`${year}`)) {
        const key = t.datum.slice(0, 7)
        const arr = result.get(key) ?? []
        arr.push(t.datum)
        result.set(key, arr)
      }
    }
  }
  return result
}

/**
 * Collect Stammaktionen that overlap each month (YYYY-MM key).
 * A multi-month Stammaktion appears in every month it touches.
 */
function stammAktionenPerMonth(
  kontexte: readonly StammKontext[],
  year: number,
): Map<string, StammAktion[]> {
  const result = new Map<string, StammAktion[]>()
  const yStr = String(year)
  for (const k of kontexte) {
    for (const a of k.stammaktionen) {
      // Walk each month of the year and check overlap
      for (let m = 0; m < 12; m++) {
        const mKey = `${yStr}-${m < 9 ? '0' : ''}${m + 1}`
        const monthStart = `${mKey}-01`
        // Last day of month
        const lastDay = new Date(year, m + 1, 0).getDate()
        const monthEnd = `${mKey}-${lastDay}`
        // Overlap check: aktion.beginn <= monthEnd && aktion.ende >= monthStart
        if (a.beginn <= monthEnd && a.ende >= monthStart) {
          const arr = result.get(mKey) ?? []
          arr.push(a)
          result.set(mKey, arr)
        }
      }
    }
  }
  return result
}

export function Jahreskalender({
  year,
  planungen,
  highlightedPlanungId,
  onPlanungHover,
  canGoBack,
  canGoForward,
  isCurrentYear,
  onGoBack,
  onGoForward,
  onGoToday,
}: JahreskalenderProps) {
  const ferien = useFerienForYear(year)
  const { kontexte } = useStammKontext()

  const markers = useMemo<PlanungMarker[]>(
    () =>
      planungen.map((p, i) => ({
        planungId: p.id,
        color: colorForIndex(i),
        dates: p.treffen.map((t) => t.datum),
      })),
    [planungen],
  )

  const stammCoveredMonths = useMemo(
    () => stammMonths(kontexte, year),
    [kontexte, year],
  )

  const stammDatesMap = useMemo(
    () => stammDatesPerMonth(kontexte, year),
    [kontexte, year],
  )

  const stammAktionenMap = useMemo(
    () => stammAktionenPerMonth(kontexte, year),
    [kontexte, year],
  )

  return (
    <div className={styles.root}>
      <div className={styles.yearNav}>
        <IconButton
          icon="chevron-left"
          size={14}
          label="Vorheriges Jahr"
          onClick={onGoBack}
          disabled={!canGoBack}
        />
        <span className={styles.yearTitle}>{year}</span>
        <IconButton
          icon="chevron-right"
          size={14}
          label="Nächstes Jahr"
          onClick={onGoForward}
          disabled={!canGoForward}
        />
        {!isCurrentYear && (
          <button
            type="button"
            className={styles.todayBtn}
            onClick={onGoToday}
          >
            Heute
          </button>
        )}
      </div>
      <div className={styles.grid}>
        {Array.from({ length: 12 }, (_, m) => {
          const monthKey = `${year}-${m < 9 ? '0' : ''}${m + 1}`
          return (
            <MiniMonth
              key={m}
              year={year}
              monthIndex={m}
              ferien={ferien}
              markers={markers}
              highlightedPlanungId={highlightedPlanungId}
              onPlanungHover={onPlanungHover}
              stammCovered={stammCoveredMonths.has(monthKey)}
              stammDates={stammDatesMap.get(monthKey)}
              stammAktionen={stammAktionenMap.get(monthKey)}
            />
          )
        })}
      </div>
    </div>
  )
}
