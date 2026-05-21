/**
 * MiniMonth — one 6×7 month grid used inside Jahreskalender.
 *
 * Rendering layers per day cell (front-to-back):
 *   1. Day number (text — color adapts to topmost layer)
 *   2. Planungs-Marker pill (colored, solid-mixed with white)
 *   3. Bands: Ferien/Feiertag (beige) and/or Stammaktion/Stammtermin (green)
 *      — all rendered identically via the shared `.band` class, just different color.
 *
 * Cross-Hover semantics (concept §6, per-Planung, not per-Treffen):
 *   - `highlightedPlanungId` shows all markers of that Planung at 55% blend.
 *   - Non-highlighted markers dim to 8%.
 *   - Hover on a marker reports `onPlanungHover(planungId)`.
 *   - The month gets a border when any of its Planungen is highlighted.
 */
import { isoToday } from '@/domain/dateUtils'
import type { PlanungId } from '@/domain/ids'
import type { FerienCacheEntry, IsoDate, StammAktion } from '@/domain/types'
import clsx from '@/ui/utils/clsx'
import { useState } from 'react'
import { MiniDayCell } from './MiniDayCell'
import {
  buildMarkerIndex,
  computeCellInfo,
  isPlanungHighlightedInMonth,
} from './miniMonthHelpers'
import styles from './MiniMonth.module.css'
import { buildMonthGrid, MONTH_NAMES_DE, WEEKDAY_HEADERS } from './monthGrid'

export type PlanungMarker = {
  planungId: PlanungId
  /** CSS color for the marker pill. */
  color: string
  /** ISO dates on which this Planung has a Treffen. */
  dates: IsoDate[]
}

export type MiniMonthProps = {
  year: number
  /** 0-based month index (Jan = 0). */
  monthIndex: number
  ferien: FerienCacheEntry | null | undefined
  markers: PlanungMarker[]
  highlightedPlanungId: PlanungId | null
  onPlanungHover: (id: PlanungId | null) => void
  /** Whether this month is covered by a Stammkontext (dezenter Rahmen). */
  stammCovered?: boolean
  /** ISO dates of Stammtermine in this month. */
  stammDates?: IsoDate[]
  /** Stammaktionen that overlap this month. */
  stammAktionen?: StammAktion[]
  /** Distrikt- and Regionaltaktionen that overlap this month (rendered blue). */
  externAktionen?: StammAktion[]
  /** Optional Kontext-Range: days outside this range are dimmed and non-interactive. */
  kontextRange?: { start: IsoDate; ende: IsoDate }
  /** Called when an in-range day cell is clicked (only if kontextRange is set). */
  onDayClick?: (date: IsoDate) => void
}

export function MiniMonth({
  year,
  monthIndex,
  ferien,
  markers,
  highlightedPlanungId,
  onPlanungHover,
  stammCovered: _stammCovered,
  stammDates,
  stammAktionen,
  externAktionen,
  kontextRange,
  onDayClick,
}: MiniMonthProps) {
  const grid = buildMonthGrid(year, monthIndex)
  const today = isoToday()
  const [stammHover, setStammHover] = useState<string | null>(null)

  const markerIndex = buildMarkerIndex(markers)
  const stammSet = new Set(stammDates ?? [])
  const aktionen: StammAktion[] = stammAktionen ?? []
  const externAkt: StammAktion[] = externAktionen ?? []
  const highlightedInMonth = isPlanungHighlightedInMonth(
    markers,
    highlightedPlanungId,
    year,
    monthIndex,
  )

  return (
    <div className={clsx(styles.mmCal, highlightedInMonth && styles.mmCalHl)}>
      {stammHover && <div className={styles.stammTooltip}>{stammHover}</div>}
      <div className={styles.mmName}>{MONTH_NAMES_DE[monthIndex]}</div>
      <div className={styles.mmHdr}>
        {WEEKDAY_HEADERS.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      {grid.map((row, ri) => (
        <div key={ri} className={styles.mmWk}>
          {row.map((cell, ci) => {
            if (cell.kind === 'empty') {
              return <div key={ci} className={clsx(styles.mmD, styles.mmDe)} />
            }
            const cellMarkers = markerIndex.get(cell.iso) ?? []
            const info = computeCellInfo({
              iso: cell.iso,
              weekday: cell.weekday,
              ferien,
              markers: cellMarkers,
              highlightedPlanungId,
              stammSet,
              aktionen,
              externAkt,
              kontextRange,
            })
            return (
              <MiniDayCell
                key={ci}
                iso={cell.iso}
                day={cell.day}
                info={info}
                isToday={cell.iso === today}
                cellMarkers={cellMarkers}
                highlightedPlanungId={highlightedPlanungId}
                onPlanungHover={onPlanungHover}
                onBandHover={setStammHover}
                onDayClick={onDayClick}
              />
            )
          })}
        </div>
      ))}
    </div>
  )
}
