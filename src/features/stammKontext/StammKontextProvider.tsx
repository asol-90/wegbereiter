/**
 * StammKontextProvider — triggers a single `stammKontextStore.init()` on mount.
 *
 * No React Context: children read the store via `useStammKontext`. The provider
 * exists only so the app can declare "load the StammKontext cache now" in one
 * place at the top of the tree.
 */
import { useEffect, type ReactNode } from 'react'
import { stammKontextStore } from './stammKontextStore'

export type StammKontextProviderProps = {
  children: ReactNode
}

export function StammKontextProvider({ children }: StammKontextProviderProps) {
  useEffect(() => {
    void stammKontextStore.init()
  }, [])
  return <>{children}</>
}
