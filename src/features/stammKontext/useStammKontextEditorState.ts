/**
 * useStammKontextEditorState — local form state with debounced auto-save.
 *
 * Keeps a draft copy in React state and debounces saves to the store so the
 * UI stays snappy while the DB write happens in the background.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  StammKontext,
  StammBlock,
  StammTreffen,
  StammAktion,
  IsoDate,
} from '@/domain/types'
import type { StammKontextId, StammTreffenId, StammAktionId, AktivitaetId } from '@/domain/ids'
import { newId } from '@/domain/ids'
import { stammKontextStore } from './stammKontextStore'
import { useStammKontext } from './useStammKontext'

const DEBOUNCE_MS = 500

export function useStammKontextEditorState(kontextId: StammKontextId) {
  const { kontexte } = useStammKontext()
  const stored = kontexte.find((k) => k.id === kontextId) ?? null

  const [draft, setDraftRaw] = useState<StammKontext | null>(stored)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep draft in sync when the store pushes an update from outside
  useEffect(() => {
    if (stored && !draft) setDraftRaw(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored?.id])

  const save = useCallback((next: StammKontext) => {
    const updated: StammKontext = {
      ...next,
      bearbeitetAm: new Date().toISOString(),
    }
    setDraftRaw(updated)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      stammKontextStore.update(updated)
    }, DEBOUNCE_MS)
  }, [])

  const patch = useCallback(
    (partial: Partial<StammKontext>) => {
      if (!draft) return
      save({ ...draft, ...partial })
    },
    [draft, save],
  )

  // ── Thema ──

  const setThema = useCallback((thema: string) => patch({ thema }), [patch])
  const setThemaBeschreibung = useCallback(
    (v: string) => patch({ themaBeschreibung: v || undefined }),
    [patch],
  )
  const setBearbeitungsNotiz = useCallback(
    (v: string) => patch({ bearbeitungsNotiz: v || undefined }),
    [patch],
  )
  const setThemenTag = useCallback(
    (v: string) => patch({ themenTag: v || undefined }),
    [patch],
  )

  // ── Stammzeit (default blocks) ──

  const setDefaultAnfangsBlock = useCallback(
    (blocks: StammBlock[]) => patch({ defaultAnfangsBlock: blocks }),
    [patch],
  )
  const setDefaultEndBlock = useCallback(
    (blocks: StammBlock[]) => patch({ defaultEndBlock: blocks }),
    [patch],
  )

  // ── Treffen ──

  const addTreffen = useCallback(
    (datum: IsoDate, dauerMin = 90) => {
      if (!draft) return
      const t: StammTreffen = { id: newId<StammTreffenId>(), datum, dauerMin }
      const sorted = [...draft.treffen, t].sort((a, b) =>
        a.datum.localeCompare(b.datum),
      )
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

  // ── Aktionen (all three groups share the same shape) ──

  function makeAktionHelpers(
    field: 'stammaktionen' | 'distriktAktionen' | 'regionalAktionen',
  ) {
    const addAktion = (beginn: IsoDate) => {
      if (!draft) return
      const a: StammAktion = {
        id: newId<StammAktionId>(),
        titel: '',
        beginn,
        ende: beginn,
      }
      save({ ...draft, [field]: [...draft[field], a] })
    }

    const updateAktion = (
      id: StammAktionId,
      partial: Partial<Omit<StammAktion, 'id'>>,
    ) => {
      if (!draft) return
      save({
        ...draft,
        [field]: draft[field].map((a) =>
          a.id === id ? { ...a, ...partial } : a,
        ),
      })
    }

    const removeAktion = (id: StammAktionId) => {
      if (!draft) return
      save({ ...draft, [field]: draft[field].filter((a) => a.id !== id) })
    }

    return { addAktion, updateAktion, removeAktion }
  }

  const stammAktionHelpers = makeAktionHelpers('stammaktionen')
  const distriktAktionHelpers = makeAktionHelpers('distriktAktionen')
  const regionalAktionHelpers = makeAktionHelpers('regionalAktionen')

  // ── Treffen / Aktionen upsert helpers ──

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

  const saveAktion = useCallback(
    (a: StammAktion, gruppe: 'stammaktionen' | 'distriktAktionen' | 'regionalAktionen') => {
      if (!draft) return
      const list = draft[gruppe]
      const exists = list.some((x) => x.id === a.id)
      const updated = exists ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a]
      save({ ...draft, [gruppe]: updated })
    },
    [draft, save],
  )

  // ── Aktivitäten (stamm-import) ──

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

  return {
    draft,
    patch,
    // Thema
    setThema,
    setThemaBeschreibung,
    setBearbeitungsNotiz,
    setThemenTag,
    // Stammzeit
    setDefaultAnfangsBlock,
    setDefaultEndBlock,
    // Treffen
    addTreffen,
    updateTreffen,
    removeTreffen,
    saveTreffen,
    // Aktionen
    stamm: stammAktionHelpers,
    distrikt: distriktAktionHelpers,
    regional: regionalAktionHelpers,
    saveAktion,
    // Aktivitäten
    addImportedAktivitaetId,
    removeImportedAktivitaetId,
  }
}
