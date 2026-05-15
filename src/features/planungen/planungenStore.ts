/**
 * planungenStore — in-memory cache of all Planungen, backed by IndexedDB.
 *
 * Minimal event-emitter exposing the useSyncExternalStore contract
 * (subscribe / getSnapshot). Mutations go through planungRepo so IndexedDB
 * stays authoritative; after a successful write the store recomputes its
 * snapshot and notifies listeners.
 *
 * Snapshots are frozen reference-immutable objects so React can detect
 * changes via identity comparison.
 */
import type {PlanungId} from '@/domain/ids'
import {buildPlanung, type CreatePlanungInput,} from '@/domain/planungFactory'
import type {Planung} from '@/domain/types'
import {deletePlanung, getPlanung, listPlanungen, savePlanung,} from '@/storage/planungRepo'

export type PlanungenState = {
  /** `true` once `init()` has resolved at least once. */
  loaded: boolean
  /** Sorted by zeitraum.start descending (newest first). */
  planungen: readonly Planung[]
}

type Listener = () => void

const EMPTY_STATE: PlanungenState = Object.freeze({
  loaded: false,
  planungen: Object.freeze([]) as readonly Planung[],
})

function sortByStartDesc(list: readonly Planung[]): Planung[] {
  return [...list].sort((a, b) =>
    b.zeitraum.start.localeCompare(a.zeitraum.start),
  )
}

function freezeState(
  loaded: boolean,
  planungen: readonly Planung[],
): PlanungenState {
  return Object.freeze({
    loaded,
    planungen: Object.freeze(sortByStartDesc(planungen)) as readonly Planung[],
  })
}

export class PlanungenStore {
  private state: PlanungenState = EMPTY_STATE
  private listeners = new Set<Listener>()
  private initPromise: Promise<void> | null = null

  /** Load all Planungen from IndexedDB. Idempotent — subsequent calls reuse the in-flight promise. */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      const loaded = await listPlanungen()
      this.setState(freezeState(true, loaded))
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

  getSnapshot = (): PlanungenState => this.state

  /**
   * Build a new Planung from `input`, persist it, and add it to the snapshot.
   * Returns the new Planung so callers can navigate to it.
   */
  async create(input: CreatePlanungInput): Promise<Planung> {
    const p = buildPlanung(input)
    await savePlanung(p)
    // Re-read so aktualisiertAm matches the value the repo stamped.
    const persisted = (await getPlanung(p.id)) ?? p
    this.setState(
      freezeState(true, [
        ...this.state.planungen.filter((x) => x.id !== persisted.id),
        persisted,
      ]),
    )
    return persisted
  }

  /** Persist an updated Planung and replace it in the snapshot. */
  async update(p: Planung): Promise<Planung> {
    await savePlanung(p)
    const persisted = (await getPlanung(p.id)) ?? p
    this.setState(
      freezeState(
        true,
        this.state.planungen.map((x) => (x.id === persisted.id ? persisted : x)),
      ),
    )
    return persisted
  }

  /** Delete a Planung and drop it from the snapshot. */
  async remove(id: PlanungId): Promise<void> {
    await deletePlanung(id)
    this.setState(
      freezeState(
        true,
        this.state.planungen.filter((x) => x.id !== id),
      ),
    )
  }

  private setState(next: PlanungenState): void {
    this.state = next
    this.notify()
  }

  private notify(): void {
    for (const l of this.listeners) l()
  }
}

/** Module-level singleton — one cache per app. */
export const planungenStore = new PlanungenStore()
