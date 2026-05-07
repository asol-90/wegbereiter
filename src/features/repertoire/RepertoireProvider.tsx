/**
 * RepertoireProvider — triggers repertoireStore.init() on mount.
 */
import { useEffect, type ReactNode } from 'react'
import { repertoireStore } from './repertoireStore'

export function RepertoireProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    void repertoireStore.init()
  }, [])
  return <>{children}</>
}
