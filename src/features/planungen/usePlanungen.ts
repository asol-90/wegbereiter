/**
 * usePlanungen — React binding for PlanungenStore.
 *
 * Returns the current snapshot plus stable action callbacks.
 * The underlying store is the module-level singleton; components
 * that only need the actions (and not the list) can use
 * `usePlanungenActions` to avoid re-rendering on every change.
 */
import { useSyncExternalStore } from 'react'
import { planungenStore, type PlanungenState } from './planungenStore'
import type { Planung } from '@/domain/types'
import type { PlanungId } from '@/domain/ids'
import type { CreatePlanungInput } from '@/domain/planungFactory'

export type PlanungenActions = {
  create: (input: CreatePlanungInput) => Promise<Planung>
  update: (p: Planung) => Promise<Planung>
  remove: (id: PlanungId) => Promise<void>
}

export type UsePlanungenResult = PlanungenState & PlanungenActions

const actions: PlanungenActions = {
  create: (input) => planungenStore.create(input),
  update: (p) => planungenStore.update(p),
  remove: (id) => planungenStore.remove(id),
}

export function usePlanungen(): UsePlanungenResult {
  const state = useSyncExternalStore(
    planungenStore.subscribe,
    planungenStore.getSnapshot,
    planungenStore.getSnapshot,
  )
  return { ...state, ...actions }
}

export function usePlanungenActions(): PlanungenActions {
  return actions
}
