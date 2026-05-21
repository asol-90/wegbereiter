/**
 * PlanungsKalender — continuous scrollable calendar for a single Planung.
 *
 * Renders the full zeitraum as one strip of week rows (Mo–So). Treffen and
 * active Stammtermine are shown as clickable anchor boxes; Stammaktionen get
 * anchor boxes on every day they span, connected by a horizontal line.
 *
 * Wireframe reference: `planungsansicht-wireframe.html`, Case 05.
 */
import { isoToday } from '@/domain/dateUtils'
import type { StammAktionId, StammTreffenId, TreffenId } from '@/domain/ids'
import type {
  FerienCacheEntry, IsoDate, Planung, StammAktion, StammTreffen,
} from '@/domain/types'
import { Button, Modal } from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import { useCallback, useMemo, useRef, useState } from 'react'
import styles from './PlanungsKalender.module.css'
import {
  buildPlanungskalenderGrid, buildTreffenLookup, type CalendarCell, WEEKDAY_HEADERS_LONG,
} from './planungskalenderGrid'
import { DayCell } from './DayCell'
import { useCalendarPopovers } from './useCalendarPopovers'
import { useStammLookups } from './useStammLookups'

export type PlanungsKalenderProps = {
  planung: Planung
  ferien: FerienCacheEntry | null | undefined
  stammAktionen?: StammAktion[]
  externAktionen?: StammAktion[]
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

type KaskadeModalProps = {
  treffenId: TreffenId | null
  onClose: () => void
  onDelete?: (id: TreffenId, mode: 'cascade' | 'delete') => void
}

function KaskadeModal({ treffenId, onClose, onDelete }: KaskadeModalProps) {
  const apply = (mode: 'cascade' | 'delete') => () => {
    if (treffenId) onDelete?.(treffenId, mode)
    onClose()
  }
  return (
    <Modal
      open={treffenId !== null}
      onClose={onClose}
      title="Treffen löschen"
      description="Dieses Treffen hat Programmpunkte. Was soll mit dem Inhalt passieren?"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="danger" onClick={apply('delete')}>Verwerfen</Button>
          <Button variant="primary" onClick={apply('cascade')}>Kaskadieren</Button>
        </>
      }
    />
  )
}

export function PlanungsKalender({
  planung,
  ferien,
  stammAktionen: allStammAktionen = [],
  externAktionen: allExternAktionen = [],
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
  const lookups = useStammLookups(allStammTreffen, allStammAktionen, optedOutStammIds)
  const popovers = useCalendarPopovers(onTreffenClick)
  const [kaskadeModal, setKaskadeModal] = useState<TreffenId | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const handleDeleteStart = useCallback(
    (treffenId: TreffenId, hasProgramm: boolean) => {
      popovers.closeAll()
      if (hasProgramm) setKaskadeModal(treffenId)
      else onDeleteTreffen?.(treffenId, 'cascade')
    },
    [onDeleteTreffen, popovers],
  )

  const handleAddTreffen = useCallback(
    (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => {
      popovers.closeAll()
      onAddTreffen?.(datum, kind)
    },
    [onAddTreffen, popovers],
  )

  const handleWiederAnmelden = useCallback(
    (stammId: StammTreffenId, datum: IsoDate) => {
      popovers.closeAll()
      onStammWiederAnmelden?.(stammId, datum)
    },
    [onStammWiederAnmelden, popovers],
  )

  if (grid.length === 0) return <div className={styles.empty}>Kein Zeitraum definiert.</div>

  return (
    <div className={styles.root} ref={rootRef}>
      <div className={styles.hdr}>
        {WEEKDAY_HEADERS_LONG.map((h, i) => <span key={i}>{h}</span>)}
      </div>
      <div className={styles.rows}>
        {grid.map((row, ri) => (
          <div key={ri} className={styles.wk}>
            {row.map((cell, ci) => (
              <Cell
                key={ci} cell={cell} ferien={ferien} treffenLookup={treffenLookup}
                lookups={lookups} hoveredRange={hoveredRange} today={today}
                allStammAktionen={allStammAktionen} allExternAktionen={allExternAktionen}
                popovers={popovers}
                onTreffenDoubleClick={onTreffenDoubleClick}
                onTreffenHover={onTreffenHover}
                onDeleteStart={handleDeleteStart}
                onStammAbmelden={onStammAbmelden}
                onStammWiederAnmelden={handleWiederAnmelden}
                onAddTreffen={handleAddTreffen}
              />
            ))}
          </div>
        ))}
      </div>
      <KaskadeModal treffenId={kaskadeModal} onClose={() => setKaskadeModal(null)} onDelete={onDeleteTreffen} />
    </div>
  )
}

type CellProps = {
  cell: CalendarCell
  ferien: FerienCacheEntry | null | undefined
  treffenLookup: ReturnType<typeof buildTreffenLookup>
  lookups: ReturnType<typeof useStammLookups>
  hoveredRange?: { von: IsoDate; bis: IsoDate } | null
  today: string
  allStammAktionen: StammAktion[]
  allExternAktionen: StammAktion[]
  popovers: ReturnType<typeof useCalendarPopovers>
  onTreffenDoubleClick?: (id: string) => void
  onTreffenHover?: (datum: IsoDate | null) => void
  onDeleteStart: (treffenId: TreffenId, hasProgramm: boolean) => void
  onStammAbmelden?: (stammId: StammTreffenId | StammAktionId, treffenId: TreffenId | null) => void
  onStammWiederAnmelden?: (stammId: StammTreffenId, datum: IsoDate) => void
  onAddTreffen?: (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => void
}

function Cell({ cell, ferien, treffenLookup, lookups, hoveredRange, today, allStammAktionen, allExternAktionen, popovers, ...handlers }: CellProps) {
  if (cell.kind === 'empty') {
    return <div className={clsx(styles.d, cell.shaded && styles.shade)} />
  }
  const stammAktionHere = lookups.activeStammAktionen.find((a) => cell.iso >= a.beginn && cell.iso <= a.ende)
  const stammTreffenHere = lookups.activeStammTreffenByDate.get(cell.iso)
  const anyStammTreffenHere = lookups.allStammTreffenByDate.get(cell.iso)
  const optedOutHere = lookups.optedOutStammTreffenByDate.get(cell.iso)
  const isRangeHighlighted = !!hoveredRange && cell.iso >= hoveredRange.von && cell.iso <= hoveredRange.bis
  return (
    <DayCell
      cell={cell} ferien={ferien} treffenLookup={treffenLookup}
      allStammAktionen={allStammAktionen} allExternAktionen={allExternAktionen}
      today={today}
      stammTreffenHere={stammTreffenHere}
      anyStammTreffenHere={anyStammTreffenHere}
      optedOutStammTreffenHere={optedOutHere}
      stammAktionHere={stammAktionHere}
      isRangeHighlighted={isRangeHighlighted}
      activePreviewId={popovers.activePreviewId}
      contextMenuDate={popovers.contextMenuDate}
      onPreviewToggle={popovers.togglePreview}
      onContextMenuToggle={popovers.toggleContextMenu}
      {...handlers}
    />
  )
}
