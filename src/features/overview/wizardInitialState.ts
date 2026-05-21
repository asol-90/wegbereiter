/**
 * Pure computation of the wizard's initial form state.
 * Extracted so the body's lazy useState initializer stays tiny.
 */
import type { GlobalConfig, IsoDate, Mitarbeiter, Planung, StammKontext, Weekday } from '@/domain/types'
import {
  clampEndeBeforeSecondKontext,
  defaultEndIso,
  findKontextForZeitraum,
  firstFreeStartDate,
  isoAddMonths,
  isoNextDay,
  isoPrevDay,
  kontextDateRange,
  rhythmusToKey,
  type RhythmusKey,
} from './newPlanungWizardUtils'

export type WizardInitialState = {
  weekday: Weekday
  rhythmusK: RhythmusKey
  dauer: number
  start: IsoDate
  ende: IsoDate
  team: Mitarbeiter[]
}

export type WizardInitialInput = {
  config: GlobalConfig
  loaded: boolean
  planungen: readonly Planung[]
  kontexte: readonly StammKontext[]
  initialZeitraum?: { start: IsoDate; ende: IsoDate }
}

/** Pick a sensible start date when the user opened the wizard fresh (no drag). */
function computeFreshStart(planungen: readonly Planung[], weekday: Weekday): IsoDate {
  return firstFreeStartDate(planungen, weekday)
}

/**
 * Pick a start date when a zeitraum was prefilled (e.g. drag-to-create). We
 * snap to the day after the previous planung, and to the start of an overlapping
 * Stammkontext.
 */
function computeDragStart(
  initialZeitraum: { start: IsoDate; ende: IsoDate },
  planungen: readonly Planung[],
  kontexte: readonly StammKontext[],
): IsoDate {
  let s = initialZeitraum.start
  const preceding = planungen
    .filter((p) => p.zeitraum.ende < initialZeitraum.ende && p.zeitraum.ende >= isoPrevDay(s))
    .sort((a, b) => b.zeitraum.ende.localeCompare(a.zeitraum.ende))
  if (preceding.length > 0) {
    const afterPrev = isoNextDay(preceding[0].zeitraum.ende)
    if (afterPrev >= s) s = afterPrev
  }
  const overlappingKontext = findKontextForZeitraum(kontexte, s, initialZeitraum.ende)
  if (overlappingKontext) {
    const range = kontextDateRange(overlappingKontext)
    if (range && range.von >= s && range.von <= initialZeitraum.ende) {
      s = range.von
    }
  }
  return s
}

function computeEndForDrag(
  start: IsoDate,
  initialZeitraum: { start: IsoDate; ende: IsoDate },
  kontexte: readonly StammKontext[],
): IsoDate {
  const overlap = findKontextForZeitraum(kontexte, start, initialZeitraum.ende)
  if (!overlap) return initialZeitraum.ende
  const range = kontextDateRange(overlap)
  if (!range) return initialZeitraum.ende
  const candidate = range.bis > start ? range.bis : initialZeitraum.ende
  return clampEndeBeforeSecondKontext(kontexte, overlap.id, start, candidate)
}

function computeEndForFresh(start: IsoDate, kontexte: readonly StammKontext[]): IsoDate {
  const future = findKontextForZeitraum(kontexte, start, isoAddMonths(start, 12))
  if (!future) return defaultEndIso(start)
  const range = kontextDateRange(future)
  if (range && range.bis > start) {
    return clampEndeBeforeSecondKontext(kontexte, future.id, start, range.bis)
  }
  return defaultEndIso(start)
}

export function computeInitialWizardState(input: WizardInitialInput): WizardInitialState {
  const { config, loaded, planungen, kontexte, initialZeitraum } = input
  const weekday: Weekday = loaded ? config.defaultWeekday : 'freitag'
  const rhythmusK: RhythmusKey = loaded ? rhythmusToKey(config.defaultRhythmus) : 'weekly'
  const dauer = loaded ? config.defaultDauerMinuten : 90

  const start = initialZeitraum
    ? computeDragStart(initialZeitraum, planungen, kontexte)
    : computeFreshStart(planungen, weekday)
  const ende = initialZeitraum
    ? computeEndForDrag(start, initialZeitraum, kontexte)
    : computeEndForFresh(start, kontexte)

  const team: Mitarbeiter[] = planungen[0]?.team?.length
    ? [...planungen[0].team]
    : []

  return { weekday, rhythmusK, dauer, start, ende, team }
}
