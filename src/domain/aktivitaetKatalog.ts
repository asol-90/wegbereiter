/**
 * Aktivitäten-Katalog — zentrale Definition aller Aktivitätstypen,
 * Untertypen, Labels, Icons und WB-Default-Werte.
 *
 * Phase 9: Ersetzt das bisherige flache AKTIVITAET_TYPEN-Array.
 */
import type {WBKey} from './wb'
import type {IconName} from '@/ui/primitives/Icon'

// ─── Typ-Schlüssel ─────────────────────────────────────────────────────────

export const AKTIVITAET_TYPEN = [
  'andacht-gespraech',
  'musik-lobpreis',
  'spiel-sport',
  'basteln-bauen',
  'kochen-essen',
  'pfadfindertechnik',
  'wandern-exkursion',
  'dienst-naechstenliebe',
  'stammformat',
  'sonstiges',
  'wegezeit',
] as const

export type AktivitaetTyp = (typeof AKTIVITAET_TYPEN)[number]

// ─── Untertyp-Schlüssel ────────────────────────────────────────────────────

export const AKTIVITAET_UNTERTYPEN = [
  // andacht-gespraech
  'andacht',
  'bibelarbeit',
  'austausch',
  'zeugnis-runde',
  // spiel-sport
  'kooperation',
  'wettbewerb',
  'teambuilding',
  'kraft-ausdauer',
  'geschick',
  // pfadfindertechnik (inkl. Wachstumspfad)
  'camp',
  'knoten-buende',
  'feuer',
  'orientierung',
  'erste-hilfe-sicherheit',
  'naturkunde',
  'wachstumspfad',
  'entdeckerheft',
  'forscherheft',
  'logbuch',
  // wandern-exkursion
  'wanderung',
  'ausflug',
  // stammformat
  'stammrunde',
  'gelaendespiel',
  'stationenlauf',
] as const

export type AktivitaetUntertyp = (typeof AKTIVITAET_UNTERTYPEN)[number]

// ─── Welche Untertypen gehören zu welchem Typ? ─────────────────────────────

export const UNTERTYPEN_FUER_TYP: Partial<Record<AktivitaetTyp, readonly AktivitaetUntertyp[]>> = {
  'andacht-gespraech': ['andacht', 'bibelarbeit', 'austausch', 'zeugnis-runde'],
  'spiel-sport': ['kooperation', 'wettbewerb', 'teambuilding', 'kraft-ausdauer', 'geschick'],
  'pfadfindertechnik': [
    'camp', 'knoten-buende', 'feuer', 'orientierung', 'erste-hilfe-sicherheit', 'naturkunde',
    'wachstumspfad', 'entdeckerheft', 'forscherheft', 'logbuch',
  ],
  'wandern-exkursion': ['wanderung', 'ausflug'],
  'stammformat': ['stammrunde', 'gelaendespiel', 'stationenlauf'],
}

/** Typen die Untertypen haben. */
export function hatUntertypen(typ: AktivitaetTyp): boolean {
  return typ in UNTERTYPEN_FUER_TYP
}

/** Gültigen Untertyp prüfen. */
export function istGueltigerUntertyp(typ: AktivitaetTyp, untertyp: string): boolean {
  const erlaubt = UNTERTYPEN_FUER_TYP[typ]
  if (!erlaubt) return false
  return (erlaubt as readonly string[]).includes(untertyp)
}

// ─── Labels ────────────────────────────────────────────────────────────────

export const TYP_LABELS: Record<AktivitaetTyp, string> = {
  'andacht-gespraech': 'Andacht/Gespräch',
  'musik-lobpreis': 'Musik/Lobpreis',
  'spiel-sport': 'Spiel/Sport',
  'basteln-bauen': 'Basteln/Bauen',
  'kochen-essen': 'Kochen/Essen',
  'pfadfindertechnik': 'Pfadfindertechnik',
  'wandern-exkursion': 'Wandern/Exkursion',
  'dienst-naechstenliebe': 'Dienst/Nächstenliebe',
  'stammformat': 'Stammformat',
  'sonstiges': 'Sonstiges',
  'wegezeit': 'Wegezeit',
}

export const UNTERTYP_LABELS: Record<AktivitaetUntertyp, string> = {
  'andacht': 'Andacht',
  'bibelarbeit': 'Bibelarbeit',
  'austausch': 'Austausch',
  'zeugnis-runde': 'Zeugnis-Runde',
  'kooperation': 'Kooperation',
  'wettbewerb': 'Wettbewerb',
  'teambuilding': 'Teambuilding',
  'kraft-ausdauer': 'Kraft/Ausdauer',
  'geschick': 'Geschick',
  'camp': 'Camp',
  'knoten-buende': 'Knoten/Bünde',
  'feuer': 'Feuer',
  'orientierung': 'Orientierung',
  'erste-hilfe-sicherheit': 'Erste Hilfe/Sicherheit',
  'naturkunde': 'Naturkunde',
  'wachstumspfad': 'Wachstumspfad',
  'entdeckerheft': 'Entdeckerheft',
  'forscherheft': 'Forscherheft',
  'logbuch': 'Logbuch',
  'wanderung': 'Wanderung',
  'ausflug': 'Ausflug',
  'stammrunde': 'Stammrunde',
  'gelaendespiel': 'Geländespiel',
  'stationenlauf': 'Stationenlauf',
}

/** Lesbares Label für Typ + optionalen Untertyp. */
export function aktivitaetLabel(typ: AktivitaetTyp, untertyp?: AktivitaetUntertyp): string {
  if (untertyp) return UNTERTYP_LABELS[untertyp]
  return TYP_LABELS[typ]
}

// ─── Icons ─────────────────────────────────────────────────────────────────

export const TYP_ICONS: Record<AktivitaetTyp, IconName> = {
  'andacht-gespraech': 'book',
  'musik-lobpreis': 'music',
  'spiel-sport': 'zap',
  'basteln-bauen': 'tool',
  'kochen-essen': 'coffee',
  'pfadfindertechnik': 'compass',
  'wandern-exkursion': 'map',
  'dienst-naechstenliebe': 'heart',
  'stammformat': 'users',
  'sonstiges': 'more-horizontal',
  'wegezeit': 'clock',
}

// ─── WB-Defaults (0–3 Skala → intern 0, 0.33, 0.66, 1) ───────────────────

/**
 * Rohwerte 0–3 (-, etwas, mittel, stark).
 * Reihenfolge: [körperlich, gesellschaftlich, geistig, geistlich]
 */
type WBRaw = [number, number, number, number]

/** Mapping von Untertyp → WB-Rohwerte. Für Typen ohne Untertyp: Schlüssel = Typ. */
const WB_RAW: Record<string, WBRaw> = {
  // andacht-gespraech
  'andacht':        [0, 0, 1, 3],
  'bibelarbeit':    [0, 0, 2, 3],
  'zeugnis-runde':  [0, 2, 0, 2],
  'austausch':      [0, 3, 1, 0],
  // spiel-sport
  'kooperation':    [1, 3, 1, 0],
  'wettbewerb':     [2, 1, 1, 0],
  'teambuilding':   [1, 3, 1, 0],
  'kraft-ausdauer': [3, 0, 0, 0],
  'geschick':       [2, 0, 1, 0],
  // basteln-bauen (kein Untertyp)
  'basteln-bauen':  [2, 0, 2, 0],
  // musik-lobpreis (kein Untertyp)
  'musik-lobpreis': [0, 1, 1, 3],
  // kochen-essen (kein Untertyp)
  'kochen-essen':   [1, 2, 1, 0],
  // pfadfindertechnik (Default + Untertypen inkl. Wachstumspfad)
  'pfadfindertechnik': [2, 0, 2, 0],
  'camp':           [2, 0, 2, 0],
  'knoten-buende':  [2, 0, 2, 0],
  'feuer':          [1, 0, 2, 0],
  'orientierung':   [1, 0, 3, 0],
  'erste-hilfe-sicherheit': [1, 1, 3, 0],
  'naturkunde':     [1, 0, 3, 0],
  'wachstumspfad':  [0, 0, 3, 0],
  'entdeckerheft':  [0, 0, 2, 1],
  'forscherheft':   [0, 0, 3, 0],
  'logbuch':        [0, 0, 3, 0],
  // wandern-exkursion
  'wandern-exkursion': [3, 0, 0, 0],
  'wanderung':      [3, 0, 0, 0],
  'ausflug':        [3, 0, 0, 0],
  // dienst-naechstenliebe (kein Untertyp)
  'dienst-naechstenliebe': [1, 3, 1, 2],
  // stammformat
  'stammformat':    [0, 2, 0, 1],
  'stammrunde':     [0, 2, 0, 1],
  'gelaendespiel':  [2, 2, 1, 0],
  'stationenlauf':  [1, 1, 2, 0],
  // sonstiges
  'sonstiges':      [0, 0, 0, 0],
  // wegezeit (kein WB)
  'wegezeit':       [0, 0, 0, 0],
}

const WB_KEY_ORDER: readonly WBKey[] = ['koerperlich', 'gesellschaftlich', 'geistig', 'geistlich']

/** 0–3 Rohwert → 0..1 Intensität. */
function rawToIntensity(raw: number): number {
  if (raw <= 0) return 0
  if (raw === 1) return 0.33
  if (raw === 2) return 0.66
  return 1
}

export type WBDefaults = Record<WBKey, number>

/**
 * WB-Default-Werte (intensity 0..1) für einen Typ + optionalen Untertyp.
 * Lookup: Untertyp zuerst, dann Typ als Fallback.
 */
export function getWBDefaults(typ: AktivitaetTyp, untertyp?: AktivitaetUntertyp): WBDefaults {
  const key = untertyp && (untertyp in WB_RAW) ? untertyp : typ
  const raw = WB_RAW[key] ?? [0, 0, 0, 0]
  return {
    koerperlich: rawToIntensity(raw[0]),
    gesellschaftlich: rawToIntensity(raw[1]),
    geistig: rawToIntensity(raw[2]),
    geistlich: rawToIntensity(raw[3]),
  }
}

/**
 * WB-Defaults als WBTag-Array (nur Einträge mit intensity > 0).
 * Direkt verwendbar für Programmpunkte und Repertoire-Einträge.
 */
export function getWBDefaultTags(
  typ: AktivitaetTyp,
  untertyp?: AktivitaetUntertyp,
): { key: WBKey; intensity: number }[] {
  const defaults = getWBDefaults(typ, untertyp)
  return WB_KEY_ORDER
    .filter((k) => defaults[k] > 0)
    .map((k) => ({ key: k, intensity: defaults[k] }))
}

// ─── Migration: alte Typen → neue Typen ────────────────────────────────────

/**
 * Mapping der alten Phase-8-Schlüssel auf die neuen Typen.
 * Wird beim Lesen bestehender Daten aus IndexedDB angewendet.
 */
export const LEGACY_TYP_MAPPING: Record<string, AktivitaetTyp> = {
  // Phase-8 legacy keys
  'andacht': 'andacht-gespraech',
  'spiel': 'spiel-sport',
  'basteln': 'basteln-bauen',
  'gebet': 'andacht-gespraech',
  'gespraech': 'andacht-gespraech',
  'camptechnik': 'pfadfindertechnik',
  'lagerfeuer': 'pfadfindertechnik',
  'logbuch': 'pfadfindertechnik',
  'wegezeit': 'wegezeit',
  'sonstiges': 'sonstiges',
  // Removed types
  'gebet-stille': 'andacht-gespraech',
  'wachstumspfad': 'pfadfindertechnik',
}

/** Migriert einen alten Typ-Schlüssel. Gibt den Schlüssel unverändert zurück wenn er schon neu ist. */
export function migrateTyp(raw: string): AktivitaetTyp {
  if ((AKTIVITAET_TYPEN as readonly string[]).includes(raw)) return raw as AktivitaetTyp
  const mapped = LEGACY_TYP_MAPPING[raw]
  if (mapped) return mapped
  return 'sonstiges'
}

/** Prüft ob ein String ein gültiger (neuer) AktivitaetTyp ist. */
export function isAktivitaetTyp(val: string): val is AktivitaetTyp {
  return (AKTIVITAET_TYPEN as readonly string[]).includes(val)
}

// ─── Mindeststufe (Alterseignung) ──────────────────────────────────────────

export const MIN_STUFEN = [
  'alle',
  'forscher',
  'kundschafter',
  'pfadfinder',
  'pfadranger',
] as const

export type MinStufe = (typeof MIN_STUFEN)[number]

export const MIN_STUFE_LABELS: Record<MinStufe, string> = {
  alle: 'Für alle',
  forscher: 'Ab Forscher (FS)',
  kundschafter: 'Ab Kundschafter (KS)',
  pfadfinder: 'Ab Pfadfinder (PF)',
  pfadranger: 'Ab Pfadranger (PR)',
}

export const MIN_STUFE_SHORT: Record<MinStufe, string> = {
  alle: 'Alle',
  forscher: 'FS+',
  kundschafter: 'KS+',
  pfadfinder: 'PF+',
  pfadranger: 'PR+',
}

export function isMinStufe(val: string): val is MinStufe {
  return (MIN_STUFEN as readonly string[]).includes(val)
}
