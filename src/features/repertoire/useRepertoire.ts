/**
 * useRepertoire — React hook to read from the RepertoireStore.
 */
import { useSyncExternalStore } from 'react'
import { repertoireStore, type RepertoireState } from './repertoireStore'

export function useRepertoire(): RepertoireState {
  return useSyncExternalStore(
    repertoireStore.subscribe,
    repertoireStore.getSnapshot,
  )
}

export function useRepertoireActions() {
  return {
    save: repertoireStore.save.bind(repertoireStore),
    remove: repertoireStore.remove.bind(repertoireStore),
    saveAndachtsreihe: repertoireStore.saveAndachtsreihe.bind(repertoireStore),
    removeAndachtsreihe: repertoireStore.removeAndachtsreihe.bind(repertoireStore),
    reload: repertoireStore.reload.bind(repertoireStore),
  }
}
