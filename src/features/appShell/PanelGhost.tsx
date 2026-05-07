/**
 * PanelGhost — reusable placeholder content for pages that haven't been
 * implemented yet. Mirrors the wireframe's `.panel-ghost` visual (big
 * desaturated icon + label + optional subline). Once a real page is
 * built, it simply stops using this component.
 */
import { Icon, type IconName } from '@/ui/primitives'
import styles from './PanelGhost.module.css'

export type PanelGhostProps = {
  icon: IconName
  label: string
  sub?: string
}

export function PanelGhost({ icon, label, sub }: PanelGhostProps) {
  return (
    <div className={styles.root}>
      <Icon name={icon} size={28} strokeWidth={1.5} className={styles.icon} />
      <span className={styles.label}>{label}</span>
      {sub && <span className={styles.sub}>{sub}</span>}
    </div>
  )
}
