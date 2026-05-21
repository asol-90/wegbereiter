/**
 * Pure helpers + constants for PlanungsKalender's day-cell rendering.
 * No React, no hooks.
 */
import type { IsoDate, StammAktion } from '@/domain/types'

export const BAND_FERIEN = '#faeeda'
export const BAND_STAMM = '#b8ddd1'
export const BAND_EXTERN = '#bfd9f2'
const TEXT_FERIEN = '#854f0b'
const TEXT_FERIEN_WE = '#633806'
const TEXT_STAMM = '#0f6e56'
const TEXT_EXTERN = '#1a6fb5'

export type Band = { bg: string; isFirst: boolean; isLast: boolean }

export type BuildBandsInput = {
  iso: IsoDate
  isFerienOrFeiertag: boolean
  ferienFirst: boolean
  ferienLast: boolean
  stammAkt: StammAktion | undefined
  isStammDate: boolean
  externAkt?: StammAktion
}

export function buildBands(input: BuildBandsInput): Band[] {
  const { iso, isFerienOrFeiertag, ferienFirst, ferienLast, stammAkt, isStammDate, externAkt } = input
  const bands: Band[] = []
  if (isFerienOrFeiertag) bands.push({ bg: BAND_FERIEN, isFirst: ferienFirst, isLast: ferienLast })
  if (stammAkt) bands.push({ bg: BAND_STAMM, isFirst: iso === stammAkt.beginn, isLast: iso === stammAkt.ende })
  else if (isStammDate) bands.push({ bg: BAND_STAMM, isFirst: true, isLast: true })
  if (externAkt) bands.push({ bg: BAND_EXTERN, isFirst: iso === externAkt.beginn, isLast: iso === externAkt.ende })
  return bands
}

export function textColorForBands(bands: Band[], isWeekend: boolean): string | undefined {
  if (bands.length === 0) return undefined
  const top = bands[bands.length - 1].bg
  if (top === BAND_EXTERN) return TEXT_EXTERN
  if (top === BAND_STAMM) return TEXT_STAMM
  return isWeekend ? TEXT_FERIEN_WE : TEXT_FERIEN
}

export function formatPreviewDate(iso: IsoDate): string {
  const d = new Date(iso)
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${dayNames[d.getDay()]} · ${day}.${month}.`
}

/** Compute the Stammaktion-connecting-line offsets within a day cell. */
export function stammLineOffsets(
  iso: IsoDate,
  weekday: number,
  aktion: StammAktion,
): { left: string; right: string } {
  const isFirst = iso === aktion.beginn
  const isLast = iso === aktion.ende
  const isWeekStart = weekday === 0
  const isWeekEnd = weekday === 6
  const left = isFirst && !isWeekStart ? '50%' : isWeekStart && !isFirst ? 'calc(50% - 22px)' : '0'
  const right = isLast && !isWeekEnd ? '50%' : isWeekEnd && !isLast ? 'calc(50% - 22px)' : '0'
  return { left, right }
}
