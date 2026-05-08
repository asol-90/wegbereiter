/**
 * PlanungsKalender — continuous scrollable calendar for a single Planung.
 *
 * Renders the full zeitraum as one strip of week rows (Mo–So). Treffen and
 * active Stammtermine are shown as clickable anchor boxes; Stammaktionen get
 * anchor boxes on every day they span, connected by a horizontal line.
 *
 * Wireframe reference: `planungsansicht-wireframe.html`, Case 05.
 */
import { useMemo, useState, useCallback, useEffect, useRef } from 'react'
import type { FerienCacheEntry, IsoDate, Planung, StammAktion, StammTreffen, Treffen } from '@/domain/types'
import type { StammAktionId, StammTreffenId, TreffenId } from '@/domain/ids'
import { WB_KEYS, WB_CSS_VAR } from '@/domain/wb'
import { isoToday } from '@/domain/dateUtils'
import { classifyDay } from '@/features/overview/monthGrid'
import { Button, IconButton, Modal } from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import {
  buildPlanungskalenderGrid,
  buildTreffenLookup,
  WEEKDAY_HEADERS_LONG,
  type CalendarCell,
  type TreffenLookup,
} from './planungskalenderGrid'
import styles from './PlanungsKalender.module.css'

// ─── Band colors ────────────────────────────────────────────────────────────

const BAND_FERIEN = '#faeeda'
const BAND_STAMM = '#b8ddd1'
const TEXT_FERIEN = '#854f0b'
const TEXT_FERIEN_WE = '#633806'
const TEXT_STAMM = '#0f6e56'

type Band = { bg: string; isFirst: boolean; isLast: boolean }

// ─── Props ──────────────────────────────────────────────────────────────────

export type PlanungsKalenderProps = {
  planung: Planung
  ferien: FerienCacheEntry | null | undefined
  stammAktionen?: StammAktion[]
  stammTreffen?: StammTreffen[]
  optedOutStammIds?: Set<string>
  onTreffenClick?: (treffenId: string) => void
  onTreffenDoubleClick?: (treffenId: string) => void
  onTreffenHover?: (datum: IsoDate | null) => void
  hoveredRange?: { von: IsoDate; bis: IsoDate } | null
  onAddTreffen?: (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => void
  onDeleteTreffen?: (treffenId: TreffenId, mode: 'cascade' | 'delete') => void
  onStammAbmelden?: (stammId: StammTreffenId | StammAktionId, treffenId: TreffenId | null) => void
  onStammWiederAnmelden?: (stammId: StammTreffenId, datum: IsoDate) => void
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPreviewDate(iso: IsoDate): string {
  const d = new Date(iso)
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${dayNames[d.getDay()]} · ${day}.${month}.`
}

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
    bands.push({ bg: BAND_STAMM, isFirst: iso === stammAkt.beginn, isLast: iso === stammAkt.ende })
  } else if (isStammDate) {
    bands.push({ bg: BAND_STAMM, isFirst: true, isLast: true })
  }
  return bands
}

function textColorForBands(bands: Band[], isWeekend: boolean): string | undefined {
  if (bands.length === 0) return undefined
  const top = bands[bands.length - 1]
  if (top.bg === BAND_STAMM) return TEXT_STAMM
  return isWeekend ? TEXT_FERIEN_WE : TEXT_FERIEN
}

// ─── Band renderer ───────────────────────────────────────────────────────────

function BandSpans({ bands }: { bands: Band[] }) {
  return (
    <>
      {bands.map((b, i) => (
        <span
          key={i}
          className={clsx(styles.band, b.isFirst && styles.bandFirst, b.isLast && styles.bandLast)}
          style={{ background: b.bg }}
        />
      ))}
    </>
  )
}

// ─── Treffen Preview ─────────────────────────────────────────────────────────

function TreffenPreview({
  treffen,
  open,
  isStammTreffen,
  onDetailClick,
  onDeleteClick,
  onAbmeldenClick,
}: {
  treffen: Treffen
  open: boolean
  isStammTreffen: boolean
  onDetailClick?: (treffenId: string) => void
  onDeleteClick?: () => void
  onAbmeldenClick?: () => void
}) {
  const actionClick = onAbmeldenClick ?? onDeleteClick
  const actionLabel = onAbmeldenClick ? 'Abmelden' : 'Treffen löschen'
  const actionTone: 'default' | 'danger' = onAbmeldenClick ? 'default' : 'danger'
  return (
    <div className={clsx(styles.preview, open && styles.previewOpen)}>
      {actionClick && (
        <div className={styles.previewCornerAction}>
          <IconButton
            icon="trash"
            size={12}
            label={actionLabel}
            tone={actionTone}
            onClick={(e) => { e.stopPropagation(); actionClick() }}
          />
        </div>
      )}
      <div className={styles.previewDate}>{formatPreviewDate(treffen.datum)}</div>
      <div className={styles.previewTitle}>{treffen.titel ?? (isStammTreffen ? 'Stammtreffen' : 'Treffen')}</div>
      <div className={styles.previewRow}>
        <span className={styles.previewLabel}>Wachstumsbereiche</span>
        <div className={styles.previewWb}>
          {WB_KEYS.map((key) => {
            const tag = treffen.programm.flatMap((p) => p.wbTags).find((t) => t.key === key)
            const isSoll = treffen.sollWB.includes(key)
            return (
              <div key={key} className={clsx(styles.previewWbSlot, isSoll && styles.previewWbSlotSoll)}>
                <span
                  className={styles.previewWbDot}
                  style={{ background: `var(${WB_CSS_VAR[key]})`, opacity: tag ? tag.intensity : 0.15 }}
                />
              </div>
            )
          })}
        </div>
      </div>
      {onDetailClick && (
        <button
          className={styles.previewBtn}
          onClick={(e) => { e.stopPropagation(); onDetailClick(treffen.id) }}
        >
          Details
        </button>
      )}
    </div>
  )
}

// ─── Stammaktion Preview ─────────────────────────────────────────────────────

function StammAktionPreview({
  aktion,
  open,
  onAbmeldenClick,
}: {
  aktion: StammAktion
  open: boolean
  onAbmeldenClick?: () => void
}) {
  const startLabel = formatPreviewDate(aktion.beginn)
  const endLabel = aktion.ende !== aktion.beginn ? ` – ${formatPreviewDate(aktion.ende)}` : ''
  return (
    <div className={clsx(styles.preview, open && styles.previewOpen)}>
      {onAbmeldenClick && (
        <div className={styles.previewCornerAction}>
          <IconButton
            icon="trash"
            size={12}
            label="Abmelden"
            tone="default"
            onClick={(e) => { e.stopPropagation(); onAbmeldenClick() }}
          />
        </div>
      )}
      <div className={styles.previewDate}>{startLabel}{endLabel}</div>
      <div className={styles.previewTitle}>{aktion.titel}</div>
      {aktion.ort && <div className={styles.previewSub}>{aktion.ort}</div>}
    </div>
  )
}

// ─── Context Menu (empty day click) ──────────────────────────────────────────

function DayContextMenu({
  open,
  datum,
  optedOutStamm,
  onAddTreffen,
  onWiederAnmelden,
}: {
  open: boolean
  datum: IsoDate
  optedOutStamm: StammTreffen | undefined
  onAddTreffen?: (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => void
  onWiederAnmelden?: (stammId: StammTreffenId, datum: IsoDate) => void
}) {
  return (
    <div className={clsx(styles.contextMenu, open && styles.contextMenuOpen)}>
      <button
        className={styles.contextMenuItem}
        onClick={(e) => { e.stopPropagation(); onAddTreffen?.(datum, 'regulaer') }}
      >
        Treffen hinzufügen
      </button>
      <button
        className={styles.contextMenuItem}
        onClick={(e) => { e.stopPropagation(); onAddTreffen?.(datum, 'extra-aktion') }}
      >
        Aktion hinzufügen
      </button>
      {optedOutStamm && onWiederAnmelden && (
        <button
          className={clsx(styles.contextMenuItem, styles.contextMenuItemAccent)}
          onClick={(e) => { e.stopPropagation(); onWiederAnmelden(optedOutStamm.id, datum) }}
        >
          Wieder anmelden
        </button>
      )}
    </div>
  )
}

// ─── Day Cell ────────────────────────────────────────────────────────────────

function DayCell({
  cell,
  ferien,
  treffenLookup,
  allStammAktionen,
  today,
  stammTreffenHere,
  anyStammTreffenHere,
  optedOutStammTreffenHere,
  stammAktionHere,
  isRangeHighlighted,
  activePreviewId,
  contextMenuDate,
  onPreviewToggle,
  onContextMenuToggle,
  onTreffenDoubleClick,
  onTreffenHover,
  onDeleteStart,
  onStammAbmelden,
  onStammWiederAnmelden,
  onAddTreffen,
}: {
  cell: Extract<CalendarCell, { kind: 'day' }>
  ferien: FerienCacheEntry | null | undefined
  treffenLookup: TreffenLookup
  allStammAktionen: StammAktion[]
  today: string
  stammTreffenHere?: StammTreffen
  anyStammTreffenHere?: StammTreffen
  optedOutStammTreffenHere?: StammTreffen
  stammAktionHere?: StammAktion
  isRangeHighlighted?: boolean
  activePreviewId: string | null
  contextMenuDate: IsoDate | null
  onPreviewToggle: (id: string) => void
  onContextMenuToggle: (date: IsoDate) => void
  onTreffenDoubleClick?: (id: string) => void
  onTreffenHover?: (datum: IsoDate | null) => void
  onDeleteStart: (treffenId: TreffenId, hasProgramm: boolean) => void
  onStammAbmelden?: (stammId: StammTreffenId | StammAktionId, treffenId: TreffenId | null) => void
  onStammWiederAnmelden?: (stammId: StammTreffenId, datum: IsoDate) => void
  onAddTreffen?: (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => void
}) {
  const cls = classifyDay(cell.iso, ferien)
  const treffen = treffenLookup.get(cell.iso)
  const isWeekend = cell.weekday >= 5
  const isToday = cell.iso === today
  const isFerienOrFeiertag = !!(cls.ferien || cls.feiertag)
  // For band rendering use ALL stammAktionen and ALL stammTreffen (including opted-out)
  const anyStammAktHere = allStammAktionen.find((a) => cell.iso >= a.beginn && cell.iso <= a.ende)
  const isAnyStammDate = !!anyStammTreffenHere && !stammAktionHere

  const bands = buildBands(
    cell.iso,
    isFerienOrFeiertag,
    !!cls.ferienFirst,
    !!cls.ferienLast,
    anyStammAktHere,
    isAnyStammDate,
  )
  const bandTextColor = textColorForBands(bands, isWeekend)

  // ── Stammaktionstag (card + connecting line) ──────────────────────────────
  if (stammAktionHere) {
    const isFirst = cell.iso === stammAktionHere.beginn
    const isLast = cell.iso === stammAktionHere.ende
    const isWeekStart = cell.weekday === 0
    const isWeekEnd = cell.weekday === 6
    const lineLeft = (isFirst && !isWeekStart) ? '50%'
      : (isWeekStart && !isFirst) ? 'calc(50% - 22px)'
      : '0'
    const lineRight = (isLast && !isWeekEnd) ? '50%'
      : (isWeekEnd && !isLast) ? 'calc(50% - 22px)'
      : '0'
    const isOpen = activePreviewId === stammAktionHere.id
    return (
      <div
        className={clsx(
          styles.anc,
          cell.shaded && styles.shade,
          !cell.inZeitraum && styles.outside,
          cell.monthLabel && styles.ml,
          isRangeHighlighted && styles.rangeHighlight,
        )}
        title={stammAktionHere.titel}
      >
        {cell.monthLabel && <span className={styles.mlLabel}>{cell.monthLabel}</span>}
        <BandSpans bands={bands.filter((b) => b.bg !== BAND_STAMM)} />
        <div className={styles.stammLine} style={{ left: lineLeft, right: lineRight }} />
        <div
          className={clsx(styles.stammAncBox, isOpen && styles.stammAncBoxActive)}
          onClick={() => onPreviewToggle(stammAktionHere.id)}
        >
          {cell.day}
        </div>
        <StammAktionPreview
          aktion={stammAktionHere}
          open={isOpen}
          onAbmeldenClick={
            onStammAbmelden ? () => onStammAbmelden(stammAktionHere.id, null) : undefined
          }
        />
      </div>
    )
  }

  // ── Own Treffen (possibly also a Stammtermin) ─────────────────────────────
  if (treffen) {
    const isOpen = activePreviewId === treffen.id
    const isStammTreffen = !!stammTreffenHere
    return (
      <div
        className={clsx(
          styles.anc,
          cell.shaded && styles.shade,
          !cell.inZeitraum && styles.outside,
          cell.monthLabel && styles.ml,
          isRangeHighlighted && styles.rangeHighlight,
        )}
        title={anyStammAktHere?.titel ?? cls.feiertag?.name ?? cls.ferien?.name}
      >
        {cell.monthLabel && <span className={styles.mlLabel}>{cell.monthLabel}</span>}
        <BandSpans bands={bands} />
        <div
          className={clsx(
            isStammTreffen ? styles.stammAncBox : styles.ancBox,
            isOpen && (isStammTreffen ? styles.stammAncBoxActive : styles.ancBoxActive),
            isRangeHighlighted && styles.ancBoxHighlighted,
          )}
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
          isStammTreffen={isStammTreffen}
          onDetailClick={onTreffenDoubleClick}
          onDeleteClick={
            !isStammTreffen
              ? () => onDeleteStart(treffen.id as TreffenId, treffen.programm.length > 0)
              : undefined
          }
          onAbmeldenClick={
            isStammTreffen && stammTreffenHere
              ? () => onStammAbmelden?.(stammTreffenHere.id, treffen.id as TreffenId)
              : undefined
          }
        />
      </div>
    )
  }

  // ── Regular day (empty) ───────────────────────────────────────────────────
  const isContextOpen = contextMenuDate === cell.iso
  const canInteract = cell.inZeitraum

  return (
    <div
      className={clsx(
        styles.d,
        cell.shaded && styles.shade,
        !cell.inZeitraum && styles.outside,
        isWeekend && !bandTextColor && styles.we,
        isToday && styles.today,
        cell.monthLabel && styles.ml,
        canInteract && styles.dClickable,
        isRangeHighlighted && styles.rangeHighlight,
      )}
      title={anyStammAktHere?.titel ?? cls.feiertag?.name ?? cls.ferien?.name}
      onClick={canInteract ? () => onContextMenuToggle(cell.iso) : undefined}
    >
      {cell.monthLabel && <span className={styles.mlLabel}>{cell.monthLabel}</span>}
      <BandSpans bands={bands} />
      <span
        className={styles.dLabel}
        style={bandTextColor && !isToday ? { color: bandTextColor } : undefined}
      >
        {cell.day}
      </span>
      {canInteract && (
        <DayContextMenu
          open={isContextOpen}
          datum={cell.iso}
          optedOutStamm={optedOutStammTreffenHere}
          onAddTreffen={onAddTreffen}
          onWiederAnmelden={onStammWiederAnmelden}
        />
      )}
    </div>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function PlanungsKalender({
  planung,
  ferien,
  stammAktionen: allStammAktionen = [],
  stammTreffen: allStammTreffen = [],
  optedOutStammIds = new Set(),
  onTreffenClick,
  onTreffenDoubleClick,
  onTreffenHover,
  hoveredRange,
  onAddTreffen,
  onDeleteTreffen,
  onStammAbmelden,
  onStammWiederAnmelden,
}: PlanungsKalenderProps) {
  const grid = useMemo(
    () => buildPlanungskalenderGrid(planung.zeitraum.start, planung.zeitraum.ende),
    [planung.zeitraum.start, planung.zeitraum.ende],
  )
  const treffenLookup = useMemo(() => buildTreffenLookup(planung.treffen), [planung.treffen])
  const today = isoToday()

  const activeStammTreffen = useMemo(
    () => allStammTreffen.filter((t) => !optedOutStammIds.has(t.id)),
    [allStammTreffen, optedOutStammIds],
  )
  const activeStammAktionen = useMemo(
    () => allStammAktionen.filter((a) => !optedOutStammIds.has(a.id)),
    [allStammAktionen, optedOutStammIds],
  )
  const optedOutStammTreffen = useMemo(
    () => allStammTreffen.filter((t) => optedOutStammIds.has(t.id)),
    [allStammTreffen, optedOutStammIds],
  )
  const activeStammTreffenByDate = useMemo(
    () => new Map(activeStammTreffen.map((t) => [t.datum, t])),
    [activeStammTreffen],
  )
  const allStammTreffenByDate = useMemo(
    () => new Map(allStammTreffen.map((t) => [t.datum, t])),
    [allStammTreffen],
  )
  const optedOutStammTreffenByDate = useMemo(
    () => new Map(optedOutStammTreffen.map((t) => [t.datum, t])),
    [optedOutStammTreffen],
  )

  const [activePreviewId, setActivePreviewId] = useState<string | null>(null)
  const [contextMenuDate, setContextMenuDate] = useState<IsoDate | null>(null)
  const [kaskadeModal, setKaskadeModal] = useState<TreffenId | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const handlePreviewToggle = useCallback(
    (id: string) => {
      setContextMenuDate(null)
      setActivePreviewId((prev) => (prev === id ? null : id))
      onTreffenClick?.(id)
    },
    [onTreffenClick],
  )

  const handleContextMenuToggle = useCallback((date: IsoDate) => {
    setActivePreviewId(null)
    setContextMenuDate((prev) => (prev === date ? null : date))
  }, [])

  const handleDeleteStart = useCallback(
    (treffenId: TreffenId, hasProgramm: boolean) => {
      setActivePreviewId(null)
      if (hasProgramm) {
        setKaskadeModal(treffenId)
      } else {
        onDeleteTreffen?.(treffenId, 'cascade')
      }
    },
    [onDeleteTreffen],
  )

  const handleAddTreffen = useCallback(
    (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => {
      setContextMenuDate(null)
      onAddTreffen?.(datum, kind)
    },
    [onAddTreffen],
  )

  const handleWiederAnmelden = useCallback(
    (stammId: StammTreffenId, datum: IsoDate) => {
      setContextMenuDate(null)
      onStammWiederAnmelden?.(stammId, datum)
    },
    [onStammWiederAnmelden],
  )

  // Close popovers on outside click
  useEffect(() => {
    if (!activePreviewId && !contextMenuDate) return
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (
        !target.closest(`.${styles.preview}`) &&
        !target.closest(`.${styles.ancBox}`) &&
        !target.closest(`.${styles.stammAncBox}`) &&
        !target.closest(`.${styles.contextMenu}`) &&
        !target.closest(`.${styles.dClickable}`)
      ) {
        setActivePreviewId(null)
        setContextMenuDate(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activePreviewId, contextMenuDate])

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
                return <div key={ci} className={clsx(styles.d, cell.shaded && styles.shade)} />
              }
              const stammAktionHere = activeStammAktionen.find(
                (a) => cell.iso >= a.beginn && cell.iso <= a.ende,
              )
              const stammTreffenHere = activeStammTreffenByDate.get(cell.iso)
              const anyStammTreffenHere = allStammTreffenByDate.get(cell.iso)
              const optedOutHere = optedOutStammTreffenByDate.get(cell.iso)
              const isRangeHighlighted =
                !!hoveredRange && cell.iso >= hoveredRange.von && cell.iso <= hoveredRange.bis
              return (
                <DayCell
                  key={ci}
                  cell={cell}
                  ferien={ferien}
                  treffenLookup={treffenLookup}
                  allStammAktionen={allStammAktionen}
                  today={today}
                  stammTreffenHere={stammTreffenHere}
                  anyStammTreffenHere={anyStammTreffenHere}
                  optedOutStammTreffenHere={optedOutHere}
                  stammAktionHere={stammAktionHere}
                  isRangeHighlighted={isRangeHighlighted}
                  activePreviewId={activePreviewId}
                  contextMenuDate={contextMenuDate}
                  onPreviewToggle={handlePreviewToggle}
                  onContextMenuToggle={handleContextMenuToggle}
                  onTreffenDoubleClick={onTreffenDoubleClick}
                  onTreffenHover={onTreffenHover}
                  onDeleteStart={handleDeleteStart}
                  onStammAbmelden={onStammAbmelden}
                  onStammWiederAnmelden={handleWiederAnmelden}
                  onAddTreffen={handleAddTreffen}
                />
              )
            })}
          </div>
        ))}
      </div>

      {/* Kaskaden-Dialog */}
      <Modal
        open={kaskadeModal !== null}
        onClose={() => setKaskadeModal(null)}
        title="Treffen löschen"
        description="Dieses Treffen hat Programmpunkte. Was soll mit dem Inhalt passieren?"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setKaskadeModal(null)}>
              Abbrechen
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (kaskadeModal) onDeleteTreffen?.(kaskadeModal, 'delete')
                setKaskadeModal(null)
              }}
            >
              Verwerfen
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                if (kaskadeModal) onDeleteTreffen?.(kaskadeModal, 'cascade')
                setKaskadeModal(null)
              }}
            >
              Kaskadieren
            </Button>
          </>
        }
      />
    </div>
  )
}
