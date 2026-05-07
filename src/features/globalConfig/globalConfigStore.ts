/**
 * globalConfigStore — in-memory cache of the single GlobalConfig singleton,
 * backed by IndexedDB.
 *
 * Same shape as planungenStore: emits on change via useSyncExternalStore.
 * Writes go through the repo; after a successful save the snapshot is
 * recomputed and listeners are notified so dependent UI (Ferien-Bänder,
 * Settings-Modal, Initiierungs-Defaults, …) updates instantly.
 */
import type { GlobalConfig } from '@/domain/types'
import { defaultGlobalConfig } from '@/domain/planungFactory'
import {
  getGlobalConfig as repoGet,
  saveGlobalConfig as repoSave,
} from '@/storage/globalConfigRepo'

export type GlobalConfigState = {
  /** `true` once `init()` has resolved at least once. */
  loaded: boolean
  /** Current snapshot; equals defaults until `init()` completes. */
  config: GlobalConfig
}

type Listener = () => void

const EMPTY_STATE: GlobalConfigState = Object.freeze({
  loaded: false,
  config: Object.freeze(defaultGlobalConfig()) as GlobalConfig,
})

function freezeState(
  loaded: boolean,
  config: GlobalConfig,
): GlobalConfigState {
  return Object.freeze({ loaded, config: Object.freeze(config) as GlobalConfig })
}

export class GlobalConfigStore {
  private state: GlobalConfigState = EMPTY_STATE
  private listeners = new Set<Listener>()
  private initPromise: Promise<void> | null = null

  /** Load the GlobalConfig from IndexedDB. Idempotent. */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      const cfg = await repoGet()
      this.setState(freezeState(true, cfg))
    })()
    return this.initPromise
  }

  /** For tests: wipe in-memory state so a fresh init() reloads from the DB. */
  reset(): void {
    this.state = EMPTY_STATE
    this.initPromise = null
    this.notify()
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  getSnapshot = (): GlobalConfigState => this.state

  /**
   * Persist a new GlobalConfig (full replacement) and notify listeners.
   * Returns the persisted value.
   */
  async save(next: GlobalConfig): Promise<GlobalConfig> {
    await repoSave(next)
    this.setState(freezeState(true, next))
    return next
  }

  /**
   * Partial update convenience: merges `patch` into the current config and
   * persists. The merge is shallow — fields like `defaultRhythmus` must be
   * passed as a full object, not a partial.
   */
  async patch(patch: Partial<GlobalConfig>): Promise<GlobalConfig> {
    const next: GlobalConfig = { ...this.state.config, ...patch }
    return this.save(next)
  }

  private setState(next: GlobalConfigState): void {
    this.state = next
    this.notify()
  }

  private notify(): void {
    for (const l of this.listeners) l()
  }
}

/** Module-level singleton — one config cache per app. */
export const globalConfigStore = new GlobalConfigStore()
