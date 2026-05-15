/**
 * Suggest planning periods for the "Neue Planung"-Flow.
 *
 * - ohne Stamm-Datei: zwei klassische Zeiträume (nach Sommerferien bis Weihnachten /
 *   nach Weihnachten bis Sommerferien), berechnet anhand Bundesland.
 * - mit Stamm-Datei: Zeitraum des Stamm-Kontexts.
 *
 * Always overridable.
 */
import {addDays, getYear} from 'date-fns'
import {parseIso, toIso} from './dateUtils'
import type {Ferien, IsoDate, StammKontext} from './types'

export type ZeitraumVorschlag = {
  label: string
  start: IsoDate
  ende: IsoDate
  /** Short hint, e.g. "nach Sommerferien bis Weihnachten". */
  rationale: string
}

/**
 * Suggest two classic periods based on vacation data for the given year.
 * Falls back to month-based approximation if vacation data missing.
 */
export function klassischeVorschlaege(
  referenceDate: Date,
  ferien: Ferien[],
): ZeitraumVorschlag[] {
  const year = getYear(referenceDate)

  const sommerferien = findFerienContaining(ferien, 'sommer', year)
  const herbstferien = findFerienContaining(ferien, 'herbst', year)
  const winterWeihnachten = findFerienContaining(ferien, 'weihnacht', year)

  const suggestions: ZeitraumVorschlag[] = []

  // Herbst-Block: Tag nach Sommerferien → Tag vor Weihnachtsferien.
  if (sommerferien && winterWeihnachten) {
    const start = toIso(addDays(parseIso(sommerferien.ende), 1))
    const ende = toIso(addDays(parseIso(winterWeihnachten.start), -1))
    suggestions.push({
      label: 'Herbst-Semester',
      start,
      ende,
      rationale: 'nach Sommerferien bis Weihnachten',
    })
  } else if (herbstferien) {
    // Fallback: use herbstferien as start hint
    const start = toIso(addDays(parseIso(herbstferien.ende), 1))
    const ende = `${year}-12-20`
    suggestions.push({
      label: 'Herbst-Semester',
      start,
      ende,
      rationale: 'nach Herbstferien bis Weihnachten',
    })
  } else {
    suggestions.push({
      label: 'Herbst-Semester',
      start: `${year}-09-01`,
      ende: `${year}-12-20`,
      rationale: 'September bis Weihnachten',
    })
  }

  // Frühjahr-Block: Nach Weihnachten → vor Sommerferien (meist nächstes Jahr)
  const weihnachtDesVorjahrs = findFerienContaining(ferien, 'weihnacht', year - 1)
  const sommerferienAktuell = findFerienContaining(ferien, 'sommer', year)
  if (weihnachtDesVorjahrs && sommerferienAktuell) {
    const start = toIso(addDays(parseIso(weihnachtDesVorjahrs.ende), 1))
    const ende = toIso(addDays(parseIso(sommerferienAktuell.start), -1))
    suggestions.push({
      label: 'Frühjahr-Semester',
      start,
      ende,
      rationale: 'nach Weihnachten bis Sommerferien',
    })
  } else {
    suggestions.push({
      label: 'Frühjahr-Semester',
      start: `${year}-01-10`,
      ende: `${year}-06-20`,
      rationale: 'Januar bis Sommer',
    })
  }

  return suggestions
}

/** Find first vacation whose name contains the token (case-insensitive) in the given year. */
function findFerienContaining(
  ferien: Ferien[],
  token: 'sommer' | 'herbst' | 'weihnacht',
  year: number,
): Ferien | undefined {
  return ferien.find(
    (f) =>
      f.name.toLowerCase().includes(token) &&
      parseIso(f.start).getFullYear() === year,
  )
}

export function stammBasierterVorschlag(stamm: StammKontext): ZeitraumVorschlag {
  return {
    label: 'Wie Stamm-Kontext',
    start: stamm.zeitraum.start,
    ende: stamm.zeitraum.ende,
    rationale: `Thema „${stamm.thema}"`,
  }
}
