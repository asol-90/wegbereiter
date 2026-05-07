/**
 * useStammKontext — React binding for StammKontextStore.
 *
 * Returns the current snapshot plus stable action callbacks.
 */
import { useSyncExternalStore } from 'react'
import { stammKontextStore, type StammKontextState } from './stammKontextStore'
import type { StammKontext } from '@/domain/types'
import type { StammKontextId } from '@/domain/ids'

export type StammKontextActions = {
  importKontext: (k: StammKontext) => Promise<StammKontext>
  update: (k: StammKontext) => Promise<StammKontext>
  remove: (id: StammKontextId) => Promise<void>
}

export type UseStammKontextResult = StammKontextState & StammKontextActions

const actions: StammKontextActions = {
  importKontext: (k) => stammKontextStore.importKontext(k),
  update: (k) => stammKontextStore.update(k),
  remove: (id) => stammKontextStore.remove(id),
}

export function useStammKontext(): UseStammKontextResult {
  const state = useSyncExternalStore(
    stammKontextStore.subscribe,
    stammKontextStore.getSnapshot,
    stammKontextStore.getSnapshot,
  )
  return { ...state, ...actions }
}

export function useStammKontextActions(): StammKontextActions {
  return actions
}
