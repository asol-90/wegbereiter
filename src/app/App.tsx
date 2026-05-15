/**
 * App — top-level router.
 *
 * The main experience lives inside <AppShell>, which renders the Topbar
 * and outlets the current route into its content area. The Kit-Showcase
 * remains reachable at /dev/kit for ongoing reference.
 */
import {AppShell} from '@/features/appShell'
import {CalendarPage} from '@/features/calendar/CalendarPage'
import {GlobalConfigProvider} from '@/features/globalConfig'
import {ListPage} from '@/features/list/ListPage'
import {OverviewPage} from '@/features/overview/OverviewPage'
import {PlanungenProvider} from '@/features/planungen'
import {RepertoirePage} from '@/features/repertoire/RepertoirePage'
import {RepertoireProvider} from '@/features/repertoire/RepertoireProvider'
import {StammKontextProvider} from '@/features/stammKontext'
import {StammKontextPage} from '@/features/stammKontext/StammKontextPage'
import {BrowserRouter, Navigate, Route, Routes} from 'react-router-dom'
import {KitShowcase} from '../dev/KitShowcase'

export function App() {
  return (
    <BrowserRouter>
      <GlobalConfigProvider>
        <StammKontextProvider>
          <RepertoireProvider>
          <PlanungenProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route path="/" element={<OverviewPage />} />
              <Route
                path="/planung/:planungId/kalender"
                element={<CalendarPage />}
              />
              <Route path="/planung/:planungId/liste" element={<ListPage />} />
              <Route path="/repertoire" element={<RepertoirePage />} />
              <Route path="/stammkontext" element={<StammKontextPage />} />
              <Route path="/stammkontext/:id" element={<StammKontextPage />} />
            </Route>
            <Route path="/dev/kit" element={<KitShowcase />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          </PlanungenProvider>
          </RepertoireProvider>
        </StammKontextProvider>
      </GlobalConfigProvider>
    </BrowserRouter>
  )
}
