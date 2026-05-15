/**
 * repertoireStore — in-memory cache of Aktivitäten, Andachtsreihen & Abzeichen,
 * backed by IndexedDB.
 *
 * Minimal store: load all, save one, delete one, notify listeners.
 * Follows the same pattern as planungenStore and globalConfigStore.
 */
import {ABZEICHEN_KATALOG} from '@/domain/abzeichenKatalog'
import type {AktivitaetId, AndachtsreiheId} from '@/domain/ids'
import type {Abzeichen, Aktivitaet, Andachtsreihe} from '@/domain/types'
import {
    deleteAktivitaet as repoDeleteAkt,
    deleteAndachtsreihe as repoDeleteReihe,
    listAbzeichen,
    listAktivitaeten,
    listAndachtsreihen,
    saveAbzeichen as repoSaveAbzeichen,
    saveAktivitaet,
    saveAndachtsreihe,
} from '@/storage/repertoireRepo'

type Listener = () => void

export type RepertoireState = {
  loaded: boolean
  aktivitaeten: readonly Aktivitaet[]
  andachtsreihen: readonly Andachtsreihe[]
  abzeichen: readonly Abzeichen[]
}

const EMPTY: RepertoireState = Object.freeze({
  loaded: false,
  aktivitaeten: Object.freeze([]) as readonly Aktivitaet[],
  andachtsreihen: Object.freeze([]) as readonly Andachtsreihe[],
  abzeichen: Object.freeze([]) as readonly Abzeichen[],
})

export class RepertoireStore {
  private state: RepertoireState = EMPTY
  private listeners = new Set<Listener>()
  private initPromise: Promise<void> | null = null

  init(): Promise<void> {
    if (this.initPromise) return this.initPromise
    this.initPromise = (async () => {
      const [aktivitaeten, andachtsreihen] = await Promise.all([
        listAktivitaeten(),
        listAndachtsreihen(),
      ])
      // Abzeichen: seed from catalogue if IDB is empty
      let abzeichen = await listAbzeichen()
      if (abzeichen.length === 0 && ABZEICHEN_KATALOG.length > 0) {
        await Promise.all(ABZEICHEN_KATALOG.map((a) => repoSaveAbzeichen(a)))
        abzeichen = await listAbzeichen()
      }
      this.setState({
        loaded: true,
        aktivitaeten: Object.freeze(aktivitaeten),
        andachtsreihen: Object.freeze(andachtsreihen),
        abzeichen: Object.freeze(abzeichen),
      })
    })()
    return this.initPromise
  }

  /** Force-reload from DB (e.g. after seeding). */
  async reload(): Promise<void> {
    const [aktivitaeten, andachtsreihen, abzeichen] = await Promise.all([
      listAktivitaeten(),
      listAndachtsreihen(),
      listAbzeichen(),
    ])
    this.setState({
      loaded: true,
      aktivitaeten: Object.freeze(aktivitaeten),
      andachtsreihen: Object.freeze(andachtsreihen),
      abzeichen: Object.freeze(abzeichen),
    })
  }

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener)
    return () => { this.listeners.delete(listener) }
  }

  getSnapshot = (): RepertoireState => this.state

  // ── Aktivitäten ──

  async saveAktivitaet(a: Aktivitaet): Promise<void> {
    await saveAktivitaet(a)
    await this.reload()
  }

  async removeAktivitaet(id: AktivitaetId): Promise<void> {
    await repoDeleteAkt(id)
    await this.reload()
  }

  // ── Andachtsreihen ──

  async saveAndachtsreihe(r: Andachtsreihe): Promise<void> {
    await saveAndachtsreihe(r)
    await this.reload()
  }

  async removeAndachtsreihe(id: AndachtsreiheId): Promise<void> {
    await repoDeleteReihe(id)
    await this.reload()
  }

  async importAktivitaeten(items: Aktivitaet[]): Promise<void> {
    await Promise.all(items.map((a) => saveAktivitaet(a)))
    await this.reload()
  }

  async importAndachtsreihen(items: Andachtsreihe[]): Promise<void> {
    await Promise.all(items.map((r) => saveAndachtsreihe(r)))
    await this.reload()
  }

  async importAbzeichen(items: Abzeichen[]): Promise<void> {
    await Promise.all(items.map((a) => repoSaveAbzeichen(a)))
    await this.reload()
  }

  // ── Legacy aliases (keep existing call-sites working) ──

  async save(a: Aktivitaet): Promise<void> {
    return this.saveAktivitaet(a)
  }

  async remove(id: AktivitaetId): Promise<void> {
    return this.removeAktivitaet(id)
  }

  /** For tests. */
  reset(): void {
    this.state = EMPTY
    this.initPromise = null
    this.notify()
  }

  private setState(next: RepertoireState): void {
    this.state = next
    this.notify()
  }

  private notify(): void {
    for (const l of this.listeners) l()
  }
}

export const repertoireStore = new RepertoireStore()
