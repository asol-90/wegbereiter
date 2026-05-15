/**
 * RepertoireToggle — single pill button for the Repertoire route.
 * Label is rendered outside/below the button.
 */
import {Icon} from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import {useNavigate} from 'react-router-dom'
import styles from './RepertoireToggle.module.css'

export type RepertoireToggleProps = {
  active: boolean
}

export function RepertoireToggle({ active }: RepertoireToggleProps) {
  const navigate = useNavigate()
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={clsx(styles.root, active && styles.active)}
        aria-pressed={active}
        aria-label="Repertoire"
        onClick={() => {
          if (!active) navigate('/repertoire')
        }}
      >
        <span className={styles.slider} aria-hidden />
        <span className={styles.inner}>
          <Icon name="book" size={14} />
        </span>
      </button>
      <span className={clsx(styles.label, active && styles.labelActive)} aria-hidden>
        Repertoire
      </span>
    </div>
  )
}
