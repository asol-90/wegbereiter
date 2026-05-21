/**
 * Pure helpers for MiniMonth day-cell rendering.
 *
 * Kept free of React/DOM so the renderer in MiniDayCell stays focused
 * on layout, and so the color logic is independently testable.
 */
import type { PlanungId } from '@/domain/ids'
import type { FerienCacheEntry, IsoDate, StammAktion } from '@/domain/types'
import type { PlanungMarker } from './MiniMonth'
import { classifyDay } from './monthGrid'

export const BAND_FERIEN = '#faeeda'
export const BAND_STAMM = '#b8ddd1'
export const BAND_EXTERN = '#bfd9f2'
export const TEXT_FERIEN = '#854f0b'
export const TEXT_FERIEN_WE = '#633806'
export const TEXT_STAMM = '#0f6e56'
export const TEXT_EXTERN = '#1a6fb5'

export type Band = {
  bg: string
  isFirst: boolean
  isLast: boolean
  hoverLabel?: string
}

const VAR_HEX: Record<string, string> = {
  'var(--wb-s)': '#7f77dd',
  'var(--acc)': '#3c3489',
  'var(--wb-i)': '#378add',
}

/** Blend a CSS color with white at a given ratio (0–1) to produce a solid hex. */
export function blendWithWhite(cssColor: string, ratio: number): string {
  const hex = cssColor.startsWith('#') ? cssColor : null
  if (!hex) {
    return `color-mix(in srgb, ${cssColor} ${Math.round(ratio * 100)}%, #ffffff)`
  }
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const mix = (c: number) => Math.round(c * ratio + 255 * (1 - ratio))
  return `#${[mix(r), mix(g), mix(b)].map((c) => c.toString(16).padStart(2, '0')).join('')}`
}

export function resolveHex(cssColor: string): string | null {
  if (cssColor.startsWith('#')) return cssColor
  return VAR_HEX[cssColor] ?? null
}

export function textForBg(bgHex: string): string {
  if (!bgHex.startsWith('#') || bgHex.length < 7) return '#1a1a1a'
  const r = parseInt(bgHex.slice(1, 3), 16)
  const g = parseInt(bgHex.slice(3, 5), 16)
  const b = parseInt(bgHex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#1a1a1a' : '#f5f3ee'
}

/** Marker opacity ratio for one cell based on hover state. */
export function pickMarkerRatio(
  marker: PlanungMarker,
  highlightedPlanungId: PlanungId | null,
): number {
  if (highlightedPlanungId === null) return 0.28
  return marker.planungId === highlightedPlanungId ? 0.55 : 0.08
}

/** All info needed to render one day cell. Computed once per cell. */
export type CellInfo = {
  bands: Band[]
  textColor: string | undefined
  isFerienOrFeiertag: boolean
  isWeekend: boolean
  isOutOfRange: boolean
  feiertagOrFerienTitle: string | undefined
  stammAkt: StammAktion | undefined
}

type ComputeArgs = {
  iso: IsoDate
  weekday: number
  ferien: FerienCacheEntry | null | undefined
  markers: PlanungMarker[]
  highlightedPlanungId: PlanungId | null
  stammSet: Set<IsoDate>
  aktionen: StammAktion[]
  externAkt: StammAktion[]
  kontextRange: { start: IsoDate; ende: IsoDate } | undefined
}

export function computeCellInfo(args: ComputeArgs): CellInfo {
  const { iso, weekday, ferien, markers, highlightedPlanungId, stammSet, aktionen, externAkt, kontextRange } = args
  const cls = classifyDay(iso, ferien)
  const isWeekend = weekday >= 5
  const isFerienOrFeiertag = !!(cls.ferien || cls.feiertag)
  const stammAkt = aktionen.find((a) => iso >= a.beginn && iso <= a.ende)
  const externAktHere = externAkt.find((a) => iso >= a.beginn && iso <= a.ende)
  const isStammDate = stammSet.has(iso)
  const hasStammLayer = isStammDate || !!stammAkt
  const hasExternLayer = !!externAktHere

  const bands = buildBands({
    cls,
    isFerienOrFeiertag,
    stammAkt,
    isStammDate,
    externAktHere,
    iso,
  })

  const textColor = pickTextColor({
    markers,
    highlightedPlanungId,
    hasExternLayer,
    hasStammLayer,
    isFerienOrFeiertag,
    isWeekend,
  })

  const isOutOfRange =
    kontextRange !== undefined && (iso < kontextRange.start || iso > kontextRange.ende)

  return {
    bands,
    textColor,
    isFerienOrFeiertag,
    isWeekend,
    isOutOfRange,
    feiertagOrFerienTitle: stammAkt?.titel ?? cls.feiertag?.name ?? cls.ferien?.name,
    stammAkt,
  }
}

function buildBands(args: {
  cls: ReturnType<typeof classifyDay>
  isFerienOrFeiertag: boolean
  stammAkt: StammAktion | undefined
  isStammDate: boolean
  externAktHere: StammAktion | undefined
  iso: IsoDate
}): Band[] {
  const { cls, isFerienOrFeiertag, stammAkt, isStammDate, externAktHere, iso } = args
  const bands: Band[] = []

  if (isFerienOrFeiertag) {
    bands.push({
      bg: BAND_FERIEN,
      isFirst: !!cls.ferienFirst,
      isLast: !!cls.ferienLast,
    })
  }

  if (stammAkt) {
    bands.push({
      bg: BAND_STAMM,
      isFirst: iso === stammAkt.beginn,
      isLast: iso === stammAkt.ende,
      hoverLabel: stammAkt.titel,
    })
  } else if (isStammDate) {
    bands.push({
      bg: BAND_STAMM,
      isFirst: true,
      isLast: true,
      hoverLabel: 'Stammtermin',
    })
  }

  if (externAktHere) {
    bands.push({
      bg: BAND_EXTERN,
      isFirst: iso === externAktHere.beginn,
      isLast: iso === externAktHere.ende,
      hoverLabel: externAktHere.titel,
    })
  }

  return bands
}

function pickTextColor(args: {
  markers: PlanungMarker[]
  highlightedPlanungId: PlanungId | null
  hasExternLayer: boolean
  hasStammLayer: boolean
  isFerienOrFeiertag: boolean
  isWeekend: boolean
}): string | undefined {
  const { markers, highlightedPlanungId, hasExternLayer, hasStammLayer, isFerienOrFeiertag, isWeekend } = args
  if (markers.length > 0) {
    const topMarker = markers.find((m) => m.planungId === highlightedPlanungId) ?? markers[0]
    const ratio = pickMarkerRatio(topMarker, highlightedPlanungId)
    const resolved = resolveHex(topMarker.color)
    return resolved ? textForBg(blendWithWhite(resolved, ratio)) : undefined
  }
  if (hasExternLayer) return TEXT_EXTERN
  if (hasStammLayer) return TEXT_STAMM
  if (isFerienOrFeiertag) return isWeekend ? TEXT_FERIEN_WE : TEXT_FERIEN
  return undefined
}

export function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

export function buildMarkerIndex(markers: PlanungMarker[]): Map<IsoDate, PlanungMarker[]> {
  const index = new Map<IsoDate, PlanungMarker[]>()
  for (const m of markers) {
    for (const iso of m.dates) {
      const arr = index.get(iso) ?? []
      arr.push(m)
      index.set(iso, arr)
    }
  }
  return index
}

export function isPlanungHighlightedInMonth(
  markers: PlanungMarker[],
  highlightedPlanungId: PlanungId | null,
  year: number,
  monthIndex: number,
): boolean {
  if (highlightedPlanungId === null) return false
  const prefix = `${year}-${pad2(monthIndex + 1)}`
  return markers.some(
    (m) => m.planungId === highlightedPlanungId && m.dates.some((iso) => iso.startsWith(prefix)),
  )
}
