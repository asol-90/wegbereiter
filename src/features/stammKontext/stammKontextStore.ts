/**
 * stammKontextStore — in-memory cache of all StammKontexte, backed by IndexedDB.
 *
 * Same pattern as PlanungenStore: singleton, useSyncExternalStore contract,
 * frozen snapshots, mutations go through repo.
 *
 * StammKontexte are sorted by the date of their first treffen/aktion (earliest first).
 */
import {newId, type StammImportId, type StammKontextId} from '@/domain/ids'
import type {IsoDate, StammKontext} from '@/domain/types'
import {deleteStammKontext, getStammKontext, listStammKontexte, saveStammKontext,} from '@/storage/stammKontextRepo'

export type StammKontextState = {
  /** `true` once `init()` has resolved at least once. */
  loaded: boolean
  /** All imported StammKontexte, sorted by earliest date. */
  kontexte: readonly StammKontext[]
}

type Listener = () => void

const EMPTY_STATE: StammKontextState = Object.freeze({
  loaded: false,
  kontexte: Object.freeze([]) as readonly StammKontext[],
})

/** Earliest date across all treffen + stammaktionen in a context. */
function earliestDate(k: StammKontext): string {
  const treffenDates = k.treffen.map((t) => t.datum)
  const aktionDates = k.stammaktionen.map((a) => a.beginn)
  const all = [...treffenDates, ...aktionDates]
  if (all.length === 0) return '9999-12-31'
  return all.sort()[0]
}

function sortByEarliestDate(list: readonly StammKontext[]): StammKontext[] {
  return [...list].sort((a, b) =>
    earliestDate(a).localeCompare(earliestDate(b)),
  )
}

function freezeState(
  loaded: boolean,
  kontexte: readonly StammKontext[],
): StammKontextState {
  return Object.freeze({
    loaded,
    kontexte: Object.freeze(sortByEarliestDate(kontexte)) as readonly StammKontext[],
  })
}

export class StammKontextStore {
  private state: StammKontextState = EMPTY_STATE
  private listeners = new Set<Listener>()
  private initPromise: Promise<void> | null = null

  /** Load all StammKontexte from IndexedDB. Idempotent. */
  init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      const loaded = await listStammKontexte()
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

  getSnapshot = (): StammKontextState => this.state

  /** Import a new StammKontext, persist it, and add it to the snapshot. */
  async importKontext(kontext: StammKontext): Promise<StammKontext> {
    await saveStammKontext(kontext)
    const persisted = (await getStammKontext(kontext.id)) ?? kontext
    this.setState(
      freezeState(true, [
        ...this.state.kontexte.filter((x) => x.id !== persisted.id),
        persisted,
      ]),
    )
    return persisted
  }

  /** Delete a StammKontext and drop it from the snapshot. */
  async remove(id: StammKontextId): Promise<void> {
    await deleteStammKontext(id)
    this.setState(
      freezeState(
        true,
        this.state.kontexte.filter((x) => x.id !== id),
      ),
    )
  }

  /**
   * Create a new empty StammKontext (no treffen, no thema) and persist it.
   * The `zeitraum` is informational only — callers use it to show context
   * during creation; dates are added later via the editor.
   */
  async create(_zeitraum?: { start: IsoDate; ende: IsoDate }): Promise<StammKontext> {
    const now = new Date().toISOString()
    const kontext: StammKontext = {
      id: newId<StammKontextId>(),
      stammImportId: newId<StammImportId>(),
      thema: '',
      treffen: [],
      stammaktionen: [],
      distriktAktionen: [],
      regionalAktionen: [],
      defaultAnfangsBlock: [],
      defaultEndBlock: [],
      bearbeitetAm: now,
      importiertAm: now,
      importierteAktivitaetIds: [],
    }
    await saveStammKontext(kontext)
    const persisted = (await getStammKontext(kontext.id)) ?? kontext
    this.setState(
      freezeState(true, [...this.state.kontexte, persisted]),
    )
    return persisted
  }

  /** Replace an existing Kontext with an updated version. */
  async update(kontext: StammKontext): Promise<StammKontext> {
    await saveStammKontext(kontext)
    const persisted = (await getStammKontext(kontext.id)) ?? kontext
    this.setState(
      freezeState(
        true,
        this.state.kontexte.map((x) => (x.id === persisted.id ? persisted : x)),
      ),
    )
    return persisted
  }

  private setState(next: StammKontextState): void {
    this.state = next
    this.notify()
  }

  private notify(): void {
    for (const l of this.listeners) l()
  }
}

/** Module-level singleton — one cache per app. */
export const stammKontextStore = new StammKontextStore()
