/**
 * Stamm-Kontext domain types — extracted from types.ts to keep that file
 * focused on Planung/Treffen/Programmpunkt. Re-exported from types.ts so
 * consumers can continue importing from a single barrel.
 */
import type { AktivitaetTyp, AktivitaetUntertyp } from './aktivitaetKatalog'
import type {
  AktivitaetId,
  StammAktionId,
  StammImportId,
  StammKontextId,
  StammTreffenId,
} from './ids'
import type { IsoDate, IsoDateTime } from './types'

/**
 * A single activity within a Stamm-Block (beginning or end of a meeting).
 * E.g. "Stammrunde" (15 min) or "Andacht" (10 min).
 */
export type StammBlock = {
  name: string
  typ: AktivitaetTyp
  untertyp?: AktivitaetUntertyp
  dauerMin: number
}

/**
 * A regular meeting defined by the Stammkontext.
 * The team plans content in the free time between Stamm-Blöcke.
 */
export type StammTreffen = {
  id: StammTreffenId
  datum: IsoDate
  dauerMin: number
  /** Override for this meeting's opening block. undefined = use defaults. [] = no opening block. */
  anfangsBlock?: StammBlock[]
  /** Override for this meeting's closing block. undefined = use defaults. [] = no closing block. */
  endBlock?: StammBlock[]
}

/**
 * A Stammaktion — blocked date(s) where the team has no planning freedom.
 * E.g. camp, Stammversammlung.
 */
export type StammAktion = {
  id: StammAktionId
  titel: string
  beschreibung?: string
  /** Start date (day-granular). Multi-day events: beginn < ende. */
  beginn: IsoDate
  /** End date (inclusive). Same as beginn for single-day events. */
  ende: IsoDate
  ort?: string
}

/**
 * Global Stammkontext — the frame set by the Stammführer for the entire Stamm.
 * Lives in its own store (not embedded in Planung). All Planungen reference it.
 */
export type StammKontext = {
  id: StammKontextId
  stammImportId: StammImportId
  thema: string
  themaBeschreibung?: string
  themenTag?: string

  /** All regular meetings for this season. */
  treffen: StammTreffen[]
  /** Blocked dates organised by the Stamm (e.g. camps, assemblies). */
  stammaktionen: StammAktion[]
  /** Blocked dates organised by the district. */
  distriktAktionen: StammAktion[]
  /** Blocked dates organised at regional/Verband level. */
  regionalAktionen: StammAktion[]

  /** Default opening block for all meetings (overridable per meeting). */
  defaultAnfangsBlock: StammBlock[]
  /** Default closing block for all meetings (overridable per meeting). */
  defaultEndBlock: StammBlock[]

  /** When the Stammführer last edited this file. */
  bearbeitetAm: IsoDateTime
  /** Optional edit note from the Stammführer (e.g. "Lager verschoben auf KW 42"). */
  bearbeitungsNotiz?: string
  /** When this file was imported into the app. */
  importiertAm: IsoDateTime

  /** IDs of Aktivitäten imported into the Repertoire from this context. */
  importierteAktivitaetIds: AktivitaetId[]
}
