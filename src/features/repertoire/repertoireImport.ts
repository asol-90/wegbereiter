/**
 * Parses and validates JSON import files for Aktivitäten, Andachtsreihen and Abzeichen.
 *
 * All imported items receive fresh IDs and quelle='eigene'.
 * Discriminator field: __typ = 'aktivitaeten' | 'andachtsreihen' | 'abzeichen'
 */
import { newId } from '@/domain/ids'
import type {
  AbzeichenAnforderungId,
  AbzeichenId,
  AktivitaetId,
  AndachtsEinheitId,
  AndachtsreiheId,
} from '@/domain/ids'
import type {
  Abzeichen,
  AbzeichenAnforderung,
  Aktivitaet,
  AndachtsEinheit,
  Andachtsreihe,
} from '@/domain/types'
import { isAktivitaetTyp, isMinStufe } from '@/domain/aktivitaetKatalog'
import type { AktivitaetUntertyp } from '@/domain/aktivitaetKatalog'

// ─── Result type ────────────────────────────────────────────────────────────

export type ImportResult<T> =
  | { ok: true; items: T[]; skipped: number }
  | { ok: false; error: string }

export type RepertoireImportOutcome =
  | { kind: 'aktivitaeten'; result: ImportResult<Aktivitaet> }
  | { kind: 'andachtsreihen'; result: ImportResult<Andachtsreihe> }
  | { kind: 'abzeichen'; result: ImportResult<Abzeichen> }
  | { kind: 'unknown'; error: string }

// ─── Low-level helpers ───────────────────────────────────────────────────────

function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined
}

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && isFinite(v) ? v : fallback
}

const WB_KEYS = ['koerperlich', 'gesellschaftlich', 'geistig', 'geistlich'] as const
type WBKeyStr = (typeof WB_KEYS)[number]

function pointsToIntensity(v: number): 0 | 0.33 | 0.66 | 1 {
  if (v <= 0) return 0
  if (v === 1) return 0.33
  if (v === 2) return 0.66
  return 1
}

/**
 * Accepts the compact object format: { "koerperlich": 2, "geistig": 3 }
 * Values are 0–3 points; missing keys default to 0 (omitted from result).
 * Also accepts the legacy array format for backwards compat.
 */
function parseWBTags(raw: unknown): Aktivitaet['wbTags'] {
  if (!raw) return []

  // Primary format: { "koerperlich": 2, "geistig": 3 }
  if (isObj(raw) && !Array.isArray(raw)) {
    return WB_KEYS
      .filter((k): k is WBKeyStr => typeof raw[k] === 'number' && (raw[k] as number) > 0)
      .map((k) => ({ key: k, intensity: pointsToIntensity(raw[k] as number) }))
  }

  // Legacy: [{ key: "koerperlich", intensity: 0.66 }, …]
  if (Array.isArray(raw)) {
    const INTENSITIES = [0, 0.33, 0.66, 1.0]
    return raw.filter(
      (t): t is { key: WBKeyStr; intensity: number } =>
        isObj(t) &&
        typeof t.key === 'string' &&
        (WB_KEYS as readonly string[]).includes(t.key) &&
        typeof t.intensity === 'number' &&
        INTENSITIES.includes(t.intensity),
    ) as Aktivitaet['wbTags']
  }

  return []
}

function parseThemenTags(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((t): t is string => typeof t === 'string' && t.trim().length > 0)
}

// ─── Aktivitäten ─────────────────────────────────────────────────────────────

function parseAktivitaet(raw: unknown): Aktivitaet | null {
  if (!isObj(raw)) return null
  const name = str(raw.name)?.trim()
  if (!name) return null
  const typRaw = str(raw.typ)
  if (!typRaw || !isAktivitaetTyp(typRaw)) return null

  const untertypRaw = str(raw.untertyp)
  const minStufeRaw = str(raw.minStufe)

  return {
    id: newId<AktivitaetId>(),
    name,
    typ: typRaw,
    untertyp: (untertypRaw as AktivitaetUntertyp | undefined) ?? undefined,
    wbTags: parseWBTags(raw.wbTags),
    themenTags: parseThemenTags(raw.themenTags),
    zeitMin: num(raw.zeitMin, 15),
    zeitMax: num(raw.zeitMax, 30),
    minStufe: minStufeRaw && isMinStufe(minStufeRaw) ? minStufeRaw : undefined,
    quelle: 'eigene',
    notizen: str(raw.notizen),
  }
}

export function importAktivitaetenFile(data: unknown): ImportResult<Aktivitaet> {
  if (!isObj(data)) return { ok: false, error: 'Ungültiges JSON-Format.' }
  if (data.__typ !== 'aktivitaeten')
    return { ok: false, error: `Falscher Typ: erwartet "aktivitaeten", gefunden "${data.__typ}".` }
  if (!Array.isArray(data.eintraege))
    return { ok: false, error: 'Feld "eintraege" fehlt oder ist kein Array.' }

  const items: Aktivitaet[] = []
  let skipped = 0
  for (const entry of data.eintraege) {
    const parsed = parseAktivitaet(entry)
    if (parsed) items.push(parsed)
    else skipped++
  }
  return { ok: true, items, skipped }
}

// ─── Andachtsreihen ──────────────────────────────────────────────────────────

function parseEinheit(raw: unknown, index: number): AndachtsEinheit | null {
  if (!isObj(raw)) return null
  const titel = str(raw.titel)?.trim()
  if (!titel) return null
  return {
    id: newId<AndachtsEinheitId>(),
    index,
    titel,
    thema: str(raw.thema),
    bibelstelle: str(raw.bibelstelle),
    kapitelSeite: str(raw.kapitelSeite),
    notizen: str(raw.notizen),
  }
}

function parseAndachtsreihe(raw: unknown): Andachtsreihe | null {
  if (!isObj(raw)) return null
  const name = str(raw.name)?.trim()
  if (!name) return null
  const art = str(raw.art)
  if (art !== 'reihe' && art !== 'sammlung') return null

  const einheitenRaw = Array.isArray(raw.einheiten) ? raw.einheiten : []
  const einheiten: AndachtsEinheit[] = []
  for (let i = 0; i < einheitenRaw.length; i++) {
    const e = parseEinheit(einheitenRaw[i], i)
    if (e) einheiten.push(e)
  }

  // Accept buchquelle as flat fields or nested object
  const buchquelleTitel =
    str(raw.buchquelleTitel) ?? (isObj(raw.buchquelle) ? str(raw.buchquelle.titel) : undefined)
  const buchquelleAutor =
    str(raw.buchquelleAutor) ?? (isObj(raw.buchquelle) ? str(raw.buchquelle.autor) : undefined)

  return {
    id: newId<AndachtsreiheId>(),
    name,
    art,
    quelle: 'eigene',
    buchquelle: buchquelleTitel ? { titel: buchquelleTitel, autor: buchquelleAutor } : undefined,
    einheiten,
    notizen: str(raw.notizen),
  }
}

export function importAndachtsreihenFile(data: unknown): ImportResult<Andachtsreihe> {
  if (!isObj(data)) return { ok: false, error: 'Ungültiges JSON-Format.' }
  if (data.__typ !== 'andachtsreihen')
    return { ok: false, error: `Falscher Typ: erwartet "andachtsreihen", gefunden "${data.__typ}".` }
  if (!Array.isArray(data.eintraege))
    return { ok: false, error: 'Feld "eintraege" fehlt oder ist kein Array.' }

  const items: Andachtsreihe[] = []
  let skipped = 0
  for (const entry of data.eintraege) {
    const parsed = parseAndachtsreihe(entry)
    if (parsed) items.push(parsed)
    else skipped++
  }
  return { ok: true, items, skipped }
}

// ─── Abzeichen ───────────────────────────────────────────────────────────────

function parseAnforderung(raw: unknown): AbzeichenAnforderung | null {
  if (!isObj(raw)) return null
  const name = str(raw.name)?.trim()
  if (!name) return null
  const typRaw = str(raw.typ)
  if (!typRaw || !isAktivitaetTyp(typRaw)) return null

  return {
    id: newId<AbzeichenAnforderungId>(),
    name,
    beschreibung: str(raw.beschreibung),
    typ: typRaw,
    untertyp: (str(raw.untertyp) as AktivitaetUntertyp | undefined) ?? undefined,
    zeitMin: num(raw.zeitMin, 15),
    zeitMax: num(raw.zeitMax, 30),
  }
}

function parseAbzeichen(raw: unknown): Abzeichen | null {
  if (!isObj(raw)) return null
  const name = str(raw.name)?.trim()
  if (!name) return null
  const altersstufe = str(raw.altersstufe)
  if (altersstufe !== 'kundschafter' && altersstufe !== 'pfadfinder') return null

  const anforderungenRaw = Array.isArray(raw.anforderungen) ? raw.anforderungen : []
  const anforderungen: AbzeichenAnforderung[] = []
  for (const r of anforderungenRaw) {
    const a = parseAnforderung(r)
    if (a) anforderungen.push(a)
  }

  return {
    id: newId<AbzeichenId>(),
    name,
    altersstufe,
    quelle: 'eigene',
    anforderungen,
  }
}

export function importAbzeichenFile(data: unknown): ImportResult<Abzeichen> {
  if (!isObj(data)) return { ok: false, error: 'Ungültiges JSON-Format.' }
  if (data.__typ !== 'abzeichen')
    return { ok: false, error: `Falscher Typ: erwartet "abzeichen", gefunden "${data.__typ}".` }
  if (!Array.isArray(data.eintraege))
    return { ok: false, error: 'Feld "eintraege" fehlt oder ist kein Array.' }

  const items: Abzeichen[] = []
  let skipped = 0
  for (const entry of data.eintraege) {
    const parsed = parseAbzeichen(entry)
    if (parsed) items.push(parsed)
    else skipped++
  }
  return { ok: true, items, skipped }
}

// ─── Auto-Detect ─────────────────────────────────────────────────────────────

export function parseRepertoireImport(data: unknown): RepertoireImportOutcome {
  if (!isObj(data))
    return { kind: 'unknown', error: 'Keine gültige JSON-Struktur.' }

  switch (data.__typ) {
    case 'aktivitaeten':
      return { kind: 'aktivitaeten', result: importAktivitaetenFile(data) }
    case 'andachtsreihen':
      return { kind: 'andachtsreihen', result: importAndachtsreihenFile(data) }
    case 'abzeichen':
      return { kind: 'abzeichen', result: importAbzeichenFile(data) }
    default:
      return {
        kind: 'unknown',
        error: `Unbekanntes Feld "__typ": „${data.__typ}". Erwartet: aktivitaeten | andachtsreihen | abzeichen.`,
      }
  }
}
