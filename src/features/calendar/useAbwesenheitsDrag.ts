/**
 * Drag state + pointer event handlers for AbwesenheitsSidebar.
 *
 * Pointer-capture-based drag: the element that handles pointerdown captures
 * the pointer so subsequent move/up events route to it regardless of cursor
 * position. JSX-bound handlers close over current props/state.
 */
import { useCallback, useState, type PointerEvent, type RefObject } from 'react'
import { newId, type AbwesenheitId, type MitarbeiterId } from '@/domain/ids'
import type { Abwesenheit, IsoDate } from '@/domain/types'
import {
  applyResize, createSelectionDates, type WeekRow,
} from './abwesenheitsHelpers'

export type DragState =
  | { kind: 'create'; memberId: MitarbeiterId; startRow: number; currentRow: number }
  | { kind: 'resize'; absId: AbwesenheitId; edge: 'top' | 'bottom'; startRow: number; currentRow: number }

export type UseDragInput = {
  abwesenheiten: Abwesenheit[]
  weekRows: WeekRow[]
  zeitraum: { start: IsoDate; ende: IsoDate }
  containerRef: RefObject<HTMLDivElement | null>
  onUpdate: (abs: Abwesenheit[]) => void
  onAbwesenheitHover?: (a: Abwesenheit | null) => void
}

export type AbwesenheitsDrag = {
  drag: DragState | null
  handleColPointerDown: (memberId: MitarbeiterId, e: PointerEvent<HTMLDivElement>) => void
  handleResizePointerDown: (absId: AbwesenheitId, edge: 'top' | 'bottom', e: PointerEvent<HTMLDivElement>) => void
  handlePointerMove: (e: PointerEvent<HTMLDivElement>) => void
  handlePointerUp: () => void
  handleLostPointerCapture: () => void
}

type DragContext = Pick<UseDragInput, 'abwesenheiten' | 'weekRows' | 'zeitraum' | 'onUpdate' | 'onAbwesenheitHover'>

function previewHover(ctx: DragContext, d: DragState, row: number) {
  const { abwesenheiten, weekRows, zeitraum, onAbwesenheitHover } = ctx
  if (d.kind === 'create') {
    const dates = createSelectionDates(d.startRow, row, weekRows, zeitraum.start, zeitraum.ende)
    if (dates) onAbwesenheitHover?.({ id: '' as AbwesenheitId, mitarbeiterId: d.memberId, ...dates })
    return
  }
  const target = abwesenheiten.find((a) => a.id === d.absId)
  if (!target) return
  const { von, bis } = applyResize({
    abs: target, delta: row - d.startRow, edge: d.edge, weekRows,
    start: zeitraum.start, ende: zeitraum.ende,
  })
  onAbwesenheitHover?.({ ...target, von, bis })
}

function commitDrag(ctx: DragContext, d: DragState) {
  const { abwesenheiten, weekRows, zeitraum, onUpdate } = ctx
  if (d.kind === 'create') {
    if (Math.abs(d.currentRow - d.startRow) <= 0.3) return
    const dates = createSelectionDates(d.startRow, d.currentRow, weekRows, zeitraum.start, zeitraum.ende)
    if (!dates) return
    onUpdate([...abwesenheiten, { id: newId<AbwesenheitId>(), mitarbeiterId: d.memberId, ...dates }])
    return
  }
  const target = abwesenheiten.find((a) => a.id === d.absId)
  if (!target) return
  const { von, bis } = applyResize({
    abs: target, delta: d.currentRow - d.startRow, edge: d.edge, weekRows,
    start: zeitraum.start, ende: zeitraum.ende,
  })
  onUpdate(abwesenheiten.map((a) => a.id === d.absId ? { ...a, von, bis } : a))
}

export function useAbwesenheitsDrag(input: UseDragInput): AbwesenheitsDrag {
  const { containerRef, onAbwesenheitHover } = input
  const [drag, setDrag] = useState<DragState | null>(null)
  const totalRows = input.weekRows.length

  const yToRow = useCallback((clientY: number) => {
    if (!containerRef.current || totalRows === 0) return 0
    const rect = containerRef.current.getBoundingClientRect()
    const pct = (clientY - rect.top) / rect.height
    return Math.max(0, Math.min(totalRows, pct * totalRows))
  }, [containerRef, totalRows])

  const handleColPointerDown = useCallback(
    (memberId: MitarbeiterId, e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      const target = e.target as HTMLElement
      if (target.closest('[data-abs-block]') || target.closest('button')) return
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      const row = yToRow(e.clientY)
      setDrag({ kind: 'create', memberId, startRow: row, currentRow: row })
    },
    [yToRow],
  )

  const handleResizePointerDown = useCallback(
    (absId: AbwesenheitId, edge: 'top' | 'bottom', e: PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      e.preventDefault()
      e.stopPropagation()
      e.currentTarget.setPointerCapture(e.pointerId)
      const row = yToRow(e.clientY)
      setDrag({ kind: 'resize', absId, edge, startRow: row, currentRow: row })
    },
    [yToRow],
  )

  function handlePointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag) return
    const row = yToRow(e.clientY)
    setDrag((prev) => prev ? { ...prev, currentRow: row } : null)
    previewHover(input, drag, row)
  }

  function handlePointerUp() {
    if (!drag) return
    commitDrag(input, drag)
    onAbwesenheitHover?.(null)
    setDrag(null)
  }

  function handleLostPointerCapture() {
    if (!drag) return
    onAbwesenheitHover?.(null)
    setDrag(null)
  }

  return {
    drag,
    handleColPointerDown, handleResizePointerDown,
    handlePointerMove, handlePointerUp, handleLostPointerCapture,
  }
}
