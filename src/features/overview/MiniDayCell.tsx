/**
 * MiniDayCell — single day cell inside MiniMonth's 6×7 grid.
 *
 * Renders the bands (Ferien/Stammaktion/extern), the Planungs-Marker pills
 * and the day label, all stacked on top of each other.
 */
import type { PlanungId } from '@/domain/ids'
import type { IsoDate } from '@/domain/types'
import clsx from '@/ui/utils/clsx'
import styles from './MiniMonth.module.css'
import type { PlanungMarker } from './MiniMonth'
import {
  blendWithWhite,
  pickMarkerRatio,
  type CellInfo,
} from './miniMonthHelpers'

export type MiniDayCellProps = {
  iso: IsoDate
  day: number
  info: CellInfo
  isToday: boolean
  cellMarkers: PlanungMarker[]
  highlightedPlanungId: PlanungId | null
  onPlanungHover: (id: PlanungId | null) => void
  onBandHover: (label: string | null) => void
  onDayClick?: (date: IsoDate) => void
}

export function MiniDayCell({
  iso,
  day,
  info,
  isToday,
  cellMarkers,
  highlightedPlanungId,
  onPlanungHover,
  onBandHover,
  onDayClick,
}: MiniDayCellProps) {
  const { bands, textColor, isWeekend, isOutOfRange, feiertagOrFerienTitle } = info
  const isClickable = !isOutOfRange && !!onDayClick

  return (
    <div
      className={clsx(
        styles.mmD,
        isWeekend && !textColor && styles.we,
        isToday && styles.today,
        isOutOfRange && styles.mmDDisabled,
        isClickable && styles.mmDClickable,
      )}
      title={feiertagOrFerienTitle}
      data-out-of-range={isOutOfRange ? '' : undefined}
      onClick={isClickable ? () => onDayClick!(iso) : undefined}
    >
      {bands.map((b, i) => (
        <span
          key={i}
          className={clsx(
            styles.band,
            b.isFirst && !b.isLast && styles.bandFirst,
            b.isLast && !b.isFirst && styles.bandLast,
            b.isFirst && b.isLast && styles.bandCircle,
          )}
          style={{ background: b.bg }}
          onMouseEnter={b.hoverLabel ? () => onBandHover(b.hoverLabel!) : undefined}
          onMouseLeave={b.hoverLabel ? () => onBandHover(null) : undefined}
        />
      ))}
      {cellMarkers.map((m) => (
        <span
          key={m.planungId}
          className={styles.marker}
          style={{ background: blendWithWhite(m.color, pickMarkerRatio(m, highlightedPlanungId)) }}
          onMouseEnter={() => onPlanungHover(m.planungId)}
          onMouseLeave={() => onPlanungHover(null)}
        />
      ))}
      <span
        className={styles.mmDLabel}
        style={textColor && !isToday ? { color: textColor } : undefined}
      >
        {day}
      </span>
    </div>
  )
}
