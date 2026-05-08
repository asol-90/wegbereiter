/**
 * Topbar — app title left, nav controls centered, right side balanced.
 * Grid layout (1fr auto 1fr) keeps nav perfectly centered regardless of title width.
 */
import styles from './Topbar.module.css'
import { NavToggle } from './NavToggle'
import { RepertoireToggle } from './RepertoireToggle'
import { JahresplanungToggle } from './JahresplanungToggle'
import { useNavPosition } from './useNavPosition'

export function Topbar() {
  const nav = useNavPosition()

  return (
    <div className={styles.root}>
      <span className={styles.appTitle}>RR642 Wegbereiter</span>
      <div className={styles.navGroup}>
        <JahresplanungToggle position={nav.position} />
        <NavToggle position={nav.position} planungId={nav.planungId} />
        <RepertoireToggle active={nav.repertoireActive} />
      </div>
      <span />
    </div>
  )
}
