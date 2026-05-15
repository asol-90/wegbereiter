/**
 * AppShell — outer frame of the application: a beige page background with a
 * white rounded "card" that contains the Topbar + a content area.
 *
 * The content area renders the current route via <Outlet/>. Every page is
 * expected to fill the content area with its own two-panel layout
 * (see `Panels`).
 */
import {Outlet} from 'react-router-dom'
import styles from './AppShell.module.css'
import {Footer} from './Footer'
import {Topbar} from './Topbar'

export function AppShell() {
  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <Topbar />
        <div className={styles.content}>
          <Outlet />
        </div>
        <Footer />
      </div>
    </div>
  )
}
