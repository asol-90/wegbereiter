/**
 * Manages the preview-popover and context-menu open state for PlanungsKalender,
 * including the "click-outside-to-close" behaviour.
 */
import { useCallback, useEffect, useState } from 'react'
import type { IsoDate } from '@/domain/types'
import styles from './PlanungsKalender.module.css'

const POPOVER_SELECTORS = [
  styles.preview, styles.ancBox, styles.stammAncBox, styles.contextMenu, styles.dClickable,
] as const

function isInsidePopover(target: HTMLElement): boolean {
  return POPOVER_SELECTORS.some((sel) => target.closest(`.${sel}`))
}

export function useCalendarPopovers(onTreffenClick?: (id: string) => void) {
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null)
  const [contextMenuDate, setContextMenuDate] = useState<IsoDate | null>(null)

  const togglePreview = useCallback((id: string) => {
    setContextMenuDate(null)
    setActivePreviewId((prev) => (prev === id ? null : id))
    onTreffenClick?.(id)
  }, [onTreffenClick])

  const toggleContextMenu = useCallback((date: IsoDate) => {
    setActivePreviewId(null)
    setContextMenuDate((prev) => (prev === date ? null : date))
  }, [])

  const closeAll = useCallback(() => {
    setActivePreviewId(null)
    setContextMenuDate(null)
  }, [])

  useEffect(() => {
    if (!activePreviewId && !contextMenuDate) return
    function handler(e: MouseEvent) {
      if (!isInsidePopover(e.target as HTMLElement)) closeAll()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [activePreviewId, contextMenuDate, closeAll])

  return { activePreviewId, contextMenuDate, togglePreview, toggleContextMenu, closeAll }
}
