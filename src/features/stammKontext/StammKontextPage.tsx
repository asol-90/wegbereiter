/**
 * StammKontextPage — entry point routed at:
 *   /stammkontext        → overview (Jahreskalender + KontextSidebar)
 *   /stammkontext/:id    → editor (delegates to StammKontextEditorLayout)
 */
import { useCallback, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { PlanungId, StammKontextId } from '@/domain/ids'
import type { IsoDate } from '@/domain/types'
import { Panel, Panels } from '@/features/appShell'
import { Jahreskalender } from '@/features/overview/Jahreskalender'
import { useStammKontext } from '@/features/stammKontext'
import { KontextSidebar } from './KontextSidebar'
import { NewKontextWizard } from './NewKontextWizard'
import { StammKontextEditorLayout } from './StammKontextEditorLayout'

function StammKontextOverviewLayout() {
  const { kontexte } = useStammKontext()
  const currentYear = new Date().getFullYear()
  const [highlightedPlanungId, setHighlightedPlanungId] = useState<PlanungId | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardZeitraum, setWizardZeitraum] = useState<{ start: IsoDate; ende: IsoDate } | undefined>()
  const [year, setYear] = useState(currentYear)

  const dataYears = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear + 1])
    for (const k of kontexte) {
      for (const t of k.treffen) years.add(Number(t.datum.slice(0, 4)))
      for (const a of k.stammaktionen) years.add(Number(a.beginn.slice(0, 4)))
    }
    return years
  }, [kontexte, currentYear])

  const minYear = Math.min(currentYear, ...dataYears)
  const maxYear = currentYear + 1

  const handleDragComplete = useCallback((start: string, ende: string) => {
    setWizardZeitraum({ start: start as IsoDate, ende: ende as IsoDate })
    setWizardOpen(true)
  }, [])

  return (
    <>
      <Panels split="main-side">
        <Panel role="main">
          <Jahreskalender
            year={year} planungen={[]}
            highlightedPlanungId={highlightedPlanungId} onPlanungHover={setHighlightedPlanungId}
            canGoBack={year > minYear} canGoForward={year < maxYear} isCurrentYear={year === currentYear}
            onGoBack={() => setYear((y) => Math.max(minYear, y - 1))}
            onGoForward={() => setYear((y) => Math.min(maxYear, y + 1))}
            onGoToday={() => setYear(currentYear)}
          />
        </Panel>
        <Panel role="side">
          <KontextSidebar
            displayYear={year} activeKontextId={null} onDragComplete={handleDragComplete}
          />
        </Panel>
      </Panels>
      <NewKontextWizard
        open={wizardOpen}
        onClose={() => { setWizardOpen(false); setWizardZeitraum(undefined) }}
        initialZeitraum={wizardZeitraum}
      />
    </>
  )
}

export function StammKontextPage() {
  const { id } = useParams<{ id: string }>()
  if (id) return <StammKontextEditorLayout id={id as StammKontextId} />
  return <StammKontextOverviewLayout />
}
