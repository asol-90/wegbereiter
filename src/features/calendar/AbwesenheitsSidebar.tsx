/**
 * AbwesenheitsSidebar — vertical timeline with one column per team member.
 *
 * Layout: month labels (30px) + treffen column (12px, small diamonds) +
 * one 28px-wide column per member. Horizontal lines: dashed per KW, solid
 * at month boundaries. Avatars as column headers.
 */
import {parseIso, toIso} from '@/domain/dateUtils'
import {newId, type AbwesenheitId, type MitarbeiterId} from '@/domain/ids'
import type {Abwesenheit, IsoDate, Mitarbeiter, Planung} from '@/domain/types'
import {Avatar} from '@/ui/domain'
import {Button, IconButton} from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import {addDays, differenceInCalendarDays, endOfWeek, startOfWeek} from 'date-fns'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import styles from './AbwesenheitsSidebar.module.css'

const ACCENT_HUE_SEQUENCE = [220, 160, 40, 280, 70, 320]

// ─── Types ──────────────────────────────────────────────────────────────────

export type AbwesenheitsSidebarProps = {
  planung: Planung
  onUpdate: (abwesenheiten: Abwesenheit[]) => void
  onTeamUpdate?: (team: Mitarbeiter[]) => void
  onNavigateToList?: () => void
  hoveredTreffenDatum?: IsoDate | null
  onAbwesenheitHover?: (abwesenheit: Abwesenheit | null) => void
}

type WeekRow = {
  monday: IsoDate
  isMonthBorder: boolean
  monthLabel?: string
}

type DragState =
  | { kind: 'create'; memberId: MitarbeiterId; startRow: number; currentRow: number }
  | { kind: 'resize'; absId: AbwesenheitId; edge: 'top' | 'bottom'; startRow: number; currentRow: number }

// ─── Helpers ────────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const

function buildWeekRows(start: IsoDate, ende: IsoDate): WeekRow[] {
  const rows: WeekRow[] = []
  const sDate = startOfWeek(parseIso(start), { weekStartsOn: 1 })
  const eDate = endOfWeek(parseIso(ende), { weekStartsOn: 1 })
  let cursor = sDate
  let lastMonth = -1

  while (cursor <= eDate) {
    const iso = toIso(cursor) as IsoDate
    const weekEnd = addDays(cursor, 6)

    let isMonthBorder = false
    let monthLabel: string | undefined
    for (let d = new Date(cursor); d <= weekEnd; d = addDays(d, 1)) {
      if (d.getDate() === 1 && d.getMonth() !== lastMonth) {
        isMonthBorder = true
        monthLabel = MONTH_SHORT[d.getMonth()]
        lastMonth = d.getMonth()
        break
      }
    }
    if (rows.length === 0 && !monthLabel) {
      monthLabel = MONTH_SHORT[cursor.getMonth()]
      lastMonth = cursor.getMonth()
    }

    rows.push({ monday: iso, isMonthBorder: isMonthBorder || rows.length === 0, monthLabel })
    cursor = addDays(cursor, 7)
  }

  return rows
}

function formatDateShort(iso: IsoDate): string {
  const d = parseIso(iso)
  const dayNames = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa']
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${dayNames[d.getDay()]}, ${day}.${month}.`
}

function dateToRow(iso: IsoDate, rows: WeekRow[]): number {
  if (rows.length === 0) return 0
  const firstMonday = parseIso(rows[0].monday)
  return differenceInCalendarDays(parseIso(iso), firstMonday) / 7
}

function rowToDate(row: number, rows: WeekRow[]): IsoDate {
  if (rows.length === 0) return '' as IsoDate
  const firstMonday = parseIso(rows[0].monday)
  return toIso(addDays(firstMonday, Math.round(row * 7))) as IsoDate
}

function clampDate(iso: IsoDate, start: IsoDate, ende: IsoDate): IsoDate {
  if (iso < start) return start
  if (iso > ende) return ende
  return iso
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AbwesenheitsSidebar({
  planung,
  onUpdate,
  onTeamUpdate,
  onNavigateToList,
  hoveredTreffenDatum,
  onAbwesenheitHover,
}: AbwesenheitsSidebarProps) {
  const { team, abwesenheiten, zeitraum, treffen } = planung

  const [addingMember, setAddingMember] = useState(false)
  const [newMemberName, setNewMemberName] = useState('')
  const addInputRef = useRef<HTMLInputElement>(null)

  const handleAddMemberConfirm = useCallback(() => {
    const name = newMemberName.trim()
    if (!name || !onTeamUpdate) return
    const newMember: Mitarbeiter = {
      id: newId<MitarbeiterId>(),
      name,
      accentHue: ACCENT_HUE_SEQUENCE[team.length % ACCENT_HUE_SEQUENCE.length],
    }
    onTeamUpdate([...team, newMember])
    setNewMemberName('')
    setAddingMember(false)
  }, [newMemberName, onTeamUpdate, team])

  const weekRows = useMemo(
    () => buildWeekRows(zeitraum.start, zeitraum.ende),
    [zeitraum.start, zeitraum.ende],
  )
  const totalRows = weekRows.length

  const [drag, setDrag] = useState<DragState | null>(null)
  const membersAreaRef = useRef<HTMLDivElement>(null)

  // Refs for stable access in document-level listeners
  // eslint-disable-next-line react-hooks/refs
  const dragRef = useRef(drag)
  // eslint-disable-next-line react-hooks/refs
  dragRef.current = drag
  // eslint-disable-next-line react-hooks/refs
  const abwesenheitenRef = useRef(abwesenheiten)
  // eslint-disable-next-line react-hooks/refs
  abwesenheitenRef.current = abwesenheiten
  // eslint-disable-next-line react-hooks/refs
  const weekRowsRef = useRef(weekRows)
  // eslint-disable-next-line react-hooks/refs
  weekRowsRef.current = weekRows
  // eslint-disable-next-line react-hooks/refs
  const zeitraumRef = useRef(zeitraum)
  // eslint-disable-next-line react-hooks/refs
  zeitraumRef.current = zeitraum
  // eslint-disable-next-line react-hooks/refs
  const onUpdateRef = useRef(onUpdate)
  // eslint-disable-next-line react-hooks/refs
  onUpdateRef.current = onUpdate
  // eslint-disable-next-line react-hooks/refs
  const totalRowsRef = useRef(totalRows)
  // eslint-disable-next-line react-hooks/refs
  totalRowsRef.current = totalRows
  // eslint-disable-next-line react-hooks/refs
  const onAbwesenheitHoverRef = useRef(onAbwesenheitHover)
  // eslint-disable-next-line react-hooks/refs
  onAbwesenheitHoverRef.current = onAbwesenheitHover

  const yToRow = useCallback(
    (clientY: number): number => {
      if (!membersAreaRef.current) return 0
      const tr = totalRowsRef.current
      if (tr === 0) return 0
      const rect = membersAreaRef.current.getBoundingClientRect()
      const pct = (clientY - rect.top) / rect.height
      return Math.max(0, Math.min(tr, pct * tr))
    },
    [],
  )

  // ── Document-level drag listeners ─────────────────────────────────────
  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return
      const row = yToRow(e.clientY)
      setDrag((prev) => prev ? { ...prev, currentRow: row } : null)

      // Update crosshover live during drag
      const d = dragRef.current
      const rows = weekRowsRef.current
      const zr = zeitraumRef.current
      const abs = abwesenheitenRef.current
      if (d.kind === 'create') {
        const minRow = Math.min(d.startRow, row)
        const maxRow = Math.max(d.startRow, row)
        if (maxRow - minRow > 0.15) {
          const von = clampDate(rowToDate(minRow, rows), zr.start, zr.ende)
          const bis = clampDate(rowToDate(maxRow, rows), zr.start, zr.ende)
          onAbwesenheitHoverRef.current?.({ id: '' as AbwesenheitId, mitarbeiterId: d.memberId, von, bis })
        }
      } else if (d.kind === 'resize') {
        const target = abs.find((a) => a.id === d.absId)
        if (target) {
          const delta = row - d.startRow
          let von = target.von
          let bis = target.bis
          if (d.edge === 'top') {
            von = clampDate(rowToDate(dateToRow(target.von, rows) + delta, rows), zr.start, zr.ende)
          } else {
            bis = clampDate(rowToDate(dateToRow(target.bis, rows) + delta, rows), zr.start, zr.ende)
          }
          if (von < bis) onAbwesenheitHoverRef.current?.({ ...target, von, bis })
        }
      }
    }

    const handleUp = () => {
      const d = dragRef.current
      if (!d) return
      const rows = weekRowsRef.current
      const zr = zeitraumRef.current
      const abs = abwesenheitenRef.current

      if (d.kind === 'create') {
        const minRow = Math.min(d.startRow, d.currentRow)
        const maxRow = Math.max(d.startRow, d.currentRow)
        if (maxRow - minRow > 0.3) {
          const von = clampDate(rowToDate(minRow, rows), zr.start, zr.ende)
          const bis = clampDate(rowToDate(maxRow, rows), zr.start, zr.ende)
          if (von < bis) {
            onUpdateRef.current([
              ...abs,
              { id: newId<AbwesenheitId>(), mitarbeiterId: d.memberId, von, bis },
            ])
          }
        }
      } else if (d.kind === 'resize') {
        const target = abs.find((a) => a.id === d.absId)
        if (target) {
          const delta = d.currentRow - d.startRow
          let newVon = target.von
          let newBis = target.bis
          if (d.edge === 'top') {
            newVon = clampDate(rowToDate(dateToRow(target.von, rows) + delta, rows), zr.start, zr.ende)
          } else {
            newBis = clampDate(rowToDate(dateToRow(target.bis, rows) + delta, rows), zr.start, zr.ende)
          }
          if (newVon < newBis) {
            onUpdateRef.current(abs.map((a) => a.id === d.absId ? { ...a, von: newVon, bis: newBis } : a))
          }
        }
      }

      onAbwesenheitHoverRef.current?.(null)
      setDrag(null)
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleUp)
    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleUp)
    }
  }, [yToRow])

  const handleColMouseDown = useCallback(
    (memberId: MitarbeiterId, e: React.MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest(`.${styles.absBlock}`) || target.closest('button')) return
      e.preventDefault()
      const row = yToRow(e.clientY)
      setDrag({ kind: 'create', memberId, startRow: row, currentRow: row })
    },
    [yToRow],
  )

  const handleResizeStart = useCallback(
    (absId: AbwesenheitId, edge: 'top' | 'bottom', e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const row = yToRow(e.clientY)
      setDrag({ kind: 'resize', absId, edge, startRow: row, currentRow: row })
    },
    [yToRow],
  )

  const handleDelete = useCallback(
    (absId: AbwesenheitId) => {
      onAbwesenheitHover?.(null)
      onUpdate(abwesenheiten.filter((a) => a.id !== absId))
    },
    [abwesenheiten, onUpdate, onAbwesenheitHover],
  )

  const absentOnHoveredDate = useMemo(() => {
    if (!hoveredTreffenDatum) return new Set<MitarbeiterId>()
    return new Set(
      abwesenheiten
        .filter((a) => a.von <= hoveredTreffenDatum && a.bis >= hoveredTreffenDatum)
        .map((a) => a.mitarbeiterId),
    )
  }, [abwesenheiten, hoveredTreffenDatum])

  // ── Rendering ─────────────────────────────────────────────────────────

  if (team.length === 0) {
    return (
      <div className={styles.root}>
        <div className={styles.header}>
          <span className={styles.headerLabel}>Abwesenheiten</span>
        </div>
        <div className={styles.emptyHint}>
          Noch keine Teammitglieder vorhanden.
        </div>
      </div>
    )
  }

  // ── Compute drag/resize date labels ───────────────────────────────────
  // For create drags: show von–bis outside the selection
  // For resize drags: show the moving edge's date outside the block
  let dateTooltip: { topPct: number; bottomPct: number; vonLabel: string; bisLabel: string } | null = null

  if (drag?.kind === 'create') {
    const minRow = Math.min(drag.startRow, drag.currentRow)
    const maxRow = Math.max(drag.startRow, drag.currentRow)
    if (maxRow - minRow > 0.15) {
      const von = clampDate(rowToDate(minRow, weekRows), zeitraum.start, zeitraum.ende)
      const bis = clampDate(rowToDate(maxRow, weekRows), zeitraum.start, zeitraum.ende)
      dateTooltip = {
        topPct: (minRow / totalRows) * 100,
        bottomPct: (maxRow / totalRows) * 100,
        vonLabel: formatDateShort(von),
        bisLabel: formatDateShort(bis),
      }
    }
  } else if (drag?.kind === 'resize') {
    const abs = abwesenheiten.find((a) => a.id === drag.absId)
    if (abs) {
      const delta = drag.currentRow - drag.startRow
      let von = abs.von
      let bis = abs.bis
      if (drag.edge === 'top') {
        von = clampDate(rowToDate(dateToRow(abs.von, weekRows) + delta, weekRows), zeitraum.start, zeitraum.ende)
      } else {
        bis = clampDate(rowToDate(dateToRow(abs.bis, weekRows) + delta, weekRows), zeitraum.start, zeitraum.ende)
      }
      if (von >= bis) { von = abs.von; bis = abs.bis }
      dateTooltip = {
        topPct: (dateToRow(von, weekRows) / totalRows) * 100,
        bottomPct: (dateToRow(bis, weekRows) / totalRows) * 100,
        vonLabel: formatDateShort(von),
        bisLabel: formatDateShort(bis),
      }
    }
  }

  // Grid lines & month labels
  const gridLines = weekRows.map((wr, ri) => ({
    topPct: (ri / totalRows) * 100,
    isMonthBorder: wr.isMonthBorder && ri > 0,
  }))

  const monthLabels = weekRows
    .map((wr, ri) => wr.monthLabel ? { label: wr.monthLabel, topPct: (ri / totalRows) * 100 } : null)
    .filter(Boolean) as { label: string; topPct: number }[]

  // Treffen positions for diamond column
  const treffenDiamonds = treffen
    .map((t) => {
      const row = dateToRow(t.datum, weekRows)
      if (row < 0 || row > totalRows) return null
      return { id: t.id, datum: t.datum, topPct: (row / totalRows) * 100 }
    })
    .filter(Boolean) as { id: string; datum: IsoDate; topPct: number }[]

  // Drag selection preview for visual feedback
  let dragPreview: { memberId: MitarbeiterId; topPct: number; heightPct: number } | null = null
  if (drag?.kind === 'create') {
    const minRow = Math.min(drag.startRow, drag.currentRow)
    const maxRow = Math.max(drag.startRow, drag.currentRow)
    dragPreview = {
      memberId: drag.memberId,
      topPct: (minRow / totalRows) * 100,
      heightPct: ((maxRow - minRow) / totalRows) * 100,
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Abwesenheiten</span>
      </div>

      {/* Avatar row — offset for month + treffen columns */}
      <div className={styles.avatarRow}>
        {team.map((m) => (
          <div
            key={m.id}
            className={clsx(styles.avatarSlot, absentOnHoveredDate.has(m.id) && styles.highlighted)}
          >
            <Avatar name={m.name} initials={m.initials} size={26} />
          </div>
        ))}
        {/* Team member add */}
        {onTeamUpdate && !addingMember && (
          <div className={styles.avatarAddSlot}>
            <IconButton
              icon="plus"
              size={12}
              label="Teammitglied hinzufügen"
              onClick={() => {
                setAddingMember(true)
                setTimeout(() => addInputRef.current?.focus(), 50)
              }}
            />
          </div>
        )}
        {addingMember && (
          <div className={styles.avatarAddInput}>
            <input
              ref={addInputRef}
              className={styles.memberInput}
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
              placeholder="Name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAddMemberConfirm()
                if (e.key === 'Escape') { setAddingMember(false); setNewMemberName('') }
              }}
              onBlur={() => {
                if (!newMemberName.trim()) { setAddingMember(false); setNewMemberName('') }
              }}
            />
            {newMemberName.trim() && (
              <IconButton
                icon="check"
                size={11}
                label="Bestätigen"
                onClick={handleAddMemberConfirm}
              />
            )}
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className={styles.timeline}>
        {/* Month label column */}
        <div className={styles.monthCol}>
          {monthLabels.map((ml, i) => (
            <span key={i} className={styles.monthLabel} style={{ top: `${ml.topPct}%` }}>
              {ml.label}
            </span>
          ))}
        </div>

        {/* Treffen diamond column */}
        <div className={styles.treffenCol}>
          {treffenDiamonds.map((td) => (
            <div
              key={td.id}
              className={clsx(styles.diamond, hoveredTreffenDatum === td.datum && styles.diamondHighlighted)}
              style={{ top: `${td.topPct}%` }}
            />
          ))}
        </div>

        {/* Members area */}
        <div className={styles.membersArea} ref={membersAreaRef}>
          {/* Grid lines */}
          <div className={styles.gridLines}>
            {gridLines.map((gl, i) => (
              <div
                key={i}
                className={clsx(styles.gridLine, gl.isMonthBorder && styles.monthBorder)}
                style={{ top: `${gl.topPct}%` }}
              />
            ))}
          </div>

          {/* Member columns */}
          {team.map((member) => (
            <div
              key={member.id}
              className={styles.memberCol}
              onMouseDown={(e) => handleColMouseDown(member.id, e)}
            >
              {/* Absence blocks */}
              {abwesenheiten
                .filter((a) => a.mitarbeiterId === member.id)
                .map((abs) => {
                  let von = abs.von
                  let bis = abs.bis

                  if (drag?.kind === 'resize' && drag.absId === abs.id) {
                    const delta = drag.currentRow - drag.startRow
                    if (drag.edge === 'top') {
                      von = clampDate(rowToDate(dateToRow(abs.von, weekRows) + delta, weekRows), zeitraum.start, zeitraum.ende)
                    } else {
                      bis = clampDate(rowToDate(dateToRow(abs.bis, weekRows) + delta, weekRows), zeitraum.start, zeitraum.ende)
                    }
                    if (von >= bis) { von = abs.von; bis = abs.bis }
                  }

                  const topRow = dateToRow(von, weekRows)
                  const bottomRow = dateToRow(bis, weekRows)
                  const topPct = (topRow / totalRows) * 100
                  const heightPct = ((bottomRow - topRow) / totalRows) * 100

                  const isHighlighted = hoveredTreffenDatum
                    ? von <= hoveredTreffenDatum && bis >= hoveredTreffenDatum
                    : false

                  const hue = member.accentHue ?? 0

                  return (
                    <div
                      key={abs.id}
                      className={clsx(styles.absBlock, isHighlighted && styles.highlighted)}
                      style={{
                        top: `${topPct}%`,
                        height: `${Math.max(heightPct, 2)}%`,
                        background: `hsl(${hue}, 55%, 78%)`,
                      }}
                      title={`${member.name}: ${formatDateShort(von)} – ${formatDateShort(bis)}`}
                      onMouseEnter={() => onAbwesenheitHover?.(abs)}
                      onMouseLeave={() => onAbwesenheitHover?.(null)}
                    >
                      <div
                        className={`${styles.resizeHandle} ${styles.top}`}
                        onMouseDown={(e) => handleResizeStart(abs.id, 'top', e)}
                      />
                      <div
                        className={`${styles.resizeHandle} ${styles.bottom}`}
                        onMouseDown={(e) => handleResizeStart(abs.id, 'bottom', e)}
                      />
                      <div className={styles.absDeleteBtn}>
                        <IconButton
                          icon="x"
                          size={10}
                          label="Entfernen"
                          tone="danger"
                          onClick={(e) => { e.stopPropagation(); handleDelete(abs.id) }}
                          style={{ width: 14, height: 14, minWidth: 14, minHeight: 14 }}
                        />
                      </div>
                    </div>
                  )
                })}

              {/* Drag selection preview */}
              {dragPreview && dragPreview.memberId === member.id && (
                <div
                  className={styles.dragSelection}
                  style={{
                    top: `${dragPreview.topPct}%`,
                    height: `${Math.max(dragPreview.heightPct, 1)}%`,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Date labels — absolutely within timeline so they're never clipped by panel */}
        {dateTooltip && (
          <>
            <div className={styles.dateLabel} style={{ top: `${dateTooltip.topPct}%` }}>
              {dateTooltip.vonLabel}
            </div>
            <div className={styles.dateLabel} style={{ top: `${dateTooltip.bottomPct}%` }}>
              {dateTooltip.bisLabel}
            </div>
          </>
        )}
      </div>

      {onNavigateToList && (
        <div className={styles.footer}>
          <Button variant="secondary" size="sm" onClick={onNavigateToList}>
            Weiter zur Detailplanung
          </Button>
        </div>
      )}
    </div>
  )
}
