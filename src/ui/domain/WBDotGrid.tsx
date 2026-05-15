/**
 * WBDotGrid — horizontal row of WB dots. Renders all four Wachstumsbereiche
 * by default; intensities are pulled from the passed `tags` (keyed by WBKey).
 */
import {WB_KEYS, type WBKey} from '@/domain/wb'
import clsx from '../utils/clsx'
import {WBDot} from './WBDot'
import styles from './WBDotGrid.module.css'

export type WBDotGridProps = {
  tags: Partial<Record<WBKey, number>>
  size?: number
  gap?: number
  /** If true, hide dots with 0 intensity instead of showing them muted. */
  hideZero?: boolean
  className?: string
}

export function WBDotGrid({
  tags,
  size = 10,
  gap = 4,
  hideZero,
  className,
}: WBDotGridProps) {
  return (
    <span className={clsx(styles.row, className)} style={{ gap }}>
      {WB_KEYS.map((wb) => {
        const intensity = tags[wb] ?? 0
        if (hideZero && intensity === 0) return null
        return <WBDot key={wb} wb={wb} intensity={intensity} size={size} />
      })}
    </span>
  )
}
