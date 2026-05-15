/**
 * JahresplanungToggle — standalone pill button for the Jahresplanung route.
 * Label is rendered outside/below the button, not inside it.
 */
import {Icon} from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import {useNavigate} from 'react-router-dom'
import styles from './JahresplanungToggle.module.css'
import type {NavPosition} from './useNavPosition'

export type JahresplanungToggleProps = {
  position: NavPosition
}

export function JahresplanungToggle({ position }: JahresplanungToggleProps) {
  const navigate = useNavigate()
  const active = position === 0
  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={clsx(styles.root, active && styles.active)}
        aria-pressed={active}
        aria-label="Jahresplanung"
        onClick={() => {
          if (!active) navigate('/')
        }}
      >
        <span className={styles.slider} aria-hidden />
        <span className={styles.inner}>
          <Icon name="grid" size={14} />
        </span>
      </button>
      <span className={clsx(styles.label, active && styles.labelActive)} aria-hidden>
        Jahresplanung
      </span>
    </div>
  )
}
