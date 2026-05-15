/**
 * KontextToggle — standalone pill button for the StammKontext route.
 * Label is rendered outside/below the button, not inside it.
 */
import {Icon} from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import {useNavigate} from 'react-router-dom'
import styles from './JahresplanungToggle.module.css'

export type KontextToggleProps = {
  active: boolean
}

export function KontextToggle({ active }: KontextToggleProps) {
  const navigate = useNavigate()
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={clsx(styles.root, active && styles.active)}
        aria-pressed={active}
        aria-label="Kontext"
        onClick={() => {
          if (!active) navigate('/stammkontext')
        }}
      >
        <span className={styles.slider} aria-hidden />
        <span className={styles.inner}>
          <Icon name="compass" size={14} />
        </span>
      </button>
      <span className={clsx(styles.label, active && styles.labelActive)} aria-hidden>
        Kontext
      </span>
    </div>
  )
}
