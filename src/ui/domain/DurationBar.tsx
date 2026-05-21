/**
 * DurationBar — Zeitbalken visualizing minutes against a budget.
 *
 * Uses a target interval (e.g. 70–90 % of the available time) as the
 * reference band — too little planning is just as off as too much. The
 * tones follow a traffic-light pattern:
 *   - ok  (green)  : ratio inside [targetMin, targetMax]
 *   - warn(yellow) : outside the target band but still within budget
 *   - err (red)    : ratio > 1  (overflow)
 *
 * The target band is drawn behind the fill as a thin dashed frame, so the
 * reason a bar is yellow vs. green is always visible. No thickness change
 * or overflow wave — the colour + label carry the signal.
 */
import clsx from '../utils/clsx'
import styles from './DurationBar.module.css'

export type DurationBarProps = {
  /** Ist-Minuten already scheduled. */
  ist: number
  /** Verfügbare Minuten (Budget). */
  verfuegbar: number
  /**
   * Zielintervall als Anteil vom Budget, [min, max]. Default [0.7, 0.9]:
   * Wir wollen ca. 70–90 % der Zeit verplanen — weniger ist „Lücke", mehr
   * erhöht das Risiko, dass wir's nicht schaffen.
   */
  targetRange?: [number, number]
  /** Minuten die durch Stammkontext-Blöcke belegt sind (grüner Hintergrund). */
  stammMin?: number
  height?: number
  showLabel?: boolean
  className?: string
}

type DurationState = {
  fillPct: number
  stammPct: number
  inTarget: boolean
  tone: 'ok' | 'warn' | 'err'
  ariaText: string
  over: boolean
  overBy: number
}

function computeDurationState(
  ist: number,
  verfuegbar: number,
  targetRange: [number, number],
  stammMin: number,
): DurationState {
  const ratio = verfuegbar > 0 ? ist / verfuegbar : 0
  const over = ratio > 1
  const [targetMin, targetMax] = targetRange
  const inTarget = !over && ratio >= targetMin && ratio <= targetMax
  const tone: DurationState['tone'] = over ? 'err' : inTarget ? 'ok' : 'warn'
  const status = over ? 'überschritten' : inTarget ? 'im Zielbereich' : 'außerhalb Zielbereich'
  return {
    fillPct: Math.min(100, ratio * 100),
    stammPct: verfuegbar > 0 ? Math.min(100, (stammMin / verfuegbar) * 100) : 0,
    inTarget,
    tone,
    ariaText: `${status}: ${ist}/${verfuegbar} min`,
    over,
    overBy: ist - verfuegbar,
  }
}

export function DurationBar({
  ist,
  verfuegbar,
  targetRange = [0.7, 0.9],
  stammMin = 0,
  height = 6,
  showLabel,
  className,
}: DurationBarProps) {
  const state = computeDurationState(ist, verfuegbar, targetRange, stammMin)
  const [targetMin, targetMax] = targetRange

  return (
    <div className={clsx(styles.wrap, styles[`t-${state.tone}`], className)}>
      <div
        className={styles.track}
        style={{ height }}
        role="progressbar"
        aria-valuenow={ist}
        aria-valuemin={0}
        aria-valuemax={verfuegbar}
        aria-valuetext={state.ariaText}
      >
        {stammMin > 0 && (
          <div
            className={styles.stammFill}
            style={{ width: `${state.stammPct}%` }}
            aria-hidden
          />
        )}
        <div
          className={clsx(styles.targetBand, state.inTarget && styles.targetBandHit)}
          style={{
            left: `${targetMin * 100}%`,
            width: `${(targetMax - targetMin) * 100}%`,
          }}
          aria-hidden
        />
        <div className={styles.fill} style={{ width: `${state.fillPct}%` }} />
      </div>
      {showLabel && (
        <div className={styles.label}>
          {ist} / {verfuegbar} min
          {stammMin > 0 && (
            <span className={styles.labelStamm}> · {stammMin} Stamm</span>
          )}
          {state.over && (
            <span className={styles.labelOver}> · +{state.overBy} min</span>
          )}
        </div>
      )}
    </div>
  )
}
