/**
 * OverviewPage — Planungsübersicht (concept §6).
 *
 * Left: Jahreskalender mit Planungs-Markierungen und Ferien-Bändern.
 * Right: Planungsliste mit "Neue Planung"-Button.
 *
 * Cross-Hover liegt hier im State, damit beide Seiten synchron bleiben.
 * Wichtig (Wireframe-Korrektur): Hover wirkt auf Planungs-Ebene — es werden
 * keine einzelnen Treffen in der Liste eingeblendet.
 *
 * Year-State: Das angezeigte Jahr steuert sowohl den Kalender als auch
 * die Planungsliste (nur Einträge dieses Jahres werden angezeigt).
 */
import { useMemo, useState, useCallback } from 'react'
import { Panels, Panel } from '@/features/appShell'
import { usePlanungen } from '@/features/planungen'
import { useStammKontext } from '@/features/stammKontext'
import type { PlanungId } from '@/domain/ids'
import { Jahreskalender } from './Jahreskalender'
import { JahresplanerSidebar } from './JahresplanerSidebar'

/** Collect all years that have any data (Planungen treffen + Kontext treffen/aktionen). */
function collectDataYears(
  planungen: readonly { treffen: readonly { datum: string }[] }[],
  kontexte: readonly { treffen: readonly { datum: string }[]; stammaktionen: readonly { beginn: string; ende: string }[] }[],
): Set<number> {
  const years = new Set<number>()
  for (const p of planungen) {
    for (const t of p.treffen) {
      years.add(Number.parseInt(t.datum.slice(0, 4), 10))
    }
  }
  for (const k of kontexte) {
    for (const t of k.treffen) {
      years.add(Number.parseInt(t.datum.slice(0, 4), 10))
    }
    for (const a of k.stammaktionen) {
      years.add(Number.parseInt(a.beginn.slice(0, 4), 10))
      years.add(Number.parseInt(a.ende.slice(0, 4), 10))
    }
  }
  return years
}

export function OverviewPage() {
  const { planungen } = usePlanungen()
  const { kontexte } = useStammKontext()
  const [highlighted, setHighlighted] = useState<PlanungId | null>(null)

  const currentYear = new Date().getFullYear()
  const dataYears = useMemo(
    () => collectDataYears(planungen, kontexte),
    [planungen, kontexte],
  )

  const minYear = useMemo(() => {
    if (dataYears.size === 0) return currentYear
    return Math.min(currentYear, ...dataYears)
  }, [dataYears, currentYear])

  const maxYear = currentYear + 1

  const [year, setYear] = useState(() => {
    // Initial: current year, or the year with the most data if it's in the future
    if (dataYears.has(currentYear)) return currentYear
    const futureYears = [...dataYears].filter((y) => y >= currentYear)
    if (futureYears.length > 0) return Math.min(...futureYears)
    return currentYear
  })

  const goBack = useCallback(() => setYear((y) => Math.max(minYear, y - 1)), [minYear])
  const goForward = useCallback(() => setYear((y) => Math.min(maxYear, y + 1)), [maxYear])
  const goToday = useCallback(() => setYear(currentYear), [currentYear])

  return (
    <Panels split="main-side">
      <Panel role="main">
        <Jahreskalender
          year={year}
          planungen={planungen}
          highlightedPlanungId={highlighted}
          onPlanungHover={setHighlighted}
          canGoBack={year > minYear}
          canGoForward={year < maxYear}
          isCurrentYear={year === currentYear}
          onGoBack={goBack}
          onGoForward={goForward}
          onGoToday={goToday}
        />
      </Panel>
      <Panel role="side">
        <JahresplanerSidebar
          displayYear={year}
          highlightedPlanungId={highlighted}
          onPlanungHover={setHighlighted}
        />
      </Panel>
    </Panels>
  )
}
