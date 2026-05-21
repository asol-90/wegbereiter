/**
 * Vertical timeline column for AbwesenheitsSidebar. Renders:
 * - month labels (left)
 * - treffen diamonds (middle)
 * - one column per team member with their absence blocks (right)
 *
 * Drag-related behaviour comes via useAbwesenheitsDrag.
 */
import { type RefObject } from 'react'
import { type AbwesenheitId, type MitarbeiterId } from '@/domain/ids'
import type { Abwesenheit, IsoDate, Mitarbeiter, Treffen } from '@/domain/types'
import { IconButton } from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import {
  applyResize, clampDate, dateToRow, formatDateShort, rowToDate, type WeekRow,
} from './abwesenheitsHelpers'
import type { AbwesenheitsDrag, DragState } from './useAbwesenheitsDrag'
import styles from './AbwesenheitsSidebar.module.css'

type AbsBlockProps = {
  abs: Abwesenheit
  member: Mitarbeiter
  von: IsoDate
  bis: IsoDate
  topPct: number
  heightPct: number
  highlighted: boolean
  onResizeStart: AbwesenheitsDrag['handleResizePointerDown']
  onDelete: (id: AbwesenheitId) => void
  onHover?: (a: Abwesenheit | null) => void
}

function AbsBlock({
  abs, member, von, bis, topPct, heightPct, highlighted, onResizeStart, onDelete, onHover,
}: AbsBlockProps) {
  const hue = member.accentHue ?? 0
  return (
    <div
      data-abs-block
      className={clsx(styles.absBlock, highlighted && styles.highlighted)}
      style={{
        top: `${topPct}%`,
        height: `${Math.max(heightPct, 2)}%`,
        background: `hsl(${hue}, 55%, 78%)`,
      }}
      title={`${member.name}: ${formatDateShort(von)} – ${formatDateShort(bis)}`}
      onMouseEnter={() => onHover?.(abs)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className={`${styles.resizeHandle} ${styles.top}`}
        onPointerDown={(e) => onResizeStart(abs.id, 'top', e)} />
      <div className={`${styles.resizeHandle} ${styles.bottom}`}
        onPointerDown={(e) => onResizeStart(abs.id, 'bottom', e)} />
      <div className={styles.absDeleteBtn}>
        <IconButton icon="x" size={10} label="Entfernen" tone="danger"
          onClick={(e) => { e.stopPropagation(); onDelete(abs.id) }}
          style={{ width: 14, height: 14, minWidth: 14, minHeight: 14 }} />
      </div>
    </div>
  )
}

type MemberColumnProps = {
  member: Mitarbeiter
  abwesenheiten: Abwesenheit[]
  weekRows: WeekRow[]
  zeitraum: { start: IsoDate; ende: IsoDate }
  totalRows: number
  drag: DragState | null
  hoveredTreffenDatum: IsoDate | null | undefined
  dragPreview: { memberId: MitarbeiterId; topPct: number; heightPct: number } | null
  onColPointerDown: AbwesenheitsDrag['handleColPointerDown']
  onResizeStart: AbwesenheitsDrag['handleResizePointerDown']
  onDelete: (id: AbwesenheitId) => void
  onHover?: (a: Abwesenheit | null) => void
}

function MemberColumn({
  member, abwesenheiten, weekRows, zeitraum, totalRows,
  drag, hoveredTreffenDatum, dragPreview, onColPointerDown, onResizeStart, onDelete, onHover,
}: MemberColumnProps) {
  const myAbsences = abwesenheiten.filter((a) => a.mitarbeiterId === member.id)
  return (
    <div
      className={styles.memberCol}
      onPointerDown={(e) => onColPointerDown(member.id, e)}
    >
      {myAbsences.map((abs) => {
        let von = abs.von
        let bis = abs.bis
        if (drag?.kind === 'resize' && drag.absId === abs.id) {
          const next = applyResize({
            abs, delta: drag.currentRow - drag.startRow, edge: drag.edge,
            weekRows, start: zeitraum.start, ende: zeitraum.ende,
          })
          von = next.von
          bis = next.bis
        }
        const topPct = (dateToRow(von, weekRows) / totalRows) * 100
        const heightPct = ((dateToRow(bis, weekRows) - dateToRow(von, weekRows)) / totalRows) * 100
        const highlighted = !!hoveredTreffenDatum && von <= hoveredTreffenDatum && bis >= hoveredTreffenDatum
        return (
          <AbsBlock key={abs.id} abs={abs} member={member} von={von} bis={bis}
            topPct={topPct} heightPct={heightPct} highlighted={highlighted}
            onResizeStart={onResizeStart} onDelete={onDelete} onHover={onHover} />
        )
      })}
      {dragPreview && dragPreview.memberId === member.id && (
        <div
          className={styles.dragSelection}
          style={{ top: `${dragPreview.topPct}%`, height: `${Math.max(dragPreview.heightPct, 1)}%` }}
        />
      )}
    </div>
  )
}

export type AbwesenheitsTimelineProps = {
  team: Mitarbeiter[]
  abwesenheiten: Abwesenheit[]
  treffen: Treffen[]
  weekRows: WeekRow[]
  zeitraum: { start: IsoDate; ende: IsoDate }
  hoveredTreffenDatum?: IsoDate | null
  drag: AbwesenheitsDrag
  containerRef: RefObject<HTMLDivElement | null>
  onDelete: (id: AbwesenheitId) => void
  onHover?: (a: Abwesenheit | null) => void
}

function buildDragPreview(drag: DragState | null, totalRows: number) {
  if (drag?.kind !== 'create') return null
  const minRow = Math.min(drag.startRow, drag.currentRow)
  const maxRow = Math.max(drag.startRow, drag.currentRow)
  return {
    memberId: drag.memberId,
    topPct: (minRow / totalRows) * 100,
    heightPct: ((maxRow - minRow) / totalRows) * 100,
  }
}

type Tooltip = { topPct: number; bottomPct: number; vonLabel: string; bisLabel: string }

function buildDateTooltip(
  drag: DragState | null, weekRows: WeekRow[], zeitraum: { start: IsoDate; ende: IsoDate },
  abwesenheiten: Abwesenheit[],
): Tooltip | null {
  if (!drag || weekRows.length === 0) return null
  const totalRows = weekRows.length
  if (drag.kind === 'create') {
    const minRow = Math.min(drag.startRow, drag.currentRow)
    const maxRow = Math.max(drag.startRow, drag.currentRow)
    if (maxRow - minRow <= 0.15) return null
    const von = clampDate(rowToDate(minRow, weekRows), zeitraum.start, zeitraum.ende)
    const bis = clampDate(rowToDate(maxRow, weekRows), zeitraum.start, zeitraum.ende)
    return {
      topPct: (minRow / totalRows) * 100,
      bottomPct: (maxRow / totalRows) * 100,
      vonLabel: formatDateShort(von),
      bisLabel: formatDateShort(bis),
    }
  }
  const abs = abwesenheiten.find((a) => a.id === drag.absId)
  if (!abs) return null
  const next = applyResize({
    abs, delta: drag.currentRow - drag.startRow, edge: drag.edge,
    weekRows, start: zeitraum.start, ende: zeitraum.ende,
  })
  return {
    topPct: (dateToRow(next.von, weekRows) / totalRows) * 100,
    bottomPct: (dateToRow(next.bis, weekRows) / totalRows) * 100,
    vonLabel: formatDateShort(next.von),
    bisLabel: formatDateShort(next.bis),
  }
}

function MonthCol({ weekRows, totalRows }: { weekRows: WeekRow[]; totalRows: number }) {
  return (
    <div className={styles.monthCol}>
      {weekRows.map((wr, ri) => wr.monthLabel && (
        <span key={ri} className={styles.monthLabel} style={{ top: `${(ri / totalRows) * 100}%` }}>
          {wr.monthLabel}
        </span>
      ))}
    </div>
  )
}

function TreffenCol({
  treffen, weekRows, totalRows, hoveredTreffenDatum,
}: { treffen: Treffen[]; weekRows: WeekRow[]; totalRows: number; hoveredTreffenDatum?: IsoDate | null }) {
  return (
    <div className={styles.treffenCol}>
      {treffen.map((t) => {
        const row = dateToRow(t.datum, weekRows)
        if (row < 0 || row > totalRows) return null
        return (
          <div key={t.id}
            className={clsx(styles.diamond, hoveredTreffenDatum === t.datum && styles.diamondHighlighted)}
            style={{ top: `${(row / totalRows) * 100}%` }} />
        )
      })}
    </div>
  )
}

function GridLines({ weekRows, totalRows }: { weekRows: WeekRow[]; totalRows: number }) {
  return (
    <div className={styles.gridLines}>
      {weekRows.map((wr, ri) => (
        <div key={ri}
          className={clsx(styles.gridLine, wr.isMonthBorder && ri > 0 && styles.monthBorder)}
          style={{ top: `${(ri / totalRows) * 100}%` }} />
      ))}
    </div>
  )
}

export function AbwesenheitsTimeline({
  team, abwesenheiten, treffen, weekRows, zeitraum, hoveredTreffenDatum, drag, containerRef, onDelete, onHover,
}: AbwesenheitsTimelineProps) {
  const totalRows = weekRows.length
  const dateTooltip = buildDateTooltip(drag.drag, weekRows, zeitraum, abwesenheiten)
  const dragPreview = buildDragPreview(drag.drag, totalRows)

  return (
    <div className={styles.timeline}>
      <MonthCol weekRows={weekRows} totalRows={totalRows} />
      <TreffenCol treffen={treffen} weekRows={weekRows} totalRows={totalRows} hoveredTreffenDatum={hoveredTreffenDatum} />
      <div
        className={styles.membersArea}
        ref={containerRef}
        onPointerMove={drag.handlePointerMove}
        onPointerUp={drag.handlePointerUp}
        onLostPointerCapture={drag.handleLostPointerCapture}
      >
        <GridLines weekRows={weekRows} totalRows={totalRows} />
        {team.map((member) => (
          <MemberColumn
            key={member.id} member={member}
            abwesenheiten={abwesenheiten} weekRows={weekRows} zeitraum={zeitraum}
            totalRows={totalRows} drag={drag.drag}
            hoveredTreffenDatum={hoveredTreffenDatum} dragPreview={dragPreview}
            onColPointerDown={drag.handleColPointerDown}
            onResizeStart={drag.handleResizePointerDown}
            onDelete={onDelete} onHover={onHover}
          />
        ))}
      </div>
      {dateTooltip && (
        <>
          <div className={styles.dateLabel} style={{ top: `${dateTooltip.topPct}%` }}>{dateTooltip.vonLabel}</div>
          <div className={styles.dateLabel} style={{ top: `${dateTooltip.bottomPct}%` }}>{dateTooltip.bisLabel}</div>
        </>
      )}
    </div>
  )
}
