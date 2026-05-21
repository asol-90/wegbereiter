/**
 * Mutation-Handler für CalendarPage — Treffen anlegen/löschen, Abwesenheiten
 * und Team aktualisieren, Stamm-Termine ab-/wieder anmelden.
 *
 * Alle Mutationen schreiben zurück über `update(planung)` und schließen am
 * Ende `aktualisiertAm` ein.
 */
import { useCallback } from 'react'
import { insertTreffen, removeTreffen } from '@/domain/cascade'
import { newId, type StammAktionId, type StammTreffenId, type TreffenId } from '@/domain/ids'
import type { Abwesenheit, IsoDate, Mitarbeiter, Planung } from '@/domain/types'

export function useCalendarHandlers(
  planung: Planung | undefined,
  update: (p: Planung) => void,
) {
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

  return {
    handleAbwesenheitenUpdate,
    handleTeamUpdate,
    handleAddTreffen,
    handleDeleteTreffen,
    handleStammAbmelden,
    handleStammWiederAnmelden,
  }
}
