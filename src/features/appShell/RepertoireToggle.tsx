/**
 * RepertoireToggle — sibling button of NavToggle, same style: beige pill
 * track, a white pill appears when active. The repertoire view is at the
 * global app level (not scoped to a Planung), so this is a single toggle.
 */
import { useNavigate } from 'react-router-dom'
import clsx from '@/ui/utils/clsx'
import { Icon } from '@/ui/primitives'
import styles from './RepertoireToggle.module.css'

export type RepertoireToggleProps = {
  active: boolean
}

export function RepertoireToggle({ active }: RepertoireToggleProps) {
  const navigate = useNavigate()
  return (
    <button
      type="button"
      className={clsx(styles.root, active && styles.active)}
      aria-pressed={active}
      aria-label="Repertoire öffnen"
      onClick={() => {
        if (!active) navigate('/repertoire')
      }}
    >
      <span className={styles.slider} aria-hidden />
      <span className={styles.inner}>
        <Icon name="book" size={14} />
        Repertoire
      </span>
    </button>
  )
}
