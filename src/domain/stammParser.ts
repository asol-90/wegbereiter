/**
 * Parser + validator for Stammkontext JSON files.
 *
 * Accepts a raw JSON string, validates structure and fields,
 * and returns a fully-typed StammKontext object ready for persistence.
 *
 * The JSON schema is defined in PHASE-8-SCOPE.md §8.
 */
import {AKTIVITAET_TYPEN, istGueltigerUntertyp, migrateTyp, type AktivitaetUntertyp} from './aktivitaetKatalog'
import {newId, type AktivitaetId, type StammAktionId, type StammImportId, type StammKontextId, type StammTreffenId,} from './ids'
import type {Aktivitaet, AktivitaetTyp, StammAktion, StammBlock, StammKontext, StammTreffen,} from './types'
import type {WBKey, WBTag} from './wb'

// ─── Error types ────────────────────────────────────────────────────────────

export class StammParseError extends Error {
  readonly field?: string
  constructor(message: string, field?: string) {
    super(message)
    this.name = 'StammParseError'
    this.field = field
  }
}

// ─── Raw JSON shape (what the file contains) ────────────────────────────────

type RawStammBlock = {
  name?: unknown
  typ?: unknown
  dauerMin?: unknown
}

type RawTreffen = {
  id?: unknown
  art?: unknown
  datum?: unknown
  dauerMin?: unknown
  anfangsBlock?: unknown
  endBlock?: unknown
}

type RawAktion = {
  id?: unknown
  titel?: unknown
  beschreibung?: unknown
  beginn?: unknown
  ende?: unknown
  ort?: unknown
}

type RawAktivitaet = {
  name?: unknown
  typ?: unknown
  dauerMin?: unknown
  dauerMax?: unknown
  wbTags?: unknown
  themenTags?: unknown
}

type RawStammFile = {
  typ?: unknown
  version?: unknown
  bearbeitetAm?: unknown
  bearbeitungsNotiz?: unknown
  thema?: unknown
  themaBeschreibung?: unknown
  themenTag?: unknown
  defaultAnfangsBlock?: unknown
  defaultEndBlock?: unknown
  treffen?: unknown
  stammaktionen?: unknown
  distriktAktionen?: unknown
  regionalAktionen?: unknown
  aktivitaeten?: unknown
}

// ─── Validation helpers ─────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/

function assertString(val: unknown, field: string): asserts val is string {
  if (typeof val !== 'string' || val.trim() === '')
    throw new StammParseError(`"${field}" muss ein nicht-leerer String sein.`, field)
}

function assertNumber(val: unknown, field: string): asserts val is number {
  if (typeof val !== 'number' || !Number.isFinite(val) || val < 0)
    throw new StammParseError(`"${field}" muss eine positive Zahl sein.`, field)
}

function assertIsoDate(val: unknown, field: string): asserts val is string {
  assertString(val, field)
  if (!ISO_DATE_RE.test(val))
    throw new StammParseError(`"${field}" muss ein Datum im Format yyyy-MM-dd sein.`, field)
}

function assertIsoDateTime(val: unknown, field: string): asserts val is string {
  assertString(val, field)
  if (!ISO_DATETIME_RE.test(val))
    throw new StammParseError(`"${field}" muss ein Zeitstempel im ISO-Format sein.`, field)
}

function assertArray(val: unknown, field: string): asserts val is unknown[] {
  if (!Array.isArray(val))
    throw new StammParseError(`"${field}" muss ein Array sein.`, field)
}

/** All accepted typ values: new keys + legacy/removed keys (which get migrated). */
const VALID_TYPEN: readonly string[] = [
  ...AKTIVITAET_TYPEN,
  // Legacy Phase-8 keys
  'andacht', 'spiel', 'basteln', 'gebet', 'gespraech',
  // Removed types (now migrated)
  'gebet-stille', 'wachstumspfad',
]

function parseAktivitaetTyp(val: unknown, field: string): AktivitaetTyp {
  assertString(val, field)
  if (!VALID_TYPEN.includes(val))
    throw new StammParseError(
      `"${field}" muss ein gültiger Aktivitätstyp sein. Erhalten: "${val}"`,
      field,
    )
  return migrateTyp(val)
}

function parseUntertyp(val: unknown, typ: AktivitaetTyp, field: string): AktivitaetUntertyp | undefined {
  if (val === undefined || val === null) return undefined
  assertString(val, field)
  if (!istGueltigerUntertyp(typ, val)) {
    throw new StammParseError(
      `"${field}" ist kein gültiger Untertyp für "${typ}". Erhalten: "${val}"`,
      field,
    )
  }
  return val as AktivitaetUntertyp
}

// ─── Block parsing ──────────────────────────────────────────────────────────

function parseBlock(raw: RawStammBlock, path: string): StammBlock {
  assertString(raw.name, `${path}.name`)
  const typ = parseAktivitaetTyp(raw.typ, `${path}.typ`)
  assertNumber(raw.dauerMin, `${path}.dauerMin`)
  const untertyp = parseUntertyp((raw as Record<string, unknown>).untertyp, typ, `${path}.untertyp`)
  const block: StammBlock = {
    name: raw.name,
    typ,
    dauerMin: raw.dauerMin,
  }
  if (untertyp) block.untertyp = untertyp
  return block
}

function parseBlockList(raw: unknown, field: string): StammBlock[] {
  assertArray(raw, field)
  return (raw as RawStammBlock[]).map((b, i) => parseBlock(b, `${field}[${i}]`))
}

// ─── Treffen parsing ────────────────────────────────────────────────────────

function parseTreffen(raw: RawTreffen, index: number): StammTreffen {
  const path = `treffen[${index}]`
  assertString(raw.id, `${path}.id`)
  if (raw.art !== 'treffen')
    throw new StammParseError(`${path}.art muss "treffen" sein.`, `${path}.art`)
  assertIsoDate(raw.datum, `${path}.datum`)
  assertNumber(raw.dauerMin, `${path}.dauerMin`)

  const result: StammTreffen = {
    id: raw.id as StammTreffenId,
    datum: raw.datum,
    dauerMin: raw.dauerMin,
  }

  if (raw.anfangsBlock !== undefined) {
    result.anfangsBlock = parseBlockList(raw.anfangsBlock, `${path}.anfangsBlock`)
  }
  if (raw.endBlock !== undefined) {
    result.endBlock = parseBlockList(raw.endBlock, `${path}.endBlock`)
  }

  return result
}

// ─── Aktion parsing ─────────────────────────────────────────────────────────

function parseAktion(raw: RawAktion, index: number): StammAktion {
  const path = `stammaktionen[${index}]`
  assertString(raw.id, `${path}.id`)
  assertString(raw.titel, `${path}.titel`)
  assertIsoDate(raw.beginn, `${path}.beginn`)
  assertIsoDate(raw.ende, `${path}.ende`)

  if (raw.beginn > raw.ende)
    throw new StammParseError(`${path}: beginn darf nicht nach ende liegen.`, `${path}.beginn`)

  return {
    id: raw.id as StammAktionId,
    titel: raw.titel,
    beschreibung: typeof raw.beschreibung === 'string' ? raw.beschreibung : undefined,
    beginn: raw.beginn,
    ende: raw.ende,
    ort: typeof raw.ort === 'string' ? raw.ort : undefined,
  }
}

// ─── Aktivitäten parsing ────────────────────────────────────────────────────

const VALID_WB_KEYS = ['koerperlich', 'gesellschaftlich', 'geistig', 'geistlich'] as const

function parseWbTag(raw: unknown, path: string): WBTag {
  if (typeof raw !== 'object' || raw === null)
    throw new StammParseError(`${path} muss ein Objekt sein.`, path)
  const obj = raw as Record<string, unknown>

  // Accept both JSON formats:
  // New: { key: "koerperlich", intensity: 0.66 }
  // Legacy: { bereich: "koerperlich", gewicht: 0.66 }
  const keyVal = obj.key ?? obj.bereich
  const intensityVal = obj.intensity ?? obj.gewicht

  assertString(keyVal, `${path}.key`)
  if (!(VALID_WB_KEYS as readonly string[]).includes(keyVal as string))
    throw new StammParseError(`${path}.key muss einer der WB-Bereiche sein. Erhalten: "${keyVal}"`, path)
  assertNumber(intensityVal, `${path}.intensity`)

  return { key: keyVal as WBKey, intensity: intensityVal as number }
}

function parseImportAktivitaet(
  raw: RawAktivitaet,
  index: number,
  stammImportId: StammImportId,
  themenTag?: string,
): Aktivitaet {
  const path = `aktivitaeten[${index}]`
  assertString(raw.name, `${path}.name`)
  const typ = parseAktivitaetTyp(raw.typ, `${path}.typ`)
  assertNumber(raw.dauerMin, `${path}.dauerMin`)

  const untertyp = parseUntertyp(
    (raw as Record<string, unknown>).untertyp, typ, `${path}.untertyp`,
  )

  const dauerMax = typeof raw.dauerMax === 'number' && Number.isFinite(raw.dauerMax)
    ? raw.dauerMax
    : raw.dauerMin as number

  let wbTags: WBTag[] = []
  if (raw.wbTags !== undefined) {
    assertArray(raw.wbTags, `${path}.wbTags`)
    wbTags = (raw.wbTags as unknown[]).map((t, i) => parseWbTag(t, `${path}.wbTags[${i}]`))
  }

  let themenTags: string[] = []
  if (raw.themenTags !== undefined) {
    assertArray(raw.themenTags, `${path}.themenTags`)
    themenTags = (raw.themenTags as string[]).filter((t) => typeof t === 'string')
  }
  // Auto-add the context's themenTag if not already present
  if (themenTag && !themenTags.includes(themenTag)) {
    themenTags.push(themenTag)
  }

  const result: Aktivitaet = {
    id: newId<AktivitaetId>(),
    name: raw.name,
    typ,
    wbTags,
    themenTags,
    zeitMin: raw.dauerMin as number,
    zeitMax: dauerMax,
    quelle: 'stamm-import',
    stammImportId,
  }
  if (untertyp) result.untertyp = untertyp
  return result
}

// ─── Top-level parser ───────────────────────────────────────────────────────

export type StammParseResult = {
  kontext: StammKontext
  aktivitaeten: Aktivitaet[]
}

/** Parse a generic list field with a per-item parser. Returns [] if field missing. */
function parseList<TIn, TOut>(
  raw: unknown,
  field: string,
  parseItem: (item: TIn, index: number) => TOut,
): TOut[] {
  if (raw === undefined) return []
  assertArray(raw, field)
  return (raw as TIn[]).map((item, i) => parseItem(item, i))
}

type ValidatedRoot = RawStammFile & { bearbeitetAm: string; thema: string }

function parseRoot(jsonString: string): ValidatedRoot {
  let raw: RawStammFile
  try {
    raw = JSON.parse(jsonString) as RawStammFile
  } catch {
    throw new StammParseError('Die Datei enthält kein gültiges JSON.')
  }
  if (typeof raw !== 'object' || raw === null)
    throw new StammParseError('Die Datei muss ein JSON-Objekt enthalten.')
  if (raw.typ !== 'stammkontext')
    throw new StammParseError('Unbekannter Dateityp. Erwartet: "stammkontext".', 'typ')
  assertIsoDateTime(raw.bearbeitetAm, 'bearbeitetAm')
  assertString(raw.thema, 'thema')
  return raw as ValidatedRoot
}

/**
 * Parse a raw JSON string into a StammKontext + imported Aktivitäten.
 *
 * Throws StammParseError with a human-readable German message on validation failure.
 */
export function parseStammDatei(jsonString: string): StammParseResult {
  const raw = parseRoot(jsonString)

  const defaultAnfangsBlock = raw.defaultAnfangsBlock !== undefined
    ? parseBlockList(raw.defaultAnfangsBlock, 'defaultAnfangsBlock')
    : []
  const defaultEndBlock = raw.defaultEndBlock !== undefined
    ? parseBlockList(raw.defaultEndBlock, 'defaultEndBlock')
    : []

  const treffen = parseList<RawTreffen, StammTreffen>(raw.treffen, 'treffen', parseTreffen)
  const stammaktionen = parseList<RawAktion, StammAktion>(raw.stammaktionen, 'stammaktionen', parseAktion)
  const distriktAktionen = parseList<RawAktion, StammAktion>(raw.distriktAktionen, 'distriktAktionen', parseAktion)
  const regionalAktionen = parseList<RawAktion, StammAktion>(raw.regionalAktionen, 'regionalAktionen', parseAktion)

  if (treffen.length === 0 && stammaktionen.length === 0) {
    throw new StammParseError(
      'Der Stammkontext enthält weder Treffen noch Stammaktionen.',
    )
  }

  const stammImportId = newId<StammImportId>()
  const themenTag = typeof raw.themenTag === 'string' ? raw.themenTag : undefined
  const aktivitaeten = parseList<RawAktivitaet, Aktivitaet>(
    raw.aktivitaeten,
    'aktivitaeten',
    (item, i) => parseImportAktivitaet(item, i, stammImportId, themenTag),
  )

  const kontext: StammKontext = {
    id: newId<StammKontextId>(),
    stammImportId,
    thema: raw.thema,
    themaBeschreibung: typeof raw.themaBeschreibung === 'string' ? raw.themaBeschreibung : undefined,
    themenTag,
    treffen,
    stammaktionen,
    distriktAktionen,
    regionalAktionen,
    defaultAnfangsBlock,
    defaultEndBlock,
    bearbeitetAm: raw.bearbeitetAm,
    bearbeitungsNotiz: typeof raw.bearbeitungsNotiz === 'string' ? raw.bearbeitungsNotiz : undefined,
    importiertAm: new Date().toISOString(),
    importierteAktivitaetIds: aktivitaeten.map((a) => a.id),
  }

  return { kontext, aktivitaeten }
}

/**
 * Detect file type from raw JSON. Returns 'stammkontext' | 'unknown'.
 */
export function detectFileType(jsonString: string): 'stammkontext' | 'unknown' {
  try {
    const raw = JSON.parse(jsonString) as Record<string, unknown>
    if (typeof raw === 'object' && raw !== null && raw.typ === 'stammkontext') {
      return 'stammkontext'
    }
  } catch {
    // not valid JSON
  }
  return 'unknown'
}
