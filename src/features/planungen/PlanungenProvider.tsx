/**
 * PlanungenProvider — triggers a single `planungenStore.init()` on mount.
 *
 * No React Context: children read the store via `usePlanungen`. The provider
 * exists only so the app can declare "load the Planungen cache now" in one
 * place at the top of the tree.
 */
import {type ReactNode, useEffect} from 'react'
import {planungenStore} from './planungenStore'

export type PlanungenProviderProps = {
  children: ReactNode
}

export function PlanungenProvider({ children }: PlanungenProviderProps) {
  useEffect(() => {
    // Fire-and-forget: the store guards against double-init internally.
    void planungenStore.init()
  }, [])
  return <>{children}</>
}
