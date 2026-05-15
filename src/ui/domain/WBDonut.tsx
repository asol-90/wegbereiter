/**
 * WBDonut — compact donut/pie chart for WB distribution. Drawn as a conic
 * gradient via CSS (no SVG dependency).
 */
import {WB_CSS_VAR, WB_KEYS, type WBKey} from '@/domain/wb'
import clsx from '../utils/clsx'
import styles from './WBDonut.module.css'

export type WBDonutProps = {
  values: Partial<Record<WBKey, number>>
  size?: number
  thickness?: number
  className?: string
  ariaLabel?: string
  children?: React.ReactNode
}

export function WBDonut({
  values,
  size = 40,
  thickness = 7,
  className,
  ariaLabel,
  children,
}: WBDonutProps) {
  const total = WB_KEYS.reduce((sum, k) => sum + (values[k] ?? 0), 0)

  let background: string
  if (total <= 0) {
    background = `conic-gradient(var(--bg2) 0 100%)`
  } else {
    let acc = 0
    const stops = WB_KEYS.map((wb) => {
      const v = values[wb] ?? 0
      const start = (acc / total) * 360
      acc += v
      const end = (acc / total) * 360
      return `var(${WB_CSS_VAR[wb]}) ${start}deg ${end}deg`
    }).join(', ')
    background = `conic-gradient(${stops})`
  }

  return (
    <span
      className={clsx(styles.donut, className)}
      style={{
        width: size,
        height: size,
        background,
        // inner hole thickness controlled via CSS var
        ['--donut-hole' as string]: `${size - thickness * 2}px`,
      }}
      role="img"
      aria-label={ariaLabel}
    >
      <span className={styles.hole}>{children}</span>
    </span>
  )
}
