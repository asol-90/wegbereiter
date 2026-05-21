/**
 * Drag selection state for JahresplanerSidebar. Tracks mouse-down → mouse-move
 * across the 24 half-month rows; on mouse-up converts the range to a zeitraum
 * and invokes the callback.
 */
import { useCallback, useState, type MouseEvent } from 'react'
import { dragSelectionToZeitraum, rowToPercent } from './jahresplanerHelpers'

export type DragSelection = {
  top: number
  height: number
}

export type UseJahresplanerDragInput = {
  year: number
  onZeitraumSelected: (range: { start: string; ende: string }) => void
}

function rowFromEvent(e: MouseEvent<HTMLElement>): number {
  const rect = e.currentTarget.getBoundingClientRect()
  const y = e.clientY - rect.top
  const rowIndex = Math.floor((y / rect.height) * 24)
  return Math.max(0, Math.min(23, rowIndex))
}

export function useJahresplanerDrag({ year, onZeitraumSelected }: UseJahresplanerDragInput) {
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)

  const handleColMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-plan-block]')) return
    e.preventDefault()
    const row = rowFromEvent(e)
    setDragStart(row)
    setDragEnd(row)
  }, [])

  const handleColMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (dragStart === null) return
    setDragEnd(rowFromEvent(e))
  }, [dragStart])

  const handleMouseUp = useCallback(() => {
    if (dragStart !== null && dragEnd !== null) {
      const range = dragSelectionToZeitraum(dragStart, dragEnd, year)
      if (range) onZeitraumSelected(range)
    }
    setDragStart(null)
    setDragEnd(null)
  }, [dragStart, dragEnd, year, onZeitraumSelected])

  const handleMouseLeave = useCallback(() => {
    if (dragStart !== null) {
      setDragStart(null)
      setDragEnd(null)
    }
  }, [dragStart])

  const selection: DragSelection | null =
    dragStart === null || dragEnd === null ? null : {
      top: rowToPercent(Math.min(dragStart, dragEnd)),
      height: rowToPercent(Math.max(dragStart, dragEnd) + 1) - rowToPercent(Math.min(dragStart, dragEnd)),
    }

  const isDragging = dragStart !== null && dragEnd !== null

  return {
    selection, isDragging,
    handleColMouseDown, handleColMouseMove, handleMouseUp, handleMouseLeave,
  }
}
