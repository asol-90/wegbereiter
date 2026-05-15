/**
 * WBDot — single colored circle representing one Wachstumsbereich.
 * Intensity drives the color mix: 0 = muted (bg2), 1 = full brand color.
 */
import {WB_CSS_VAR, type WBKey} from '@/domain/wb'
import type {HTMLAttributes} from 'react'
import clsx from '../utils/clsx'
import styles from './WBDot.module.css'

export type WBDotProps = {
  wb: WBKey
  /** Value in [0, 1]. Renders at full color at 1, muted at 0. */
  intensity?: number
  size?: number
  ring?: boolean
} & Omit<HTMLAttributes<HTMLSpanElement>, 'color'>

export function WBDot({
  wb,
  intensity = 1,
  size = 10,
  ring,
  className,
  style,
  ...rest
}: WBDotProps) {
  const clamped = Math.max(0, Math.min(1, intensity))
  // Fade by blending towards --bg2 as intensity drops.
  const alpha = 0.18 + clamped * 0.82
  return (
    <span
      className={clsx(styles.dot, ring && styles.ring, className)}
      style={{
        width: size,
        height: size,
        backgroundColor: `color-mix(in srgb, var(${WB_CSS_VAR[wb]}) ${Math.round(
          alpha * 100,
        )}%, var(--bg2))`,
        ...style,
      }}
      {...rest}
    />
  )
}
