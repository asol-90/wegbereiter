/**
 * CalendarPage — Kalenderansicht (concept §6 + §8).
 *
 * Left (main): Scrollable PlanungsKalender over the Planung's zeitraum.
 * Right (side): AbwesenheitsSidebar — vertical timeline per team member.
 *
 * Loads the Planung by :planungId from the PlanungenStore and passes the
 * matching FerienCacheEntry from useFerienForYear.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Abwesenheit, IsoDate, Mitarbeiter, StammAktion, StammTreffen } from '@/domain/types'
import { parseIso } from '@/domain/dateUtils'
import { newId } from '@/domain/ids'
import type { StammAktionId, StammTreffenId, TreffenId } from '@/domain/ids'
import { removeTreffen, insertTreffen } from '@/domain/cascade'
import { usePlanungen, usePlanungenActions } from '@/features/planungen'
import { useFerienForYear } from '@/features/overview/useFerienForYear'
import { useStammKontext } from '@/features/stammKontext'
import { Panels, Panel, PanelGhost } from '@/features/appShell'
import { PlanungsKalender } from './PlanungsKalender'
import { AbwesenheitsSidebar } from './AbwesenheitsSidebar'

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

  // ── Stammkontext data ───────────────────────────────────────────────
  const stammAktionen = useMemo<StammAktion[]>(() => {
    if (!planung) return []
    const all: StammAktion[] = []
    for (const k of kontexte) {
      for (const a of k.stammaktionen) {
        if (a.beginn <= planung.zeitraum.ende && a.ende >= planung.zeitraum.start) {
          all.push(a)
        }
      }
    }
    return all
  }, [kontexte, planung])

  const stammTreffen = useMemo<StammTreffen[]>(() => {
    if (!planung) return []
    const result: StammTreffen[] = []
    for (const k of kontexte) {
      for (const t of k.treffen) {
        if (t.datum >= planung.zeitraum.start && t.datum <= planung.zeitraum.ende) {
          result.push(t)
        }
      }
    }
    return result
  }, [kontexte, planung])

  const optedOutStammIds = useMemo(
    () => new Set(planung?.stammOptOuts ?? []),
    [planung],
  )

  // ── Navigation ──────────────────────────────────────────────────────
  const handleTreffenDoubleClick = useCallback(
    (treffenId: string) => {
      navigate(`/planung/${planungId}/liste#treffen-${treffenId}`)
    },
    [navigate, planungId],
  )

  // ── Cross-hover state ───────────────────────────────────────────────
  const [hoveredTreffenDatum, setHoveredTreffenDatum] = useState<IsoDate | null>(null)
  const [hoveredAbwesenheit, setHoveredAbwesenheit] = useState<Abwesenheit | null>(null)

  // Full absence range passed to PlanungsKalender for background highlight
  const hoveredRange = useMemo(
    () => hoveredAbwesenheit ? { von: hoveredAbwesenheit.von, bis: hoveredAbwesenheit.bis } : null,
    [hoveredAbwesenheit],
  )

  // ── Mutations ───────────────────────────────────────────────────────
  const handleAbwesenheitenUpdate = useCallback(
    (abwesenheiten: Abwesenheit[]) => {
      if (!planung) return
      update({ ...planung, abwesenheiten, aktualisiertAm: new Date().toISOString() })
    },
    [planung, update],
  )

  const handleTeamUpdate = useCallback(
    (team: Mitarbeiter[]) => {
      if (!planung) return
      update({ ...planung, team, aktualisiertAm: new Date().toISOString() })
    },
    [planung, update],
  )

  const handleAddTreffen = useCallback(
    (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => {
      if (!planung) return
      const newTreff = {
        id: newId<TreffenId>(),
        kind,
        datum,
        programm: [] as [],
        fixiert: false,
        sollWB: [] as [],
      }
      const { treffen, ueberhang } = insertTreffen(planung, [newTreff], null, 'shift')
      update({ ...planung, treffen, ueberhang, aktualisiertAm: new Date().toISOString() })
    },
    [planung, update],
  )

  const handleDeleteTreffen = useCallback(
    (treffenId: TreffenId, mode: 'cascade' | 'delete') => {
      if (!planung) return
      const { treffen, ueberhang } = removeTreffen(planung, treffenId, mode)
      update({ ...planung, treffen, ueberhang, aktualisiertAm: new Date().toISOString() })
    },
    [planung, update],
  )

  // Abmelden: cascade-delete the Treffen at that date + add to stammOptOuts
  const handleStammAbmelden = useCallback(
    (stammId: StammTreffenId | StammAktionId, treffenId: TreffenId | null) => {
      if (!planung) return
      const stammOptOuts = [...planung.stammOptOuts, stammId]
      if (treffenId) {
        const { treffen, ueberhang } = removeTreffen(planung, treffenId, 'cascade')
        update({ ...planung, treffen, ueberhang, stammOptOuts, aktualisiertAm: new Date().toISOString() })
      } else {
        update({ ...planung, stammOptOuts, aktualisiertAm: new Date().toISOString() })
      }
    },
    [planung, update],
  )

  // Wieder anmelden: remove from stammOptOuts + create empty Treffen at that date
  const handleStammWiederAnmelden = useCallback(
    (stammId: StammTreffenId, datum: IsoDate) => {
      if (!planung) return
      const newTreff = {
        id: newId<TreffenId>(),
        kind: 'regulaer' as const,
        datum,
        programm: [] as [],
        fixiert: false,
        sollWB: [] as [],
      }
      const { treffen, ueberhang } = insertTreffen(planung, [newTreff], null, 'shift')
      const stammOptOuts = planung.stammOptOuts.filter((x) => x !== stammId)
      update({ ...planung, treffen, ueberhang, stammOptOuts, aktualisiertAm: new Date().toISOString() })
    },
    [planung, update],
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
          stammTreffen={stammTreffen}
          optedOutStammIds={optedOutStammIds}
          onTreffenDoubleClick={handleTreffenDoubleClick}
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
