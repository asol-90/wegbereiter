/**
 * Ferien/Feiertage service.
 *
 * Source: openholidaysapi.org — free, no key required, CORS-enabled, covers
 * all German Bundesländer with reliable multi-year data.
 *
 * Results are cached per (bundesland, jahr) in IndexedDB. The cache is
 * returned even on network failure so the app remains functional offline.
 */
import type {
  BundeslandKey,
  Feiertag,
  Ferien,
  FerienCacheEntry,
} from '../domain/types'
import { getFerienCache, saveFerienCache } from '../storage/ferienRepo'

export type FerienFetcher = (
  bundesland: BundeslandKey,
  jahr: number,
) => Promise<{ feiertage: Feiertag[]; ferien: Ferien[] }>

export type FerienServiceOptions = {
  /** Override fetcher for tests or offline mode. */
  fetch?: FerienFetcher
  /** Cache TTL in ms. Default: 30 days. Older entries still returned on failure. */
  ttlMs?: number
}

const DEFAULT_TTL_MS = 30 * 24 * 60 * 60 * 1000

/** Map BundeslandKey → ISO 3166-2:DE subdivision code used by OpenHolidaysAPI. */
const SUBDIVISION: Record<BundeslandKey, string> = {
  BW: 'DE-BW',
  BY: 'DE-BY',
  BE: 'DE-BE',
  BB: 'DE-BB',
  HB: 'DE-HB',
  HH: 'DE-HH',
  HE: 'DE-HE',
  MV: 'DE-MV',
  NI: 'DE-NI',
  NW: 'DE-NW',
  RP: 'DE-RP',
  SL: 'DE-SL',
  SN: 'DE-SN',
  ST: 'DE-ST',
  SH: 'DE-SH',
  TH: 'DE-TH',
}

const API_BASE = 'https://openholidaysapi.org'

type OHName = { language: string; text: string }
type OHHoliday = { name: OHName[]; startDate: string; endDate: string }

/** Pick the German name (or first available). */
function pickName(names: OHName[]): string {
  return (names.find((n) => n.language === 'DE') ?? names[0])?.text ?? '?'
}

/**
 * Fetch public holidays from OpenHolidaysAPI.
 */
async function fetchFeiertage(
  bundesland: BundeslandKey,
  jahr: number,
): Promise<Feiertag[]> {
  const sub = SUBDIVISION[bundesland]
  const url =
    `${API_BASE}/PublicHolidays?countryIsoCode=DE&subdivisionCode=${sub}` +
    `&validFrom=${jahr}-01-01&validTo=${jahr}-12-31&languageIsoCode=DE`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenHolidaysAPI PublicHolidays: ${res.status}`)
  const data = (await res.json()) as OHHoliday[]
  return data.map((h) => ({
    name: pickName(h.name),
    datum: h.startDate,
    bundesweit: false,
  }))
}

/**
 * Fetch school vacations from OpenHolidaysAPI.
 */
async function fetchFerien(
  bundesland: BundeslandKey,
  jahr: number,
): Promise<Ferien[]> {
  const sub = SUBDIVISION[bundesland]
  const url =
    `${API_BASE}/SchoolHolidays?countryIsoCode=DE&subdivisionCode=${sub}` +
    `&validFrom=${jahr}-01-01&validTo=${jahr}-12-31&languageIsoCode=DE`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`OpenHolidaysAPI SchoolHolidays: ${res.status}`)
  const data = (await res.json()) as OHHoliday[]
  return data.map((h) => ({
    name: pickName(h.name),
    start: h.startDate,
    ende: h.endDate,
  }))
}

const defaultFetcher: FerienFetcher = async (bundesland, jahr) => {
  const [feiertage, ferien] = await Promise.all([
    fetchFeiertage(bundesland, jahr),
    fetchFerien(bundesland, jahr),
  ])
  return { feiertage, ferien }
}

export class FerienService {
  private fetcher: FerienFetcher
  private ttlMs: number

  constructor(opts: FerienServiceOptions = {}) {
    this.fetcher = opts.fetch ?? defaultFetcher
    this.ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS
  }

  /**
   * Get feiertage+ferien for (bundesland, jahr). Strategy:
   * 1. Cache within TTL → return cache.
   * 2. Try network → save to cache → return.
   * 3. Fallback: return stale cache if available, else throw.
   */
  async getForYear(bundesland: BundeslandKey, jahr: number): Promise<FerienCacheEntry> {
    const cached = await getFerienCache(bundesland, jahr)
    const now = Date.now()
    if (cached && now - new Date(cached.abgerufenAm).getTime() < this.ttlMs) {
      return cached
    }
    try {
      const { feiertage, ferien } = await this.fetcher(bundesland, jahr)
      const fresh: FerienCacheEntry = {
        bundesland,
        jahr,
        feiertage,
        ferien,
        abgerufenAm: new Date().toISOString(),
      }
      await saveFerienCache(fresh)
      return fresh
    } catch (err) {
      if (cached) return cached
      throw err
    }
  }
}

/** Convenience: check if a given date is a feiertag in the cache. */
export function isFeiertag(entry: FerienCacheEntry, iso: string): Feiertag | undefined {
  return entry.feiertage.find((f) => f.datum === iso)
}

/** Convenience: check if a given date falls inside any ferien range. */
export function isInFerien(entry: FerienCacheEntry, iso: string): Ferien | undefined {
  return entry.ferien.find((f) => iso >= f.start && iso <= f.ende)
}
