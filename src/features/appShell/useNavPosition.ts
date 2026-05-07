/**
 * useNavPosition — derives the current nav-toggle state from the URL.
 *
 * Concept §5 describes three navigation icons (Übersicht / Kalender /
 * Terminliste) plus a separate Repertoire button. Their enabled/active
 * states depend on the current route and on whether a Planung is in
 * focus:
 *   - `/`                            → pos 0 (only Übersicht active),
 *                                      Kalender+Liste are disabled because
 *                                      no Planung is selected.
 *   - `/planung/:id/kalender`        → pos 1, all three clickable.
 *   - `/planung/:id/liste`           → pos 2, all three clickable.
 *   - `/repertoire`                  → nav-toggle has no active pill,
 *                                      Kalender+Liste are disabled.
 *
 * The hook is pure logic — it does not render anything. It returns both
 * the active position and the active Planung id (may be null), so the
 * Topbar can build its links.
 */
import { matchPath, useLocation } from 'react-router-dom'

export type NavPosition = 0 | 1 | 2 | 'none'

export type NavState = {
  /** Which nav-toggle icon shows the white pill. */
  position: NavPosition
  /** Planung id from URL params, if route is scoped to a Planung. */
  planungId: string | null
  /** True while the repertoire route is active. */
  repertoireActive: boolean
}

type PlanungMatch = { planungId?: string }

const overviewMatch = '/'
const kalenderMatch = '/planung/:planungId/kalender'
const listeMatch = '/planung/:planungId/liste'
const repertoireMatch = '/repertoire'

export function useNavPosition(): NavState {
  const { pathname } = useLocation()
  return derive(pathname)
}

/** Exported for testing — pure function over the pathname. */
export function derive(pathname: string): NavState {
  if (matchPath(repertoireMatch, pathname)) {
    return { position: 'none', planungId: null, repertoireActive: true }
  }
  const kalender = matchPath<PlanungMatch, typeof kalenderMatch>(
    kalenderMatch,
    pathname,
  )
  if (kalender) {
    return {
      position: 1,
      planungId: kalender.params.planungId ?? null,
      repertoireActive: false,
    }
  }
  const liste = matchPath<PlanungMatch, typeof listeMatch>(listeMatch, pathname)
  if (liste) {
    return {
      position: 2,
      planungId: liste.params.planungId ?? null,
      repertoireActive: false,
    }
  }
  if (matchPath(overviewMatch, pathname)) {
    return { position: 0, planungId: null, repertoireActive: false }
  }
  // Unknown path → behave like overview (redirect happens at router level).
  return { position: 0, planungId: null, repertoireActive: false }
}
