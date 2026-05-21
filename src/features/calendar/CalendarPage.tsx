/**
 * CalendarPage — Kalenderansicht (concept §6 + §8).
 *
 * Left (main): Scrollable PlanungsKalender over the Planung's zeitraum.
 * Right (side): AbwesenheitsSidebar — vertical timeline per team member.
 *
 * Loads the Planung by :planungId from the PlanungenStore and passes the
 * matching FerienCacheEntry from useFerienForYear.
 */
import {parseIso} from '@/domain/dateUtils'
import type {Abwesenheit, IsoDate} from '@/domain/types'
import {Panel, PanelGhost, Panels} from '@/features/appShell'
import {useFerienForYear} from '@/features/overview/useFerienForYear'
import {usePlanungen, usePlanungenActions} from '@/features/planungen'
import {useStammKontext} from '@/features/stammKontext'
import {format} from 'date-fns'
import {de} from 'date-fns/locale'
import {useMemo, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {AbwesenheitsSidebar} from './AbwesenheitsSidebar'
import {PlanungsKalender} from './PlanungsKalender'
import {useCalendarHandlers} from './useCalendarHandlers'
import {useCalendarStammData} from './useCalendarStammData'

/** Derive the year with the most treffen for Ferien-loading. */
function primaryYear(planung: { treffen: { datum: string }[] }): number {
  const counts = new Map<number, number>()
  for (const t of planung.treffen) {
    const y = Number.parseInt(t.datum.slice(0, 4), 10)
    counts.set(y, (counts.get(y) ?? 0) + 1)
  }
  let best = new Date().getFullYear()
  let bestCount = -1
  for (const [y, c] of counts) {
    if (c > bestCount) {
      bestCount = c
      best = y
    }
  }
  return best
}

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

export function CalendarPage() {
  const { planungId = '' } = useParams()
  const navigate = useNavigate()
  const { planungen, loaded } = usePlanungen()
  const { update } = usePlanungenActions()

  const planung = useMemo(
    () => planungen.find((p) => p.id === planungId),
    [planungen, planungId],
  )

  const year = useMemo(
    () => (planung ? primaryYear(planung) : new Date().getFullYear()),
    [planung],
  )
  const ferien = useFerienForYear(year)
  const { kontexte } = useStammKontext()

  const { stammAktionen, externAktionen, stammTreffen, optedOutStammIds } =
    useCalendarStammData(planung, kontexte)

  const {
    handleAbwesenheitenUpdate,
    handleTeamUpdate,
    handleAddTreffen,
    handleDeleteTreffen,
    handleStammAbmelden,
    handleStammWiederAnmelden,
  } = useCalendarHandlers(planung, update)

  const [hoveredTreffenDatum, setHoveredTreffenDatum] = useState<IsoDate | null>(null)
  const [hoveredAbwesenheit, setHoveredAbwesenheit] = useState<Abwesenheit | null>(null)

  const hoveredRange = useMemo(
    () => hoveredAbwesenheit ? { von: hoveredAbwesenheit.von, bis: hoveredAbwesenheit.bis } : null,
    [hoveredAbwesenheit],
  )

  if (!loaded) {
    return null
  }

  if (!planung) {
    return (
      <Panels split="main-side">
        <Panel role="main" title="Planung nicht gefunden">
          <PanelGhost
            icon="calendar"
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
        <PlanungsKalender
          planung={planung}
          ferien={ferien}
          stammAktionen={stammAktionen}
          externAktionen={externAktionen}
          stammTreffen={stammTreffen}
          optedOutStammIds={optedOutStammIds}
          onTreffenDoubleClick={(treffenId) =>
            navigate(`/planung/${planungId}/liste#treffen-${treffenId}`)
          }
          onTreffenHover={setHoveredTreffenDatum}
          hoveredRange={hoveredRange}
          onAddTreffen={handleAddTreffen}
          onDeleteTreffen={handleDeleteTreffen}
          onStammAbmelden={handleStammAbmelden}
          onStammWiederAnmelden={handleStammWiederAnmelden}
        />
      </Panel>
      <Panel role="side">
        <AbwesenheitsSidebar
          planung={planung}
          onUpdate={handleAbwesenheitenUpdate}
          onTeamUpdate={handleTeamUpdate}
          onNavigateToList={() => navigate(`/planung/${planungId}/liste`)}
          hoveredTreffenDatum={hoveredTreffenDatum}
          onAbwesenheitHover={setHoveredAbwesenheit}
        />
      </Panel>
    </Panels>
  )
}
