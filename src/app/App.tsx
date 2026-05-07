/**
 * App — top-level router.
 *
 * The main experience lives inside <AppShell>, which renders the Topbar
 * and outlets the current route into its content area. The Kit-Showcase
 * remains reachable at /dev/kit for ongoing reference.
 */
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/features/appShell'
import { PlanungenProvider } from '@/features/planungen'
import { GlobalConfigProvider } from '@/features/globalConfig'
import { StammKontextProvider } from '@/features/stammKontext'
import { RepertoireProvider } from '@/features/repertoire/RepertoireProvider'
import { OverviewPage } from '@/features/overview/OverviewPage'
import { CalendarPage } from '@/features/calendar/CalendarPage'
import { ListPage } from '@/features/list/ListPage'
import { RepertoirePage } from '@/features/repertoire/RepertoirePage'
import { KitShowcase } from '../dev/KitShowcase'

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
