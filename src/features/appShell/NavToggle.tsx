/**
 * NavToggle — 2-icon segmented control for Kalender and Terminliste.
 * Labels are rendered below the pill track, not inside the buttons.
 */
import { useNavigate } from 'react-router-dom'
import clsx from '@/ui/utils/clsx'
import { Icon, type IconName } from '@/ui/primitives'
import styles from './NavToggle.module.css'
import type { NavPosition } from './useNavPosition'

type NavItem = {
  globalPos: 1 | 2
  icon: IconName
  label: string
  to: string | null
}

export type NavToggleProps = {
  position: NavPosition
  planungId: string | null
}

export function NavToggle({ position, planungId }: NavToggleProps) {
  const navigate = useNavigate()
  const items: NavItem[] = [
    {
      globalPos: 1,
      icon: 'calendar',
      label: 'Kalender',
      to: planungId ? `/planung/${planungId}/kalender` : null,
    },
    {
      globalPos: 2,
      icon: 'list',
      label: 'Terminliste',
      to: planungId ? `/planung/${planungId}/liste` : null,
    },
  ]

  const localPos =
    position === 1 ? '0' : position === 2 ? '1' : 'none'

  return (
    <div className={styles.wrap}>
      <div
        className={styles.root}
        data-pos={localPos}
        role="tablist"
        aria-label="Planungsansicht"
      >
        <span className={styles.slider} aria-hidden />
        {items.map((item) => {
          const isActive = position === item.globalPos
          const isDisabled = item.to === null && !isActive
          return (
            <button
              key={item.globalPos}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={item.label}
              title={item.label}
              disabled={isDisabled}
              className={clsx(
                styles.slot,
                isActive && styles.active,
                isDisabled && styles.disabled,
              )}
              onClick={() => {
                if (!isActive && item.to) navigate(item.to)
              }}
            >
              <Icon name={item.icon} size={14} />
            </button>
          )
        })}
      </div>
      <div className={styles.labels} aria-hidden>
        {items.map((item) => {
          const isActive = position === item.globalPos
          return (
            <span
              key={item.globalPos}
              className={clsx(styles.label, isActive && styles.labelActive)}
            >
              {item.label}
            </span>
          )
        })}
      </div>
    </div>
  )
}
