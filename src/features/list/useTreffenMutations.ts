/**
 * useTreffenMutations — convenience hook for mutating a single Treffen
 * inside a Planung, with auto-save to IndexedDB.
 *
 * Every mutation produces a new Planung snapshot with the target Treffen
 * replaced, then persists via PlanungenStore.update().
 */
import {newId, type ProgrammpunktId, type TreffenId} from '@/domain/ids'
import type {Planung, Programmpunkt, Treffen} from '@/domain/types'
import type {WBKey} from '@/domain/wb'
import {usePlanungenActions} from '@/features/planungen'
import {useCallback} from 'react'

export type TreffenPatch = Partial<
  Pick<Treffen, 'titel' | 'notiz' | 'fixiert' | 'sollWB' | 'programm'>
>

/**
 * Core helper: patch a single Treffen inside a Planung and persist.
 */
function patchTreffen(
  planung: Planung,
  treffenId: TreffenId,
  patch: TreffenPatch,
): Planung {
  return {
    ...planung,
    treffen: planung.treffen.map((t) =>
      t.id === treffenId ? { ...t, ...patch } : t,
    ),
    aktualisiertAm: new Date().toISOString(),
  }
}

export function useTreffenMutations(planung: Planung) {
  const { update } = usePlanungenActions()

  const persist = useCallback(
    (treffenId: TreffenId, patch: TreffenPatch) => {
      const next = patchTreffen(planung, treffenId, patch)
      update(next)
    },
    [planung, update],
  )

  // ─── Simple field mutations ───────────────────────────────────────────

  const setTitel = useCallback(
    (treffenId: TreffenId, titel: string) => {
      persist(treffenId, { titel: titel || undefined })
    },
    [persist],
  )

  const setNotiz = useCallback(
    (treffenId: TreffenId, notiz: string) => {
      persist(treffenId, { notiz: notiz || undefined })
    },
    [persist],
  )

  const toggleFixiert = useCallback(
    (treffenId: TreffenId) => {
      const treffen = planung.treffen.find((t) => t.id === treffenId)
      if (!treffen) return
      persist(treffenId, { fixiert: !treffen.fixiert })
    },
    [planung, persist],
  )

  const toggleSollWB = useCallback(
    (treffenId: TreffenId, key: WBKey) => {
      const treffen = planung.treffen.find((t) => t.id === treffenId)
      if (!treffen) return
      const has = treffen.sollWB.includes(key)
      let next: WBKey[]
      if (has) {
        next = treffen.sollWB.filter((k) => k !== key)
      } else {
        // Max 2 Soll-WB
        next = treffen.sollWB.length >= 2
          ? [treffen.sollWB[1]!, key]
          : [...treffen.sollWB, key]
      }
      persist(treffenId, { sollWB: next })
    },
    [planung, persist],
  )

  // ─── Programmpunkt mutations ──────────────────────────────────────────

  const addProgrammpunkt = useCallback(
    (treffenId: TreffenId, pp: Omit<Programmpunkt, 'id'>) => {
      const treffen = planung.treffen.find((t) => t.id === treffenId)
      if (!treffen) return
      const newPP: Programmpunkt = {
        ...pp,
        id: newId<ProgrammpunktId>(),
      }
      persist(treffenId, { programm: [...treffen.programm, newPP] })
    },
    [planung, persist],
  )

  const removeProgrammpunkt = useCallback(
    (treffenId: TreffenId, ppId: ProgrammpunktId) => {
      const treffen = planung.treffen.find((t) => t.id === treffenId)
      if (!treffen) return
      persist(treffenId, {
        programm: treffen.programm.filter((p) => p.id !== ppId),
      })
    },
    [planung, persist],
  )

  const updateProgrammpunkt = useCallback(
    (
      treffenId: TreffenId,
      ppId: ProgrammpunktId,
      patch: Partial<Pick<Programmpunkt, 'name' | 'dauerMin' | 'verantwortlicherId' | 'gastName' | 'wbTags'>>,
    ) => {
      const treffen = planung.treffen.find((t) => t.id === treffenId)
      if (!treffen) return
      persist(treffenId, {
        programm: treffen.programm.map((p) =>
          p.id === ppId ? { ...p, ...patch } : p,
        ),
      })
    },
    [planung, persist],
  )

  const reorderProgrammpunkte = useCallback(
    (treffenId: TreffenId, orderedIds: ProgrammpunktId[]) => {
      const treffen = planung.treffen.find((t) => t.id === treffenId)
      if (!treffen) return
      const byId = new Map(treffen.programm.map((p) => [p.id, p]))
      const reordered = orderedIds
        .map((id) => byId.get(id))
        .filter((p): p is Programmpunkt => p != null)
      persist(treffenId, { programm: reordered })
    },
    [planung, persist],
  )

  /** Replace an existing Programmpunkt at its current index (for Konkretisieren). */
  const replaceProgrammpunkt = useCallback(
    (treffenId: TreffenId, oldPpId: ProgrammpunktId, pp: Omit<Programmpunkt, 'id'>) => {
      const treffen = planung.treffen.find((t) => t.id === treffenId)
      if (!treffen) return
      const newPP: Programmpunkt = { ...pp, id: newId<ProgrammpunktId>() }
      persist(treffenId, {
        programm: treffen.programm.map((p) => (p.id === oldPpId ? newPP : p)),
      })
    },
    [planung, persist],
  )

  return {
    setTitel,
    setNotiz,
    toggleFixiert,
    toggleSollWB,
    addProgrammpunkt,
    removeProgrammpunkt,
    updateProgrammpunkt,
    reorderProgrammpunkte,
    replaceProgrammpunkt,
  }
}
