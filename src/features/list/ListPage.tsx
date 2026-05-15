/**
 * ListPage — Terminliste (concept §8.1 "Treffen-Liste" + §9 Treffen-Karte).
 *
 * Left (main): Sequential list of Treffen-Karten grouped by month.
 * Right (side): Kontextleiste (WB · Andacht · Abzeichen · Stamm).
 *
 * Loads the Planung by :planungId from PlanungenStore — mirrors CalendarPage's
 * data loading pattern.
 */
import {parseIso} from '@/domain/dateUtils'
import {Panel, PanelGhost, Panels} from '@/features/appShell'
import {Kontextleiste} from '@/features/kontextleiste'
import {usePlanungen} from '@/features/planungen'
import {format} from 'date-fns'
import {de} from 'date-fns/locale'
import {useEffect, useMemo} from 'react'
import {useLocation, useParams} from 'react-router-dom'
import {TreffenListe} from './TreffenListe'

function formatTitle(start: string, ende: string): string {
  const s = parseIso(start)
  const e = parseIso(ende)
  const sYear = s.getFullYear()
  const eYear = e.getFullYear()
  if (sYear === eYear) {
    return `${format(s, 'MMMM', { locale: de })} – ${format(e, 'MMMM yyyy', { locale: de })}`
  }
  return `${format(s, 'MMMM yyyy', { locale: de })} – ${format(e, 'MMMM yyyy', { locale: de })}`
}

export function ListPage() {
  const { planungId = '' } = useParams()
  const { hash } = useLocation()
  const { planungen, loaded } = usePlanungen()

  const planung = useMemo(
    () => planungen.find((p) => p.id === planungId),
    [planungen, planungId],
  )

  // Scroll to anchor (e.g. #treffen-abc123) when arriving from calendar
  useEffect(() => {
    if (!hash) return
    // Small delay to let cards render
    const timer = setTimeout(() => {
      const el = document.querySelector(hash)
      el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 80)
    return () => clearTimeout(timer)
  }, [hash])

  if (!loaded) {
    return null
  }

  if (!planung) {
    return (
      <Panels split="main-side">
        <Panel role="main" title="Planung nicht gefunden">
          <PanelGhost
            icon="list"
            label="Keine Planung mit dieser ID"
            sub="Zurück zur Übersicht"
          />
        </Panel>
        <Panel role="side">
          <PanelGhost icon="clock" label="—" />
        </Panel>
      </Panels>
    )
  }

  return (
    <Panels split="main-side">
      <Panel
        role="main"
        title={formatTitle(planung.zeitraum.start, planung.zeitraum.ende)}
        titleTrailing={planung.name}
      >
        <TreffenListe planung={planung} />
      </Panel>
      <Panel role="side">
        <Kontextleiste planung={planung} />
      </Panel>
    </Panels>
  )
}
