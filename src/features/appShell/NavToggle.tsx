/**
 * NavToggle — 3-icon segmented control with a sliding white pill.
 *
 * Visually identical to the wireframe's `.nav-toggle`: beige track, 30×28
 * slots, a single white pill that animates to the active position. When no
 * position is active (`position === 'none'`, e.g. on the Repertoire route)
 * the pill fades out.
 *
 * Items that are disabled (no Planung in focus → Kalender/Liste greyed)
 * render as non-interactive; the active one is never disabled.
 */
import { useNavigate } from 'react-router-dom'
import clsx from '@/ui/utils/clsx'
import { Icon, type IconName } from '@/ui/primitives'
import styles from './NavToggle.module.css'
import type { NavPosition } from './useNavPosition'

type NavItem = {
  position: 0 | 1 | 2
  icon: IconName
  label: string
  to: string | null
}

export type NavToggleProps = {
  position: NavPosition
  /** Active Planung id; null if none. Drives the Kalender/Liste targets. */
  planungId: string | null
}

export function NavToggle({ position, planungId }: NavToggleProps) {
  const navigate = useNavigate()
  const items: NavItem[] = [
    { position: 0, icon: 'grid', label: 'Übersicht', to: '/' },
    {
      position: 1,
      icon: 'calendar',
      label: 'Kalender',
      to: planungId ? `/planung/${planungId}/kalender` : null,
    },
    {
      position: 2,
      icon: 'list',
      label: 'Terminliste',
      to: planungId ? `/planung/${planungId}/liste` : null,
    },
  ]

  return (
    <div
      className={styles.root}
      data-pos={position === 'none' ? 'none' : String(position)}
      role="tablist"
      aria-label="Navigation"
    >
      <span className={styles.slider} aria-hidden />
      {items.map((item) => {
        const isActive = position === item.position
        const isDisabled = item.to === null && !isActive
        return (
          <button
            key={item.position}
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
  )
}
