/**
 * useGlobalConfig — React binding for GlobalConfigStore.
 *
 * Returns the current state plus stable action callbacks. Components that
 * only need to mutate (no re-render on change) can use
 * `useGlobalConfigActions`.
 */
import { useSyncExternalStore } from 'react'
import type { GlobalConfig } from '@/domain/types'
import {
  globalConfigStore,
  type GlobalConfigState,
} from './globalConfigStore'

export type GlobalConfigActions = {
  save: (next: GlobalConfig) => Promise<GlobalConfig>
  patch: (patch: Partial<GlobalConfig>) => Promise<GlobalConfig>
}

export type UseGlobalConfigResult = GlobalConfigState & GlobalConfigActions

const actions: GlobalConfigActions = {
  save: (next) => globalConfigStore.save(next),
  patch: (p) => globalConfigStore.patch(p),
}

export function useGlobalConfig(): UseGlobalConfigResult {
  const state = useSyncExternalStore(
    globalConfigStore.subscribe,
    globalConfigStore.getSnapshot,
    globalConfigStore.getSnapshot,
  )
  return { ...state, ...actions }
}

export function useGlobalConfigActions(): GlobalConfigActions {
  return actions
}
