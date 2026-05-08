/**
 * PlanungsKalender — continuous scrollable calendar for a single Planung.
 *
 * Renders the full zeitraum as one strip of week rows (Mo–So).  Months flow
 * seamlessly; alternating background shade and small month labels provide
 * visual separation.  Treffen dates get a clickable anchor box; clicking
 * toggles a preview tooltip with date, title and WB dots.
 *
 * Bands (Ferien, Stammaktionen, Stammtermine) use the same shared `.band`
 * rendering — identical to MiniMonth, just different cell size.
 *
 * Wireframe reference: `planungsansicht-wireframe.html`, Case 05.
 */
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import type { FerienCacheEntry, Planung, Treffen, IsoDate, StammAktion } from '@/domain/types'
import { WB_KEYS, WB_CSS_VAR } from '@/domain/wb'
import { isoToday } from '@/domain/dateUtils'
import { classifyDay } from '@/features/overview/monthGrid'
import clsx from '@/ui/utils/clsx'
import {
  buildPlanungskalenderGrid,
  buildTreffenLookup,
  WEEKDAY_HEADERS_LONG,
  type CalendarCell,
  type TreffenLookup,
} from './planungskalenderGrid'
import styles from './PlanungsKalender.module.css'

// ─── Band colors (same constants as MiniMonth) ─────────────────────────────

const BAND_FERIEN = '#faeeda'
const BAND_STAMM = '#b8ddd1'
const TEXT_FERIEN = '#854f0b'
const TEXT_FERIEN_WE = '#633806'
const TEXT_STAMM = '#0f6e56'

type Band = {
  bg: string
  isFirst: boolean
  isLast: boolean
}

// ─── Props ──────────────────────────────────────────────────────────────────

export type PlanungsKalenderProps = {
  planung: Planung
  ferien: FerienCacheEntry | null | undefined
  /** Stammaktionen to show as green bands. */
  stammAktionen?: StammAktion[]
  /** ISO dates of individual Stammtermine. */
  stammDates?: IsoDate[]
  onTreffenClick?: (treffenId: string) => void
  /** Double-click navigates to detail list view. */
  onTreffenDoubleClick?: (treffenId: string) => void
  /** Called when a Treffen cell is hovered (enter/leave). */
  onTreffenHover?: (datum: IsoDate | null) => void
  /** Treffen dates that should be highlighted (e.g. covered by a hovered absence). */
  highlightedDates?: Set<IsoDate>
}

/** Format an ISO date as "Fr · 05.09." */
function formatPreviewDate(iso: IsoDate): string {
  const d = new Date(iso)
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${dayNames[d.getDay()]} · ${day}.${month}.`
}

// ─── Shared band builder ────────────────────────────────────────────────────

function buildBands(
  iso: IsoDate,
  isFerienOrFeiertag: boolean,
  ferienFirst: boolean,
  ferienLast: boolean,
  stammAkt: StammAktion | undefined,
  isStammDate: boolean,
): Band[] {
  const bands: Band[] = []

  if (isFerienOrFeiertag) {
    bands.push({ bg: BAND_FERIEN, isFirst: ferienFirst, isLast: ferienLast })
  }

  if (stammAkt) {
    bands.push({
      bg: BAND_STAMM,
      isFirst: iso === stammAkt.beginn,
      isLast: iso === stammAkt.ende,
    })
  } else if (isStammDate) {
    bands.push({ bg: BAND_STAMM, isFirst: true, isLast: true })
  }

  return bands
}

/** Determine text color based on bands (topmost wins). */
function textColorForBands(
  bands: Band[],
  isWeekend: boolean,
): string | undefined {
  if (bands.length === 0) return undefined
  const top = bands[bands.length - 1]
  if (top.bg === BAND_STAMM) return TEXT_STAMM
  // Ferien
  return isWeekend ? TEXT_FERIEN_WE : TEXT_FERIEN
}

// ─── Band rendering helper ──────────────────────────────────────────────────

function BandSpans({ bands }: { bands: Band[] }) {
  return (
    <>
      {bands.map((b, i) => (
        <span
          key={i}
          className={clsx(
            styles.band,
            b.isFirst && styles.bandFirst,
            b.isLast && styles.bandLast,
          )}
          style={{ background: b.bg }}
        />
      ))}
    </>
  )
}

// ─── Treffen Preview ────────────────────────────────────────────────────────

function TreffenPreview({
  treffen,
  open,
  onDetailClick,
}: {
  treffen: Treffen
  open: boolean
  onDetailClick?: (treffenId: string) => void
}) {
  return (
    <div className={clsx(styles.preview, open && styles.previewOpen)}>
      <div className={styles.previewDate}>
        {formatPreviewDate(treffen.datum)}
      </div>
      <div className={styles.previewTitle}>
        {treffen.titel ?? 'Treffen'}
      </div>
      <div className={styles.previewRow}>
        <span className={styles.previewLabel}>Wachstumsbereiche</span>
        <div className={styles.previewWb}>
          {WB_KEYS.map((key) => {
            const tag = treffen.programm
              .flatMap((p) => p.wbTags)
              .find((t) => t.key === key)
            const isSoll = treffen.sollWB.includes(key)
            return (
              <div
                key={key}
                className={clsx(
                  styles.previewWbSlot,
                  isSoll && styles.previewWbSlotSoll,
                )}
              >
                <span
                  className={styles.previewWbDot}
                  style={{
                    background: `var(${WB_CSS_VAR[key]})`,
                    opacity: tag ? tag.intensity : 0.15,
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      {onDetailClick && (
        <button
          className={styles.previewBtn}
          onClick={(e) => {
            e.stopPropagation()
            onDetailClick(treffen.id)
          }}
        >
          Details
        </button>
      )}
    </div>
  )
}

// ─── Day cell renderer ──────────────────────────────────────────────────────

function DayCell({
  cell,
  ferien,
  treffenLookup,
  stammAktionen,
  stammDatesSet,
  today,
  previewOpenId,
  onPreviewToggle,
  onTreffenDoubleClick,
  onTreffenHover,
  isHighlighted,
}: {
  cell: Extract<CalendarCell, { kind: 'day' }>
  ferien: FerienCacheEntry | null | undefined
  treffenLookup: TreffenLookup
  stammAktionen: StammAktion[]
  stammDatesSet: Set<string>
  today: string
  previewOpenId: string | null
  onPreviewToggle: (id: string) => void
  onTreffenDoubleClick?: (id: string) => void
  onTreffenHover?: (datum: IsoDate | null) => void
  isHighlighted?: boolean
}) {
  const cls = classifyDay(cell.iso, ferien)
  const treffen = treffenLookup.get(cell.iso)
  const isWeekend = cell.weekday >= 5
  const isToday = cell.iso === today
  const isFerienOrFeiertag = !!(cls.ferien || cls.feiertag)
  const stammAkt = stammAktionen.find((a) => cell.iso >= a.beginn && cell.iso <= a.ende)
  const isStammDate = stammDatesSet.has(cell.iso)

  // ── Build bands (same logic for all cell types) ──
  const bands = buildBands(
    cell.iso,
    isFerienOrFeiertag,
    !!cls.ferienFirst,
    !!cls.ferienLast,
    stammAkt,
    isStammDate,
  )

  const bandTextColor = textColorForBands(bands, isWeekend)

  // Treffen anchor cell — bands render behind the anchor box
  if (treffen) {
    const isOpen = previewOpenId === treffen.id
    return (
      <div
        className={clsx(
          styles.anc,
          cell.shaded && styles.shade,
          !cell.inZeitraum && styles.outside,
          cell.monthLabel && styles.ml,
        )}
        title={stammAkt?.titel ?? cls.feiertag?.name ?? cls.ferien?.name}
      >
        {cell.monthLabel && (
          <span className={styles.mlLabel}>{cell.monthLabel}</span>
        )}
        <BandSpans bands={bands} />
        <div
          className={clsx(styles.ancBox, isOpen && styles.ancBoxActive, isHighlighted && styles.ancBoxHighlighted)}
          onClick={() => onPreviewToggle(treffen.id)}
          onDoubleClick={() => onTreffenDoubleClick?.(treffen.id)}
          onMouseEnter={() => onTreffenHover?.(cell.iso)}
          onMouseLeave={() => onTreffenHover?.(null)}
        >
          {cell.day}
        </div>
        <TreffenPreview
          treffen={treffen}
          open={isOpen}
          onDetailClick={onTreffenDoubleClick}
        />
      </div>
    )
  }

  // Regular day cell
  return (
    <div
      className={clsx(
        styles.d,
        cell.shaded && styles.shade,
        !cell.inZeitraum && styles.outside,
        isWeekend && !bandTextColor && styles.we,
        isToday && styles.today,
        cell.monthLabel && styles.ml,
      )}
      title={stammAkt?.titel ?? cls.feiertag?.name ?? cls.ferien?.name}
    >
      {cell.monthLabel && (
        <span className={styles.mlLabel}>{cell.monthLabel}</span>
      )}
      <BandSpans bands={bands} />
      <span
        className={styles.dLabel}
        style={bandTextColor && !isToday ? { color: bandTextColor } : undefined}
      >
        {cell.day}
      </span>
    </div>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function PlanungsKalender({
  planung,
  ferien,
  stammAktionen = [],
  stammDates = [],
  onTreffenClick,
  onTreffenDoubleClick,
  onTreffenHover,
  highlightedDates,
}: PlanungsKalenderProps) {
  const grid = useMemo(
    () =>
      buildPlanungskalenderGrid(
        planung.zeitraum.start,
        planung.zeitraum.ende,
      ),
    [planung.zeitraum.start, planung.zeitraum.ende],
  )

  const treffenLookup = useMemo(
    () => buildTreffenLookup(planung.treffen),
    [planung.treffen],
  )

  const stammDatesSet = useMemo(() => new Set(stammDates), [stammDates])

  const today = isoToday()

  const [previewOpenId, setPreviewOpenId] = useState<string | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const handlePreviewToggle = useCallback(
    (id: string) => {
      setPreviewOpenId((prev) => (prev === id ? null : id))
      onTreffenClick?.(id)
    },
    [onTreffenClick],
  )

  useEffect(() => {
    if (!previewOpenId) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      // Keep open only if click lands inside the open preview or its anchor box
      const insidePreview = target.closest(`.${styles.preview}`) !== null
      const insideAnchor = target.closest(`.${styles.ancBox}`) !== null
      if (!insidePreview && !insideAnchor) {
        setPreviewOpenId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [previewOpenId])

  if (grid.length === 0) {
    return <div className={styles.empty}>Kein Zeitraum definiert.</div>
  }

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.hdr}>
        {WEEKDAY_HEADERS_LONG.map((h, i) => (
          <span key={i}>{h}</span>
        ))}
      </div>
      <div className={styles.rows}>
        {grid.map((row, ri) => (
          <div key={ri} className={styles.wk}>
            {row.map((cell, ci) => {
              if (cell.kind === 'empty') {
                return (
                  <div
                    key={ci}
                    className={clsx(styles.d, cell.shaded && styles.shade)}
                  />
                )
              }
              return (
                <DayCell
                  key={ci}
                  cell={cell}
                  ferien={ferien}
                  treffenLookup={treffenLookup}
                  stammAktionen={stammAktionen}
                  stammDatesSet={stammDatesSet}
                  today={today}
                  previewOpenId={previewOpenId}
                  onPreviewToggle={handlePreviewToggle}
                  onTreffenDoubleClick={onTreffenDoubleClick}
                  onTreffenHover={onTreffenHover}
                  isHighlighted={highlightedDates?.has(cell.iso)}
                />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
