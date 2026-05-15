/**
 * Pure utility functions and constants for NewPlanungWizard.
 * No React, no hooks, no IO.
 */
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { Ferien, IsoDate, Planung, Rhythmus, StammAktion, StammKontext, Weekday } from '@/domain/types'
import { parseIso } from '@/domain/dateUtils'

// ─── Types ───────────────────────────────────────────────────────────────────

export type RhythmusKey = 'weekly' | 'biweekly' | 'monthly'

export type AndachtMode = 'none' | 'reihe' | 'sammlung' | 'new'

export type AktionBereich = 'Stamm' | 'Distrikt' | 'Regional'

export type PreviewItem =
  | { kind: 'treffen'; iso: IsoDate; source: 'kontext' | 'generated' }
  | { kind: 'aktion'; aktion: StammAktion; bereich: AktionBereich }

export type BisPreset = {
  label: string
  iso: IsoDate
}

/** Logical step identifiers — the visible sequence is built dynamically. */
export type LogicalStep = 'teamplanung' | 'stammkontext' | 'ziele' | 'vorschau'

// ─── Constants ───────────────────────────────────────────────────────────────

export const STEP_META: Record<LogicalStep, string> = {
  teamplanung: 'Teamplanung',
  stammkontext: 'Stamm-Kontext',
  ziele: 'Ziele',
  vorschau: 'Vorschau',
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  montag: 'Montag',
  dienstag: 'Dienstag',
  mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag',
  freitag: 'Freitag',
  samstag: 'Samstag',
  sonntag: 'Sonntag',
}

export const RHYTHMUS_LABELS: Record<RhythmusKey, string> = {
  weekly: 'wöchentlich',
  biweekly: '14-tägig',
  monthly: 'monatlich',
}

// Private — not exported
const WEEKDAY_SHORT_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

// ─── Date helpers ─────────────────────────────────────────────────────────────

export function isoFromDate(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add N months to an ISO date. */
export function isoAddMonths(iso: IsoDate, months: number): IsoDate {
  const d = parseIso(iso)
  d.setMonth(d.getMonth() + months)
  return isoFromDate(d)
}

/** Subtract one calendar day from an ISO date. */
export function isoPrevDay(iso: IsoDate): IsoDate {
  const d = parseIso(iso)
  d.setDate(d.getDate() - 1)
  return isoFromDate(d)
}

/** Add one calendar day to an ISO date. */
export function isoNextDay(iso: IsoDate): IsoDate {
  const d = parseIso(iso)
  d.setDate(d.getDate() + 1)
  return isoFromDate(d)
}

export function weekdayToJsDow(w: Weekday): number {
  const map: Record<Weekday, number> = {
    sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3,
    donnerstag: 4, freitag: 5, samstag: 6,
  }
  return map[w]
}

/** Next occurrence of `weekday`, including today if it matches. */
export function defaultStartIsoFor(weekday: Weekday): IsoDate {
  const today = new Date()
  const target = weekdayToJsDow(weekday)
  const diff = (target - today.getDay() + 7) % 7 // 0 if today IS the weekday
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff)
  return isoFromDate(d)
}

export function defaultEndIso(start: IsoDate): IsoDate {
  const d = parseIso(start)
  d.setMonth(d.getMonth() + 4)
  return isoFromDate(d)
}

// ─── Kontext helpers ──────────────────────────────────────────────────────────

/**
 * Get the date range (earliest → latest) of a StammKontext.
 */
export function kontextDateRange(k: StammKontext): { von: IsoDate; bis: IsoDate } | null {
  const allDates = [
    ...k.treffen.map((t) => t.datum),
    ...k.stammaktionen.map((a) => a.beginn),
    ...k.stammaktionen.map((a) => a.ende),
  ].sort()
  if (allDates.length === 0) return null
  return { von: allDates[0], bis: allDates[allDates.length - 1] }
}

/**
 * Find the StammKontext that overlaps a given zeitraum.
 * Returns the first one found. If two kontexte overlap,
 * returns the one that starts first.
 */
export function findKontextForZeitraum(
  kontexte: readonly StammKontext[],
  start: IsoDate,
  ende: IsoDate,
): StammKontext | undefined {
  const candidates = kontexte
    .map((k) => ({ kontext: k, range: kontextDateRange(k) }))
    .filter((x): x is { kontext: StammKontext; range: { von: IsoDate; bis: IsoDate } } =>
      x.range !== null && x.range.von <= ende && x.range.bis >= start,
    )
    .sort((a, b) => a.range.von.localeCompare(b.range.von))
  return candidates[0]?.kontext
}

/**
 * If a second StammKontext starts within [start, ende], return the day
 * before it begins (so the Planung doesn't span two contexts).
 */
export function clampEndeBeforeSecondKontext(
  kontexte: readonly StammKontext[],
  primaryKontextId: string,
  start: IsoDate,
  ende: IsoDate,
): IsoDate {
  for (const k of kontexte) {
    if (k.id === primaryKontextId) continue
    const range = kontextDateRange(k)
    if (!range) continue
    // Does this other kontext start within our zeitraum?
    if (range.von > start && range.von <= ende) {
      const clampedEnde = isoPrevDay(range.von)
      if (clampedEnde > start) return clampedEnde
    }
  }
  return ende
}

/**
 * Find the first date in the future that is not covered by any existing Planung.
 * Uses the configured weekday for the default start.
 */
export function firstFreeStartDate(
  planungen: readonly Planung[],
  weekday: Weekday,
): IsoDate {
  const candidate = defaultStartIsoFor(weekday)
  // Sort planungen by zeitraum.start
  const sorted = [...planungen]
    .filter((p) => p.zeitraum.ende >= candidate)
    .sort((a, b) => a.zeitraum.start.localeCompare(b.zeitraum.start))

  let result = candidate
  for (const p of sorted) {
    // If result falls within this Planung's zeitraum, jump past it
    if (result >= p.zeitraum.start && result <= p.zeitraum.ende) {
      result = isoNextDay(p.zeitraum.ende)
    }
  }
  return result
}

// ─── Rhythmus helpers ─────────────────────────────────────────────────────────

export function rhythmusFromKey(k: RhythmusKey): Rhythmus {
  switch (k) {
    case 'weekly': return { kind: 'weekly' }
    case 'biweekly': return { kind: 'biweekly' }
    case 'monthly': return { kind: 'monthly' }
  }
}

export function rhythmusToKey(r: Rhythmus): RhythmusKey {
  switch (r.kind) {
    case 'weekly': return 'weekly'
    case 'biweekly': return 'biweekly'
    case 'monthly': return 'monthly'
    case 'custom': return 'weekly'
  }
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

export function formatTerminDate(iso: IsoDate): string {
  const d = parseIso(iso)
  const wd = WEEKDAY_SHORT_DE[d.getDay()]
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${wd} ${day}.${month}.`
}

/** Compact date for multi-day ranges: "27.–28.09." */
export function formatDateRange(beginn: IsoDate, ende: IsoDate): string {
  const b = parseIso(beginn)
  const e = parseIso(ende)
  const bDay = b.getDate().toString().padStart(2, '0')
  const eDay = e.getDate().toString().padStart(2, '0')
  const bMon = (b.getMonth() + 1).toString().padStart(2, '0')
  const eMon = (e.getMonth() + 1).toString().padStart(2, '0')
  if (bMon === eMon) {
    return `${bDay}.–${eDay}.${eMon}.`
  }
  return `${bDay}.${bMon}.–${eDay}.${eMon}.`
}

export function formatDateShort(iso: string): string {
  try { return format(parseISO(iso), 'd. MMM yyyy', { locale: de }) }
  catch { return iso }
}

// ─── Bis-Preset helpers ───────────────────────────────────────────────────────

export function buildBisPresets(
  start: IsoDate,
  ferien1: Ferien[] | undefined,
  ferien2: Ferien[] | undefined,
  kontext: StammKontext | undefined,
): BisPreset[] {
  const presets: BisPreset[] = []
  const allFerien = [...(ferien1 ?? []), ...(ferien2 ?? [])]
  // Deduplicate by name+start
  const seen = new Set<string>()
  const uniqueFerien = allFerien.filter((f) => {
    const key = `${f.name}:${f.start}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  // 6-month cutoff from start
  const cutoff = isoAddMonths(start, 6)

  // Only Ferien that start AFTER our start date and within 6 months
  const future = uniqueFerien
    .filter((f) => f.start > start && f.start <= cutoff)
    .sort((a, b) => a.start.localeCompare(b.start))

  for (const f of future) {
    presets.push({
      label: `Bis ${f.name}`,
      iso: isoPrevDay(f.start),
    })
  }

  if (kontext) {
    const allKontextDates = [
      ...kontext.treffen.map((t) => t.datum),
      ...kontext.stammaktionen.map((a) => a.ende),
    ].sort()
    const last = allKontextDates[allKontextDates.length - 1]
    if (last && last > start && last <= cutoff) {
      presets.push({ label: 'Ende Stammkontext', iso: last })
    }
  }

  return presets
}

/** Find a smart default end date based on Ferien: next Ferien start after `start`. */
export function smartDefaultEnd(
  start: IsoDate,
  ferien1: Ferien[] | undefined,
  ferien2: Ferien[] | undefined,
): IsoDate | null {
  const allFerien = [...(ferien1 ?? []), ...(ferien2 ?? [])]
  const next = allFerien
    .filter((f) => f.start > start)
    .sort((a, b) => a.start.localeCompare(b.start))[0]
  return next ? isoPrevDay(next.start) : null
}

// ─── Preview helpers ──────────────────────────────────────────────────────────

export function previewSortKey(item: PreviewItem): IsoDate {
  return item.kind === 'treffen' ? item.iso : item.aktion.beginn
}

// ─── Step sequence ────────────────────────────────────────────────────────────

export function buildStepSequence(hasKontext: boolean): LogicalStep[] {
  const steps: LogicalStep[] = ['teamplanung']
  if (hasKontext) steps.push('stammkontext')
  steps.push('ziele', 'vorschau')
  return steps
}
