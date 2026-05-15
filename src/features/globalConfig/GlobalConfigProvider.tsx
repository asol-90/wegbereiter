/**
 * GlobalConfigProvider — triggers a single `globalConfigStore.init()` on mount.
 *
 * Mirror of PlanungenProvider. No React Context: children read the store via
 * `useGlobalConfig`.
 */
import {seedRepertoireIfEmpty} from '@/domain/seedRepertoire'
import {type ReactNode, useEffect} from 'react'
import {globalConfigStore} from './globalConfigStore'

export type GlobalConfigProviderProps = {
  children: ReactNode
}

export function GlobalConfigProvider({ children }: GlobalConfigProviderProps) {
  useEffect(() => {
    void globalConfigStore.init().then(() => seedRepertoireIfEmpty())
  }, [])
  return <>{children}</>
}
