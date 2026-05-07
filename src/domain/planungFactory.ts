/**
 * Factory + name generator for Planungen.
 */
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { generateTermine, parseIso } from './dateUtils'
import { newId } from './ids'
import type {
  AbzeichenAuswahl,
  GlobalConfig,
  IsoDate,
  Mitarbeiter,
  Planung,
  Rhythmus,
  Treffen,
  WBSchwerpunkt,
  Weekday,
} from './types'
import type { PlanungId, StammKontextId, TreffenId } from './ids'
import type { AndachtsreiheZuordnung } from './types'

export type CreatePlanungInput = {
  zeitraum: { start: IsoDate; ende: IsoDate }
  weekday: Weekday
  rhythmus: Rhythmus
  dauerMinuten: number
  team: Mitarbeiter[]
  name?: string
  stammKontextId?: StammKontextId
  /** Dates to exclude from generated Treffen (e.g. Ferien-skipped). */
  excludeDates?: Set<IsoDate>
  /** Planungsziele (Phase 10). */
  wbSchwerpunkt?: WBSchwerpunkt
  andachtsreihenZuordnung?: AndachtsreiheZuordnung[]
  abzeichenAuswahl?: AbzeichenAuswahl[]
}

export function generatePlanungsName(start: IsoDate, ende: IsoDate): string {
  const startDate = parseIso(start)
  const endeDate = parseIso(ende)
  const startLabel = format(startDate, 'LLLL', { locale: de })
  const endeLabel = format(endeDate, 'LLLL', { locale: de })
  const startYear = format(startDate, 'yyyy')
  const endeYear = format(endeDate, 'yyyy')
  if (startYear === endeYear) {
    return `${capitalize(startLabel)} – ${capitalize(endeLabel)} ${endeYear}`
  }
  return `${capitalize(startLabel)} ${startYear} – ${capitalize(endeLabel)} ${endeYear}`
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/**
 * Build an empty Planung with generated regular Treffen.
 * Does not persist.
 */
export function buildPlanung(input: CreatePlanungInput): Planung {
  const allDates = generateTermine(
    input.zeitraum.start,
    input.zeitraum.ende,
    input.weekday,
    input.rhythmus,
  )
  const dates = input.excludeDates
    ? allDates.filter((d) => !input.excludeDates!.has(d))
    : allDates
  const nowIso = new Date().toISOString()
  const treffen: Treffen[] = dates.map((d) => ({
    id: newId<TreffenId>(),
    kind: 'regulaer',
    datum: d,
    programm: [],
    fixiert: false,
    sollWB: [],
  }))

  return {
    id: newId<PlanungId>(),
    name: input.name ?? generatePlanungsName(input.zeitraum.start, input.zeitraum.ende),
    zeitraum: input.zeitraum,
    weekday: input.weekday,
    rhythmus: input.rhythmus,
    dauerMinuten: input.dauerMinuten,
    team: input.team,
    abwesenheiten: [],
    treffen,
    ueberhang: [],
    andachtsreihenZuordnung: input.andachtsreihenZuordnung ?? [],
    abzeichenAuswahl: input.abzeichenAuswahl ?? [],
    wbSchwerpunkt: input.wbSchwerpunkt,
    stammKontextId: input.stammKontextId,
    stammOptOuts: [],
    status: 'entwurf',
    zeitbalkenSchwelle: 0.8,
    erstelltAm: nowIso,
    aktualisiertAm: nowIso,
  }
}

/** Default GlobalConfig for first-time users. */
export function defaultGlobalConfig(): GlobalConfig {
  return {
    bundesland: null,
    defaultWeekday: 'freitag',
    defaultRhythmus: { kind: 'weekly' },
    defaultDauerMinuten: 90,
    lastActivePlanungId: null,
  }
}
