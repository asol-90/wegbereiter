/**
 * useStammKontext — React binding for StammKontextStore.
 *
 * Returns the current snapshot plus stable action callbacks.
 */
import type {StammKontextId} from '@/domain/ids'
import type {IsoDate, StammKontext} from '@/domain/types'
import {useSyncExternalStore} from 'react'
import {type StammKontextState, stammKontextStore} from './stammKontextStore'

export type StammKontextActions = {
  create: (zeitraum?: { start: IsoDate; ende: IsoDate }) => Promise<StammKontext>
  importKontext: (k: StammKontext) => Promise<StammKontext>
  update: (k: StammKontext) => Promise<StammKontext>
  remove: (id: StammKontextId) => Promise<void>
}

export type UseStammKontextResult = StammKontextState & StammKontextActions

const actions: StammKontextActions = {
  create: (z) => stammKontextStore.create(z),
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
