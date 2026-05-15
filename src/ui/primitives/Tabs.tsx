/**
 * Tabs — horizontal top-level navigation inside panels (e.g. modal sections,
 * repertoire categories). For the app-shell's main nav use a Router-aware
 * version; this component controls state locally via `value`/`onValueChange`.
 */
import type {ReactNode} from 'react'
import clsx from '../utils/clsx'
import styles from './Tabs.module.css'

export type TabItem<T extends string> = {
  value: T
  label: ReactNode
  disabled?: boolean
  count?: number
}

export type TabsProps<T extends string> = {
  items: TabItem<T>[]
  value: T
  onValueChange: (value: T) => void
  variant?: 'underline' | 'pill'
  className?: string
}

export function Tabs<T extends string>({
  items,
  value,
  onValueChange,
  variant = 'underline',
  className,
}: TabsProps<T>) {
  return (
    <div
      role="tablist"
      className={clsx(styles.tabs, styles[`v-${variant}`], className)}
    >
      {items.map((item) => {
        const active = item.value === value
        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            disabled={item.disabled}
            onClick={() => onValueChange(item.value)}
            className={clsx(styles.tab, active && styles.active)}
          >
            <span>{item.label}</span>
            {typeof item.count === 'number' && (
              <span className={styles.count}>{item.count}</span>
            )}
          </button>
        )
      })}
    </div>
  )
}
