/**
 * MiniMonth — one 6×7 month grid used inside Jahreskalender.
 *
 * Rendering layers per day cell (front-to-back):
 *   1. Day number (text — color adapts to topmost layer)
 *   2. Planungs-Marker pill (colored, solid-mixed with white)
 *   3. Bands: Ferien/Feiertag (beige) and/or Stammaktion/Stammtermin (green)
 *      — all rendered identically via the shared `.band` class, just different color.
 *
 * Cross-Hover semantics (concept §6, per-Planung, not per-Treffen):
 *   - `highlightedPlanungId` shows all markers of that Planung at 55% blend.
 *   - Non-highlighted markers dim to 8%.
 *   - Hover on a marker reports `onPlanungHover(planungId)`.
 *   - The month gets a border when any of its Planungen is highlighted.
 */
import {isoToday} from '@/domain/dateUtils'
import type {PlanungId} from '@/domain/ids'
import type {FerienCacheEntry, IsoDate, StammAktion} from '@/domain/types'
import clsx from '@/ui/utils/clsx'
import {useState} from 'react'
import styles from './MiniMonth.module.css'
import {buildMonthGrid, classifyDay, MONTH_NAMES_DE, WEEKDAY_HEADERS,} from './monthGrid'

// ─── Band colors (single source of truth) ──────────────────────────────────

const BAND_FERIEN = '#faeeda'
const BAND_STAMM = '#b8ddd1'
const BAND_EXTERN = '#bfd9f2'
const TEXT_FERIEN = '#854f0b'
const TEXT_FERIEN_WE = '#633806'
const TEXT_STAMM = '#0f6e56'
const TEXT_EXTERN = '#1a6fb5'

// ─── Types ──────────────────────────────────────────────────────────────────

export type PlanungMarker = {
  planungId: PlanungId
  /** CSS color for the marker pill. */
  color: string
  /** ISO dates on which this Planung has a Treffen. */
  dates: IsoDate[]
}

type Band = {
  bg: string
  isFirst: boolean
  isLast: boolean
  hoverLabel?: string
}

export type MiniMonthProps = {
  year: number
  /** 0-based month index (Jan = 0). */
  monthIndex: number
  ferien: FerienCacheEntry | null | undefined
  markers: PlanungMarker[]
  highlightedPlanungId: PlanungId | null
  onPlanungHover: (id: PlanungId | null) => void
  /** Whether this month is covered by a Stammkontext (dezenter Rahmen). */
  stammCovered?: boolean
  /** ISO dates of Stammtermine in this month. */
  stammDates?: IsoDate[]
  /** Stammaktionen that overlap this month. */
  stammAktionen?: StammAktion[]
  /** Distrikt- and Regionaltaktionen that overlap this month (rendered blue). */
  externAktionen?: StammAktion[]
  /** Optional Kontext-Range: days outside this range are dimmed and non-interactive. */
  kontextRange?: { start: IsoDate; ende: IsoDate }
  /** Called when an in-range day cell is clicked (only if kontextRange is set). */
  onDayClick?: (date: IsoDate) => void
}

// ─── Color helpers ──────────────────────────────────────────────────────────

/** Blend a CSS color with white at a given ratio (0–1) to produce a solid hex. */
function blendWithWhite(cssColor: string, ratio: number): string {
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

const VAR_HEX: Record<string, string> = {
  'var(--wb-s)': '#7f77dd',
  'var(--acc)': '#3c3489',
  'var(--wb-i)': '#378add',
}

function resolveHex(cssColor: string): string | null {
  if (cssColor.startsWith('#')) return cssColor
  return VAR_HEX[cssColor] ?? null
}

function textForBg(bgHex: string): string {
  if (!bgHex.startsWith('#') || bgHex.length < 7) return '#1a1a1a'
  const r = parseInt(bgHex.slice(1, 3), 16)
  const g = parseInt(bgHex.slice(3, 5), 16)
  const b = parseInt(bgHex.slice(5, 7), 16)
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return lum > 0.55 ? '#1a1a1a' : '#f5f3ee'
}

// ─── Component ──────────────────────────────────────────────────────────────

export function MiniMonth({
  year,
  monthIndex,
  ferien,
  markers,
  highlightedPlanungId,
  onPlanungHover,
  stammCovered: _stammCovered,
  stammDates,
  stammAktionen,
  externAktionen,
  kontextRange,
  onDayClick,
}: MiniMonthProps) {
  const grid = buildMonthGrid(year, monthIndex)
  const today = isoToday()
  const [stammHover, setStammHover] = useState<string | null>(null)

  const markerIndex = new Map<IsoDate, PlanungMarker[]>()
  for (const m of markers) {
    for (const iso of m.dates) {
      const arr = markerIndex.get(iso) ?? []
      arr.push(m)
      markerIndex.set(iso, arr)
    }
  }

  const stammSet = new Set(stammDates ?? [])
  const aktionen = stammAktionen ?? []
  const externAkt = externAktionen ?? []

  const highlightedInMonth =
    highlightedPlanungId !== null &&
    markers.some(
      (m) =>
        m.planungId === highlightedPlanungId &&
        m.dates.some((iso) => iso.startsWith(`${year}-${pad2(monthIndex + 1)}`)),
    )

  return (
    <div
      className={clsx(
        styles.mmCal,
        highlightedInMonth && styles.mmCalHl,
      )}
    >
      {stammHover && <div className={styles.stammTooltip}>{stammHover}</div>}
      <div className={styles.mmName}>{MONTH_NAMES_DE[monthIndex]}</div>
      <div className={styles.mmHdr}>
        {WEEKDAY_HEADERS.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      {grid.map((row, ri) => (
        <div key={ri} className={styles.mmWk}>
          {row.map((cell, ci) => {
            if (cell.kind === 'empty') {
              return <div key={ci} className={clsx(styles.mmD, styles.mmDe)} />
            }

            const cls = classifyDay(cell.iso, ferien)
            const cellMarkers = markerIndex.get(cell.iso) ?? []
            const isWeekend = cell.weekday >= 5
            const isToday = cell.iso === today
            const isFerienOrFeiertag = !!(cls.ferien || cls.feiertag)
            const stammAkt = aktionen.find((a) => cell.iso >= a.beginn && cell.iso <= a.ende)
            const externAktHere = externAkt.find((a) => cell.iso >= a.beginn && cell.iso <= a.ende)
            const isStammDate = stammSet.has(cell.iso)
            const hasStammLayer = isStammDate || !!stammAkt
            const hasExternLayer = !!externAktHere

            // ── Build bands (bottom → top) ──
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
                isFirst: cell.iso === stammAkt.beginn,
                isLast: cell.iso === stammAkt.ende,
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
                isFirst: cell.iso === externAktHere.beginn,
                isLast: cell.iso === externAktHere.ende,
                hoverLabel: externAktHere.titel,
              })
            }

            // ── Text color (topmost layer wins) ──
            let textColor: string | undefined
            if (cellMarkers.length > 0) {
              const topMarker = cellMarkers.find(
                (m) => m.planungId === highlightedPlanungId,
              ) ?? cellMarkers[0]
              const isHl = highlightedPlanungId !== null && topMarker.planungId === highlightedPlanungId
              const isDim = highlightedPlanungId !== null && topMarker.planungId !== highlightedPlanungId
              const ratio = isDim ? 0.08 : isHl ? 0.55 : 0.28
              const resolved = resolveHex(topMarker.color)
              if (resolved) {
                textColor = textForBg(blendWithWhite(resolved, ratio))
              }
            } else if (hasExternLayer) {
              textColor = TEXT_EXTERN
            } else if (hasStammLayer) {
              textColor = TEXT_STAMM
            } else if (isFerienOrFeiertag) {
              textColor = isWeekend ? TEXT_FERIEN_WE : TEXT_FERIEN
            }

            const isOutOfRange =
              kontextRange !== undefined &&
              (cell.iso < kontextRange.start || cell.iso > kontextRange.ende)
            const isClickable = !isOutOfRange && !!onDayClick

            return (
              <div
                key={ci}
                className={clsx(
                  styles.mmD,
                  isWeekend && !textColor && styles.we,
                  isToday && styles.today,
                  isOutOfRange && styles.mmDDisabled,
                  isClickable && styles.mmDClickable,
                )}
                title={stammAkt?.titel ?? cls.feiertag?.name ?? cls.ferien?.name}
                data-out-of-range={isOutOfRange ? '' : undefined}
                onClick={isClickable ? () => onDayClick!(cell.iso) : undefined}
              >
                {/* Bands: Ferien, Stammaktionen — all via shared .band */}
                {bands.map((b, i) => (
                  <span
                    key={i}
                    className={clsx(
                      styles.band,
                      b.isFirst && !b.isLast && styles.bandFirst,
                      b.isLast && !b.isFirst && styles.bandLast,
                      b.isFirst && b.isLast && styles.bandCircle,
                    )}
                    style={{ background: b.bg }}
                    onMouseEnter={b.hoverLabel ? () => setStammHover(b.hoverLabel!) : undefined}
                    onMouseLeave={b.hoverLabel ? () => setStammHover(null) : undefined}
                  />
                ))}
                {/* Planungs-Marker */}
                {cellMarkers.map((m) => {
                  const isHl = highlightedPlanungId !== null && m.planungId === highlightedPlanungId
                  const isDim = highlightedPlanungId !== null && m.planungId !== highlightedPlanungId
                  const ratio = isDim ? 0.08 : isHl ? 0.55 : 0.28
                  return (
                    <span
                      key={m.planungId}
                      className={styles.marker}
                      style={{ background: blendWithWhite(m.color, ratio) }}
                      onMouseEnter={() => onPlanungHover(m.planungId)}
                      onMouseLeave={() => onPlanungHover(null)}
                    />
                  )
                })}
                <span
                  className={styles.mmDLabel}
                  style={textColor && !isToday ? { color: textColor } : undefined}
                >
                  {cell.day}
                </span>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}
