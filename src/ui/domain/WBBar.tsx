/**
 * WBBar — horizontal stacked bar visualizing WB distribution (ist vs. soll).
 * Values are normalized so they sum to 1; raw minutes or shares both work.
 */
import { WB_KEYS, WB_CSS_VAR, type WBKey } from '@/domain/wb'
import clsx from '../utils/clsx'
import styles from './WBBar.module.css'

export type WBBarProps = {
  values: Partial<Record<WBKey, number>>
  height?: number
  rounded?: boolean
  className?: string
  /** If provided, dotted markers are drawn at these cumulative positions. */
  targetMarks?: Partial<Record<WBKey, number>>
  ariaLabel?: string
}

export function WBBar({
  values,
  height = 8,
  rounded = true,
  className,
  targetMarks,
  ariaLabel,
}: WBBarProps) {
  const total = WB_KEYS.reduce((sum, k) => sum + (values[k] ?? 0), 0)
  if (total <= 0) {
    return (
      <div
        className={clsx(styles.bar, rounded && styles.rounded, className)}
        style={{ height }}
        aria-label={ariaLabel}
      />
    )
  }

  return (
    <div
      className={clsx(styles.bar, rounded && styles.rounded, className)}
      style={{ height }}
      role="img"
      aria-label={ariaLabel}
    >
      {WB_KEYS.map((wb) => {
        const v = values[wb] ?? 0
        if (v === 0) return null
        const pct = (v / total) * 100
        return (
          <span
            key={wb}
            className={styles.seg}
            style={{
              width: `${pct}%`,
              backgroundColor: `var(${WB_CSS_VAR[wb]})`,
            }}
          />
        )
      })}

      {targetMarks &&
        WB_KEYS.map((wb) => {
          const target = targetMarks[wb]
          if (target == null) return null
          return (
            <span
              key={`mark-${wb}`}
              className={styles.mark}
              style={{ left: `${target * 100}%` }}
            />
          )
        })}
    </div>
  )
}
