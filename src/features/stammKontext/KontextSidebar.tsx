/**
 * KontextSidebar — vertical year timeline for the Stammkontext overview.
 *
 * Shows existing Kontexte as clickable blocks. Drag to create a new Kontext.
 * A DropZone at the bottom accepts JSON import files.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { Icon } from '@/ui/primitives/Icon'
import { useStammKontext } from './useStammKontext'
import { useStammImport } from './useStammImport'
import { StammImportDialog } from '@/features/overview/StammImportDialog'
import { DropZone } from '@/features/overview/DropZone'
import type { StammKontextId } from '@/domain/ids'
import type { StammKontext } from '@/domain/types'
import { parseIso } from '@/domain/dateUtils'
import clsx from '@/ui/utils/clsx'
import styles from './KontextSidebar.module.css'

const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const

export type KontextSidebarProps = {
  displayYear: number
  activeKontextId?: StammKontextId | null
  onDragComplete: (start: string, ende: string) => void
}

function rowToPercent(row: number): number {
  return (row / 24) * 100
}

function kontextInYear(k: StammKontext, year: number): boolean {
  const prefix = `${year}`
  return (
    k.treffen.some((t) => t.datum.startsWith(prefix)) ||
    k.stammaktionen.some((a) => a.beginn.startsWith(prefix) || a.ende.startsWith(prefix))
  )
}

function kontextRowSpan(k: StammKontext, year: number): { top: number; bottom: number } | null {
  const dates: string[] = []
  for (const t of k.treffen) {
    if (t.datum.startsWith(`${year}`)) dates.push(t.datum)
  }
  for (const a of k.stammaktionen) {
    if (a.beginn.startsWith(`${year}`)) dates.push(a.beginn)
    if (a.ende.startsWith(`${year}`)) dates.push(a.ende)
  }
  if (dates.length === 0) return null
  dates.sort()
  const first = dates[0]!
  const last = dates[dates.length - 1]!
  const firstMonth = parseInt(first.slice(5, 7), 10) - 1
  const lastMonth = parseInt(last.slice(5, 7), 10) - 1
  return {
    top: firstMonth * 2,
    bottom: (lastMonth + 1) * 2,
  }
}

function formatKontextRange(k: StammKontext): string {
  const allDates = [
    ...k.treffen.map((t) => t.datum),
    ...k.stammaktionen.map((a) => a.beginn),
    ...k.stammaktionen.map((a) => a.ende),
  ].sort()
  if (allDates.length === 0) return ''
  const first = parseIso(allDates[0]!)
  const last = parseIso(allDates[allDates.length - 1]!)
  return `${format(first, 'MMM yyyy', { locale: de })} – ${format(last, 'MMM yyyy', { locale: de })}`
}

export function KontextSidebar({ displayYear, activeKontextId, onDragComplete }: KontextSidebarProps) {
  const { kontexte, remove } = useStammKontext()
  const navigate = useNavigate()
  const { fileInputRef, parseError, pendingImport, handleFileDrop, handleFileInput, triggerFileSelect, handleConfirmImport, clearPendingImport, clearError } = useStammImport()

  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const isDragging = dragStart !== null && dragEnd !== null

  const yearKontexte = useMemo(
    () => kontexte.filter((k) => kontextInYear(k, displayYear)),
    [kontexte, displayYear],
  )

  const rows = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      index: i,
      isMonthStart: i % 2 === 0,
    }))
  }, [])

  const kontextBlocks = useMemo(() => {
    return yearKontexte.map((k) => {
      const span = kontextRowSpan(k, displayYear)
      return { kontext: k, span }
    }).filter((x): x is { kontext: StammKontext; span: { top: number; bottom: number } } => x.span !== null)
  }, [yearKontexte, displayYear])

  const dragSelection = useMemo(() => {
    if (dragStart === null || dragEnd === null) return null
    const min = Math.min(dragStart, dragEnd)
    const max = Math.max(dragStart, dragEnd)
    return {
      top: rowToPercent(min),
      height: rowToPercent(max + 1) - rowToPercent(min),
    }
  }, [dragStart, dragEnd])

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
    setDragStart(null)
    setDragEnd(null)
  }, [dragStart, dragEnd, displayYear, onDragComplete])

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.sectionLabel}>Stammkontexte</span>
        <button type="button" className={styles.importBtn} onClick={triggerFileSelect} title="JSON importieren">
          <Icon name="upload" size={12} />
        </button>
      </div>

      {parseError && (
        <div className={styles.errorBanner}>
          <span>{parseError}</span>
          <button className={styles.errorDismiss} onClick={clearError}>×</button>
        </div>
      )}

      <div
        className={styles.timeline}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDragging) {
            setDragStart(null)
            setDragEnd(null)
          }
        }}
      >
        {Array.from({ length: 12 }, (_, m) => (
          <div
            key={`label-${m}`}
            className={styles.monthLabel}
            style={{ gridRow: `${m * 2 + 1} / span 2` }}
          >
            {MONTH_SHORT[m]}
          </div>
        ))}

        {rows.map((row) => (
          <div
            key={`line-${row.index}`}
            className={clsx(styles.halfRow, !row.isMonthStart && styles.dashed, row.index === 0 && styles.first)}
            style={{ gridRow: row.index + 1, gridColumn: 2 }}
          />
        ))}

        <div
          className={styles.kontextCol}
          style={{ gridRow: '1 / -1', gridColumn: 2 }}
          onMouseDown={(e) => {
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const y = e.clientY - rect.top
            const rowIndex = Math.floor((y / rect.height) * 24)
            if ((e.target as HTMLElement).closest(`.${styles.kontextBlock}`)) return
            e.preventDefault()
            setDragStart(Math.max(0, Math.min(23, rowIndex)))
            setDragEnd(Math.max(0, Math.min(23, rowIndex)))
          }}
          onMouseMove={(e) => {
            if (dragStart === null) return
            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
            const y = e.clientY - rect.top
            const rowIndex = Math.floor((y / rect.height) * 24)
            setDragEnd(Math.max(0, Math.min(23, rowIndex)))
          }}
        >
          {kontextBlocks.map(({ kontext: k, span }) => {
            const topPct = rowToPercent(span.top)
            const heightPct = rowToPercent(span.bottom) - topPct
            const isActive = activeKontextId === k.id
            const topRound = span.top > 0
            const bottomRound = span.bottom < 24

            return (
              <div
                key={k.id}
                className={clsx(
                  styles.kontextBlock,
                  isActive && styles.active,
                  topRound && bottomRound && styles.roundedBoth,
                  topRound && !bottomRound && styles.roundedTop,
                  !topRound && bottomRound && styles.roundedBottom,
                  !topRound && !bottomRound && styles.middle,
                )}
                style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 4)}%` }}
                onClick={() => navigate(`/stammkontext/${k.id}`)}
              >
                <span className={styles.kontextName}>{k.thema || '(ohne Thema)'}</span>
                <span className={styles.kontextRange}>{formatKontextRange(k)}</span>
                <button
                  type="button"
                  className={styles.kontextDeleteBtn}
                  title="Stammkontext löschen"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (window.confirm('Stammkontext wirklich löschen?')) {
                      void remove(k.id)
                      if (activeKontextId === k.id) navigate('/stammkontext')
                    }
                  }}
                >
                  <Icon name="trash" size={11} />
                </button>
              </div>
            )
          })}

          {dragSelection && (
            <div
              className={styles.dragSelection}
              style={{ top: `${dragSelection.top}%`, height: `${dragSelection.height}%` }}
            >
              <span className={styles.dragLabel}>Neuer Kontext</span>
            </div>
          )}

          {kontexte.length === 0 && !isDragging && (
            <div className={styles.emptyHint}>Ziehen zum Anlegen</div>
          )}
        </div>
      </div>

      <div className={styles.dropZoneOuter}>
        <DropZone onFileDrop={handleFileDrop}>
          <div className={styles.dropZoneArea}>
            <Icon name="upload" size={14} />
            <span>JSON-Datei hierher ziehen</span>
          </div>
        </DropZone>
      </div>

      <input ref={fileInputRef} type="file" accept=".json" onChange={handleFileInput} style={{ display: 'none' }} />

      {pendingImport && (
        <StammImportDialog
          open
          kontext={pendingImport.kontext}
          aktivitaeten={pendingImport.aktivitaeten}
          onConfirm={handleConfirmImport}
          onCancel={clearPendingImport}
        />
      )}
    </div>
  )
}
