/**
 * Overlap detection + clipping for StammKontexte.
 *
 * Two Kontexte overlap when the last date of the old one is >= the first
 * date of the new one (checking treffen + stammaktionen dates).
 *
 * Clipping: remove all treffen/stammaktionen from the old Kontext that
 * fall on or after the first date of the new Kontext.
 */
import type {StammKontext} from './types'

/** All relevant dates (treffen + stammaktionen) sorted ascending. */
function allDates(k: StammKontext): string[] {
  const dates = [
    ...k.treffen.map((t) => t.datum),
    ...k.stammaktionen.map((a) => a.beginn),
  ]
  return dates.sort()
}

/** Earliest date across all treffen + stammaktionen. */
export function earliestDate(k: StammKontext): string | undefined {
  const dates = allDates(k)
  return dates[0]
}

/** Latest date across all treffen + stammaktionen (uses ende for aktionen). */
export function latestDate(k: StammKontext): string | undefined {
  const dates = [
    ...k.treffen.map((t) => t.datum),
    ...k.stammaktionen.map((a) => a.ende),
  ]
  if (dates.length === 0) return undefined
  return dates.sort().at(-1)
}

export type OverlapResult =
  | { kind: 'no-overlap' }
  | {
      kind: 'overlap'
      /** First date of the new Kontext. */
      overlapStart: string
      /** Last date of the old Kontext that falls in the overlap zone. */
      oldLastDate: string
    }

/**
 * Check if a new Kontext overlaps with an existing one.
 *
 * Overlap is defined as: the last date of the existing Kontext >= the
 * first date of the new Kontext.
 */
export function checkOverlap(
  existing: StammKontext,
  incoming: StammKontext,
): OverlapResult {
  const existingLast = latestDate(existing)
  const incomingFirst = earliestDate(incoming)

  if (!existingLast || !incomingFirst) return { kind: 'no-overlap' }

  if (existingLast >= incomingFirst) {
    return {
      kind: 'overlap',
      overlapStart: incomingFirst,
      oldLastDate: existingLast,
    }
  }

  return { kind: 'no-overlap' }
}

/**
 * Clip the old Kontext: remove all treffen + stammaktionen that fall
 * on or after `cutoffDate`.
 *
 * Returns a new StammKontext (does not mutate the original).
 * If clipping removes all dates, returns undefined (the old Kontext
 * should be deleted entirely).
 */
export function clipKontext(
  kontext: StammKontext,
  cutoffDate: string,
): StammKontext | undefined {
  const clippedTreffen = kontext.treffen.filter((t) => t.datum < cutoffDate)
  const clippedAktionen = kontext.stammaktionen.filter((a) => a.beginn < cutoffDate)

  if (clippedTreffen.length === 0 && clippedAktionen.length === 0) {
    return undefined // nothing left
  }

  return {
    ...kontext,
    treffen: clippedTreffen,
    stammaktionen: clippedAktionen,
  }
}
