/**
 * GlobalConfigProvider — triggers a single `globalConfigStore.init()` on mount.
 *
 * Mirror of PlanungenProvider. No React Context: children read the store via
 * `useGlobalConfig`.
 */
import { useEffect, type ReactNode } from 'react'
import { globalConfigStore } from './globalConfigStore'
import { seedRepertoireIfEmpty } from '@/domain/seedRepertoire'

export type GlobalConfigProviderProps = {
  children: ReactNode
}

export function GlobalConfigProvider({ children }: GlobalConfigProviderProps) {
  useEffect(() => {
    void globalConfigStore.init().then(() => seedRepertoireIfEmpty())
  }, [])
  return <>{children}</>
}
