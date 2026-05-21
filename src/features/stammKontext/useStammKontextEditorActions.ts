/**
 * Action-Faktoren für useStammKontextEditorState. Jede Subhook bündelt
 * die Mutationen einer Gruppe (Treffen, Aktionen, Aktivitäten) und
 * arbeitet auf dem geteilten `draft` + `save`.
 */
import { newId, type AktivitaetId, type StammAktionId, type StammTreffenId } from '@/domain/ids'
import type { IsoDate, StammAktion, StammKontext, StammTreffen } from '@/domain/types'
import { useCallback } from 'react'

type SaveFn = (next: StammKontext) => void

export function useTreffenActions(draft: StammKontext | null, save: SaveFn) {
  const addTreffen = useCallback(
    (datum: IsoDate, dauerMin = 90) => {
      if (!draft) return
      const t: StammTreffen = { id: newId<StammTreffenId>(), datum, dauerMin }
      const sorted = [...draft.treffen, t].sort((a, b) => a.datum.localeCompare(b.datum))
      save({ ...draft, treffen: sorted })
    },
    [draft, save],
  )

  const updateTreffen = useCallback(
    (id: StammTreffenId, partial: Partial<Omit<StammTreffen, 'id'>>) => {
      if (!draft) return
      const treffen = draft.treffen
        .map((t) => (t.id === id ? { ...t, ...partial } : t))
        .sort((a, b) => a.datum.localeCompare(b.datum))
      save({ ...draft, treffen })
    },
    [draft, save],
  )

  const removeTreffen = useCallback(
    (id: StammTreffenId) => {
      if (!draft) return
      save({ ...draft, treffen: draft.treffen.filter((t) => t.id !== id) })
    },
    [draft, save],
  )

  const saveTreffen = useCallback(
    (t: StammTreffen) => {
      if (!draft) return
      const exists = draft.treffen.some((x) => x.id === t.id)
      const list = exists
        ? draft.treffen.map((x) => (x.id === t.id ? t : x))
        : [...draft.treffen, t]
      save({ ...draft, treffen: list.sort((a, b) => a.datum.localeCompare(b.datum)) })
    },
    [draft, save],
  )

  return { addTreffen, updateTreffen, removeTreffen, saveTreffen }
}

type AktionField = 'stammaktionen' | 'distriktAktionen' | 'regionalAktionen'

export function useAktionActions(
  draft: StammKontext | null,
  save: SaveFn,
  field: AktionField,
) {
  const addAktion = useCallback(
    (beginn: IsoDate) => {
      if (!draft) return
      const a: StammAktion = {
        id: newId<StammAktionId>(),
        titel: '',
        beginn,
        ende: beginn,
      }
      save({ ...draft, [field]: [...draft[field], a] })
    },
    [draft, save, field],
  )

  const updateAktion = useCallback(
    (id: StammAktionId, partial: Partial<Omit<StammAktion, 'id'>>) => {
      if (!draft) return
      save({
        ...draft,
        [field]: draft[field].map((a) => (a.id === id ? { ...a, ...partial } : a)),
      })
    },
    [draft, save, field],
  )

  const removeAktion = useCallback(
    (id: StammAktionId) => {
      if (!draft) return
      save({ ...draft, [field]: draft[field].filter((a) => a.id !== id) })
    },
    [draft, save, field],
  )

  return { addAktion, updateAktion, removeAktion }
}

export function useSaveAktion(draft: StammKontext | null, save: SaveFn) {
  return useCallback(
    (a: StammAktion, gruppe: AktionField) => {
      if (!draft) return
      const list = draft[gruppe]
      const exists = list.some((x) => x.id === a.id)
      const updated = exists ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a]
      save({ ...draft, [gruppe]: updated })
    },
    [draft, save],
  )
}

export function useImportedAktivitaetActions(draft: StammKontext | null, save: SaveFn) {
  const addImportedAktivitaetId = useCallback(
    (id: AktivitaetId) => {
      if (!draft) return
      if (draft.importierteAktivitaetIds.includes(id)) return
      save({ ...draft, importierteAktivitaetIds: [...draft.importierteAktivitaetIds, id] })
    },
    [draft, save],
  )

  const removeImportedAktivitaetId = useCallback(
    (id: AktivitaetId) => {
      if (!draft) return
      save({
        ...draft,
        importierteAktivitaetIds: draft.importierteAktivitaetIds.filter((x) => x !== id),
      })
    },
    [draft, save],
  )

  return { addImportedAktivitaetId, removeImportedAktivitaetId }
}
