/**
 * useFerienForYear — loads Ferien/Feiertage for a given year, using the
 * Bundesland from the reactive GlobalConfigStore.
 *
 * Returns:
 *   - `undefined` while loading (store not yet initialised, or fetch in flight)
 *   - `null` when no Bundesland is configured or fetch failed without a cached
 *     entry (so the UI renders without Ferien-Bändern)
 *   - a `FerienCacheEntry` otherwise
 *
 * Re-fetches automatically when either the year or the Bundesland in
 * GlobalConfig changes, so toggling the Bundesland in the Settings-Modal
 * updates the Jahreskalender instantly.
 */
import type {FerienCacheEntry} from '@/domain/types'
import {useGlobalConfig} from '@/features/globalConfig'
import {FerienService} from '@/services/ferienService'
import {useEffect, useState} from 'react'

const service = new FerienService()

export type FerienState = FerienCacheEntry | null | undefined

export function useFerienForYear(year: number): FerienState {
  const { config, loaded } = useGlobalConfig()
  const bundesland = config.bundesland
  const [state, setState] = useState<FerienState>(undefined)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    // Wait for the store's first snapshot before deciding.
    if (!loaded) {
      setState(undefined)
      return
    }
    if (!bundesland) {
      setState(null)
      return
    }

    let cancelled = false
    setState(undefined)
    ;(async () => {
      try {
        const entry = await service.getForYear(bundesland, year)
        if (!cancelled) setState(entry)
      } catch {
        // Offline and no cache — render without Ferien.
        if (!cancelled) setState(null)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [year, bundesland, loaded])
  /* eslint-enable react-hooks/set-state-in-effect */

  return state
}
