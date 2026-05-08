/**
 * Core domain types for the Stammtreff Planer.
 *
 * Serialization: Dates are stored as ISO strings ('yyyy-MM-dd') to stay
 * consistent across IndexedDB, JSON export/import, and URL-safe sharing.
 */
import type {
  AbwesenheitId,
  AbzeichenAnforderungId,
  AbzeichenId,
  AktivitaetId,
  AndachtsEinheitId,
  AndachtsreiheId,
  MitarbeiterId,
  PlanungId,
  ProgrammpunktId,
  StammAktionId,
  StammImportId,
  StammKontextId,
  StammTreffenId,
  TreffenId,
} from './ids'
import type { WBKey, WBTag } from './wb'
import type { AktivitaetTyp, AktivitaetUntertyp } from './aktivitaetKatalog'

// Re-export so consumers can import from types.ts as before
export type { AktivitaetTyp, AktivitaetUntertyp } from './aktivitaetKatalog'
export { AKTIVITAET_TYPEN } from './aktivitaetKatalog'

/** ISO-Datum 'yyyy-MM-dd'. */
export type IsoDate = string
/** ISO-Datetime incl. seconds. */
export type IsoDateTime = string

/** Deutsche Bundesländer als API-Kürzel (für ferien-api.de / feiertage-api.de). */
export const BUNDESLAND_KEYS = [
  'BW',
  'BY',
  'BE',
  'BB',
  'HB',
  'HH',
  'HE',
  'MV',
  'NI',
  'NW',
  'RP',
  'SL',
  'SN',
  'ST',
  'SH',
  'TH',
] as const
export type BundeslandKey = (typeof BUNDESLAND_KEYS)[number]

export const BUNDESLAND_LABELS: Record<BundeslandKey, string> = {
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  BE: 'Berlin',
  BB: 'Brandenburg',
  HB: 'Bremen',
  HH: 'Hamburg',
  HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein',
  TH: 'Thüringen',
}

export const WEEKDAYS = [
  'montag',
  'dienstag',
  'mittwoch',
  'donnerstag',
  'freitag',
  'samstag',
  'sonntag',
] as const
export type Weekday = (typeof WEEKDAYS)[number]

/**
 * Rhythmus — how often regular meetings occur.
 * `weekCount` is the interval in weeks. `weekly` = 1, `biweekly` = 2, `monthly` ≈ 4.
 * 'custom' allows arbitrary positive integers.
 */
export type Rhythmus =
  | { kind: 'weekly' }
  | { kind: 'biweekly' }
  | { kind: 'monthly' }
  | { kind: 'custom'; weekCount: number }

// ─── Global Config ──────────────────────────────────────────────────────────

export type Teilstamm = 'Kundschafter+' | 'Entdecker+'

export type GlobalConfig = {
  bundesland: BundeslandKey | null
  defaultWeekday: Weekday
  defaultRhythmus: Rhythmus
  defaultDauerMinuten: number
  lastActivePlanungId: PlanungId | null
  teilstamm: Teilstamm | null
  teamname: string
}

// ─── Mitarbeiter ────────────────────────────────────────────────────────────

export type Mitarbeiter = {
  id: MitarbeiterId
  name: string
  /** Optional short initials for avatar; derived if omitted. */
  initials?: string
  /** Optional accent color key; allows team-color coding later. */
  accentHue?: number
}

// ─── Abwesenheiten ─────────────────────────────────────────────────────────

export type Abwesenheit = {
  id: AbwesenheitId
  mitarbeiterId: MitarbeiterId
  von: IsoDate
  bis: IsoDate
}

// ─── Aktivitäten (Repertoire) ───────────────────────────────────────────────

// AKTIVITAET_TYPEN + AktivitaetTyp are now defined in aktivitaetKatalog.ts
// and re-exported at the top of this file.

export type AktivitaetQuelle =
  | 'eigene'
  | 'vorinstalliert'
  | 'stamm-import'
  | 'temporaer'

export type Aktivitaet = {
  id: AktivitaetId
  name: string
  typ: AktivitaetTyp
  /** Optional subtype within the typ (e.g. 'kooperation' within 'spiel-sport'). */
  untertyp?: AktivitaetUntertyp
  /** WB-Tags. Empty array = use defaults from Typ/Untertyp. Wegezeit always carries zero tags. */
  wbTags: WBTag[]
  themenTags: string[]
  /** Range in Minuten. */
  zeitMin: number
  zeitMax: number
  stufenbezug?: AbzeichenAnforderungId[]
  quelle: AktivitaetQuelle
  notizen?: string
  /**
   * If quelle === 'temporaer', this links the activity to the Planung that
   * created it. Deleting that Planung prunes the temp activity.
   */
  temporaerFuerPlanung?: PlanungId
  /** Source stamm import (if applicable). */
  stammImportId?: StammImportId
  deaktiviert?: boolean
}

// ─── Andachtsreihen ─────────────────────────────────────────────────────────

export type AndachtsEinheit = {
  id: AndachtsEinheitId
  /** Sortierschlüssel 0-based; can be numeric prefix in name ("1 – Wachsam"). */
  index: number
  titel: string
  thema?: string
  bibelstelle?: string
  /** Kapitel-/Seitenverweis in die Buchquelle, z.B. "Kapitel 3, S. 45". */
  kapitelSeite?: string
  notizen?: string
}

export type AndachtsreiheArt = 'reihe' | 'sammlung'

export type Buchquelle = {
  titel: string
  autor?: string
}

export type Andachtsreihe = {
  id: AndachtsreiheId
  name: string
  /** Reihe = sequenziell, Sammlung = Pool mit Auswahl pro Planung. */
  art: AndachtsreiheArt
  quelle: AktivitaetQuelle
  /** Optional: Buchquelle für die Reihe/Sammlung. */
  buchquelle?: Buchquelle
  einheiten: AndachtsEinheit[]
  notizen?: string
  deaktiviert?: boolean
}

// ─── Abzeichen (Badges/Emblems) ─────────────────────────────────────────────

export type AbzeichenAnforderung = {
  id: AbzeichenAnforderungId
  name: string
  beschreibung?: string
  /** Aktivitätstyp für die Programmpunkt-Erstellung bei Drag-Zuweisung. */
  typ: AktivitaetTyp
  untertyp?: AktivitaetUntertyp
  /** Zeitspanne in Minuten. */
  zeitMin: number
  zeitMax: number
}

export type Altersstufe = 'kundschafter' | 'pfadfinder'

export type Abzeichen = {
  id: AbzeichenId
  name: string
  altersstufe: Altersstufe
  quelle: AktivitaetQuelle
  anforderungen: AbzeichenAnforderung[]
  deaktiviert?: boolean
}

// ─── Stamm-Kontext ──────────────────────────────────────────────────────────

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
  /** Blocked dates (camps, assemblies, etc.). */
  stammaktionen: StammAktion[]

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

// ─── Programmpunkte ─────────────────────────────────────────────────────────

export type ProgrammpunktKind = 'konkret' | 'abstrakt' | 'wegezeit'

/** Shared fields across all Programmpunkt kinds. */
type ProgrammpunktBase = {
  id: ProgrammpunktId
  /** Pre-computed or overridden WB tags — source of truth for WB calc. */
  wbTags: WBTag[]
  dauerMin: number
  verantwortlicherId?: MitarbeiterId
  /** Guest (one-off) mitarbeiter name. */
  gastName?: string
  notizen?: string
  /** For Andacht-Programmpunkte linked to a reihe unit. */
  andachtsEinheitId?: AndachtsEinheitId
  /** Set when this programmpunkt comes from a Stamm-Import. */
  stammImportId?: StammImportId
}

/**
 * Konkreter Programmpunkt — referenziert eine Aktivität aus dem Repertoire.
 */
export type ProgrammpunktKonkret = ProgrammpunktBase & {
  kind: 'konkret'
  /** Display name (from Aktivität). */
  name: string
  /** Reference into repertoire. */
  aktivitaetId: AktivitaetId
  /** Typ + Untertyp (denormalized from Aktivitaet for display). */
  typ: AktivitaetTyp
  untertyp?: AktivitaetUntertyp
}

/**
 * Abstrakter Programmpunkt — nur Typ + Untertyp, noch nicht konkretisiert.
 * WB-Tags kommen aus den Typ-Defaults.
 */
export type ProgrammpunktAbstrakt = ProgrammpunktBase & {
  kind: 'abstrakt'
  /** Display name derived from Typ/Untertyp label (can be overridden). */
  name: string
  typ: AktivitaetTyp
  untertyp?: AktivitaetUntertyp
}

/**
 * Wegezeit — Zeitspanne ohne WB-Beitrag, kein Verantwortlicher.
 */
export type ProgrammpunktWegezeit = ProgrammpunktBase & {
  kind: 'wegezeit'
  name: string
}

export type Programmpunkt = ProgrammpunktKonkret | ProgrammpunktAbstrakt | ProgrammpunktWegezeit

// ─── Treffen ────────────────────────────────────────────────────────────────

export type TreffenKind =
  | 'regulaer'
  | 'extra-geplant'
  | 'extra-aktion'

export type Treffen = {
  id: TreffenId
  kind: TreffenKind
  datum: IsoDate
  /** Optional Titel, e.g. thematisch aus Andacht. */
  titel?: string
  notiz?: string
  programm: Programmpunkt[]
  /** Fixed = content survives cascade. */
  fixiert: boolean
  /** Soll-WB (ein oder zwei Bereiche). */
  sollWB: WBKey[]
  /** For extra-aktion kinds: free-form description. */
  aktionBeschreibung?: string
  /** Available team for this meeting; `null` = all planung members. */
  mitarbeiterAvailability?: {
    nichtVerfuegbar: MitarbeiterId[]
    gaeste: string[]
  }
  /** Flag: does stamm own this slot entirely? References StammAktion.id. */
  stammAktionId?: StammAktionId
}

// ─── Planung ────────────────────────────────────────────────────────────────

export type AbzeichenAuswahl = {
  abzeichenId: AbzeichenId
  /** Required only for abzeichen with selectable level. */
  stufe?: string
}

/**
 * Fünf Modi für den WB-Schwerpunkt (§1.2 konzept-planungsziele-kontextleiste.md).
 * 'ausgewogen' = alle gleich, kein Key nötig.
 * 'tendenz' = 1–2 Keys leicht betont.
 * 'fokus' = 1 Key deutlich gewichtet.
 * 'haupt-neben' = 2 Keys, Haupt+Neben unterschieden (bereiche[0]=Haupt, bereiche[1]=Neben).
 * 'dominant' = 1 Key stark ausgeprägt.
 */
export type WbSchwerpunktModus = 'ausgewogen' | 'tendenz' | 'fokus' | 'haupt-neben' | 'dominant'

export type WBSchwerpunkt = {
  modus: WbSchwerpunktModus
  bereiche: WBKey[]
  /**
   * Charakterisierung für Anzeige (Ist-Auswertung). Wird aus modus abgeleitet,
   * aber separat gespeichert, da die Ist-Auswertung von der Zielauswahl abweichen kann.
   * @deprecated Verwende `modus` stattdessen. Bleibt für Abwärtskompatibilität.
   */
  charakterisierung?: 'ausgewogen' | 'tendenz' | 'fokus' | 'dominant'
}

/**
 * Zuordnung einer Andachtsreihe zu einer Planung.
 * Bei Reihen (sequenziell): alle Einheiten → ausgewaehlteEinheiten bleibt undefined.
 * Bei Sammlungen: ausgewaehlteEinheiten listet die gewählte Teilmenge.
 */
export type AndachtsreiheZuordnung = {
  reiheId: AndachtsreiheId
  /** Nur relevant bei art === 'sammlung': ausgewählte Einheiten-IDs. */
  ausgewaehlteEinheiten?: AndachtsEinheitId[]
}

export type Planung = {
  id: PlanungId
  name: string
  zeitraum: { start: IsoDate; ende: IsoDate }
  weekday: Weekday
  rhythmus: Rhythmus
  dauerMinuten: number
  team: Mitarbeiter[]
  abwesenheiten: Abwesenheit[]
  treffen: Treffen[]
  /** Inhalte, die nach Kaskade keinen Termin gefunden haben. */
  ueberhang: UeberhangEintrag[]
  andachtsreihenZuordnung: AndachtsreiheZuordnung[]
  abzeichenAuswahl: AbzeichenAuswahl[]
  wbSchwerpunkt?: WBSchwerpunkt
  /** Reference to the global StammKontext (if planning within a Stamm frame). */
  stammKontextId?: StammKontextId
  /**
   * Opt-outs: IDs of StammTreffen/StammAktionen the team does NOT attend.
   * Default = attend all. Only exceptions are stored.
   */
  stammOptOuts: (StammTreffenId | StammAktionId)[]
  status: PlanungStatus
  /** Schwellwert (0..1): Ab diesem Füllgrad wird der Zeitbalken grün. */
  zeitbalkenSchwelle: number
  erstelltAm: IsoDateTime
  aktualisiertAm: IsoDateTime
}

export type UeberhangEintrag =
  | { kind: 'andacht'; einheitId: AndachtsEinheitId; grund: string }
  | {
      kind: 'programmpunkt'
      programmpunkt: Programmpunkt
      urspruenglichesTreffenId: TreffenId | null
      grund: string
    }

export type PlanungStatus = 'entwurf' | 'aktiv' | 'archiviert'

// ─── Ferien & Feiertage ─────────────────────────────────────────────────────

export type Feiertag = {
  datum: IsoDate
  name: string
  /** Fällt bundesweit oder nur in einem Bundesland an. */
  bundesweit: boolean
}

export type Ferien = {
  name: string
  start: IsoDate
  ende: IsoDate
}

export type FerienCacheEntry = {
  bundesland: BundeslandKey
  jahr: number
  feiertage: Feiertag[]
  ferien: Ferien[]
  abgerufenAm: IsoDateTime
}
