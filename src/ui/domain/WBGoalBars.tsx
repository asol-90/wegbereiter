/**
 * WBGoalBars — one horizontal bar per Wachstumsbereich, each with an
 * optional target interval drawn as a highlighted band on the track.
 *
 * Values and target bounds are expressed as shares (0..1). The widget
 * renders labels, ist-fill, Zielintervall-Band (mit gestrichelten
 * Begrenzungen), und optional die ist-Prozentzahl als Annotation.
 */
import {WB_CSS_VAR, WB_KEYS, WB_LABELS, type WBKey} from '@/domain/wb'
import clsx from '../utils/clsx'
import styles from './WBGoalBars.module.css'

export type WBGoalBarDatum = {
  /** Ist-Anteil (0..1). */
  share: number
  /** Ziel-Intervall als [min, max] in 0..1; optional. */
  target?: [number, number]
}

export type WBGoalBarsProps = {
  data: Partial<Record<WBKey, WBGoalBarDatum>>
  /** Fixed max for the x-axis, default 1 (= 100 %). */
  max?: number
  showPercent?: boolean
  className?: string
}

export function WBGoalBars({
  data,
  max = 1,
  showPercent = true,
  className,
}: WBGoalBarsProps) {
  return (
    <div className={clsx(styles.grid, className)}>
      {WB_KEYS.map((wb) => {
        const entry = data[wb]
        const share = entry?.share ?? 0
        const pct = Math.min(100, (share / max) * 100)
        const target = entry?.target
        const inTarget =
          target != null && share >= target[0] && share <= target[1]
        return (
          <div key={wb} className={styles.row}>
            <div className={styles.label}>{WB_LABELS[wb]}</div>
            <div className={styles.trackWrap}>
              <div className={styles.track}>
                {target && (
                  <div
                    className={clsx(
                      styles.targetBand,
                      inTarget && styles.targetHit,
                    )}
                    style={{
                      left: `${(target[0] / max) * 100}%`,
                      width: `${((target[1] - target[0]) / max) * 100}%`,
                    }}
                  />
                )}
                <div
                  className={styles.fill}
                  style={{
                    width: `${pct}%`,
                    background: `var(${WB_CSS_VAR[wb]})`,
                  }}
                />
              </div>
            </div>
            {showPercent && (
              <div
                className={clsx(
                  styles.percent,
                  target && !inTarget && styles.percentOff,
                )}
              >
                {Math.round(share * 100)}%
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
