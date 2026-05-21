/**
 * Drag-Auswahl in der KontextSidebar: Mausziehen auf der Spalte erzeugt
 * einen Datumsbereich, der nach Mouse-Up als ISO-Bereich gemeldet wird.
 *
 * Das Jahr ist in 24 Halbmonats-Zeilen geteilt. Gerade Zeilen = Monatsanfang
 * (Tag 01), ungerade = Monatsmitte (Tag 15) bzw. -ende beim Schluss.
 */
import { useCallback, useMemo, useState } from 'react'

function rowToPercent(row: number): number {
  return (row / 24) * 100
}

export function useKontextDragSelect({
  displayYear, onDragComplete,
}: {
  displayYear: number
  onDragComplete: (start: string, ende: string) => void
}) {
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const isDragging = dragStart !== null && dragEnd !== null

  const dragSelection = useMemo(() => {
    if (dragStart === null || dragEnd === null) return null
    const min = Math.min(dragStart, dragEnd)
    const max = Math.max(dragStart, dragEnd)
    return {
      top: rowToPercent(min),
      height: rowToPercent(max + 1) - rowToPercent(min),
    }
  }, [dragStart, dragEnd])

  const reset = useCallback(() => {
    setDragStart(null)
    setDragEnd(null)
  }, [])

  const handleMouseUp = useCallback(() => {
    if (dragStart !== null && dragEnd !== null) {
      const minRow = Math.min(dragStart, dragEnd)
      const maxRow = Math.max(dragStart, dragEnd)
      const startMonth = Math.floor(minRow / 2)
      const endMonth = Math.floor(maxRow / 2)
      if (endMonth >= startMonth) {
        const startDay = minRow % 2 === 0 ? '01' : '15'
        const endDay = maxRow % 2 === 0 ? '15' : new Date(displayYear, endMonth + 1, 0).getDate().toString().padStart(2, '0')
        const start = `${displayYear}-${(startMonth + 1).toString().padStart(2, '0')}-${startDay}`
        const ende = `${displayYear}-${(endMonth + 1).toString().padStart(2, '0')}-${endDay}`
        onDragComplete(start, ende)
      }
    }
    reset()
  }, [dragStart, dragEnd, displayYear, onDragComplete, reset])

  const handleMouseDown = useCallback((rowIndex: number) => {
    const clamped = Math.max(0, Math.min(23, rowIndex))
    setDragStart(clamped)
    setDragEnd(clamped)
  }, [])

  const handleMouseMove = useCallback((rowIndex: number) => {
    if (dragStart === null) return
    setDragEnd(Math.max(0, Math.min(23, rowIndex)))
  }, [dragStart])

  return {
    dragStart,
    dragEnd,
    dragSelection,
    isDragging,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    reset,
  }
}

export { rowToPercent }
