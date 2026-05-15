/**
 * Panels / Panel — the two-column layout every page uses inside the
 * AppShell content area. A thin 0.5px separator runs vertically between
 * the two panels, inset 28px top/bottom (as in app-shell-v3.html).
 *
 * Split ratio is driven by `split`:
 *   - 'main-side' (default): 65 % main / 35 % side (Übersicht, Kalender,
 *     Terminliste).
 *   - 'side-main': 35 % side / 65 % main (Repertoire: narrow activity list
 *     left, wide detail pane right).
 *
 * The component is intentionally tiny. Pages compose their content by
 * passing two children (<Panel role="main"> and <Panel role="side">) in
 * the desired visual order; the CSS handles the sizing and separator.
 */
import clsx from '@/ui/utils/clsx'
import type {ReactNode} from 'react'
import styles from './Panels.module.css'

export type PanelsSplit = 'main-side' | 'side-main'

export type PanelsProps = {
  split?: PanelsSplit
  children: ReactNode
  className?: string
}

export function Panels({
  split = 'main-side',
  children,
  className,
}: PanelsProps) {
  return (
    <div className={clsx(styles.root, styles[`s-${split}`], className)}>
      {children}
    </div>
  )
}

export type PanelProps = {
  role: 'main' | 'side'
  /** Optional panel title with serif heading — see concept §8. */
  title?: ReactNode
  /** Optional right-aligned badge/meta shown next to the title. */
  titleTrailing?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({
  role,
  title,
  titleTrailing,
  children,
  className,
}: PanelProps) {
  return (
    <section className={clsx(styles.panel, styles[`r-${role}`], className)}>
      {title && (
        <header className={styles.title}>
          <span className={styles.titleText}>{title}</span>
          {titleTrailing && (
            <span className={styles.titleTrailing}>{titleTrailing}</span>
          )}
        </header>
      )}
      <div className={styles.body}>{children}</div>
    </section>
  )
}
