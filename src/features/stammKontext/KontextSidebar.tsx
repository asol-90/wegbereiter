/**
 * KontextSidebar — vertical year timeline for the Stammkontext overview.
 *
 * Shows existing Kontexte as clickable blocks. Drag to create a new Kontext.
 * A DropZone at the bottom accepts JSON import files.
 */
import type {StammKontextId} from '@/domain/ids'
import type {StammKontext} from '@/domain/types'
import {DropZone} from '@/features/overview/DropZone'
import {StammImportDialog} from '@/features/overview/StammImportDialog'
import {Icon} from '@/ui/primitives/Icon'
import clsx from '@/ui/utils/clsx'
import {useMemo} from 'react'
import {useNavigate} from 'react-router-dom'
import {KontextBlock} from './KontextBlock'
import {kontextInYear, kontextRowSpan} from './kontextBlockHelpers'
import styles from './KontextSidebar.module.css'
import {useKontextDragSelect} from './useKontextDragSelect'
import {useStammImport} from './useStammImport'
import {useStammKontext} from './useStammKontext'

const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const

export type KontextSidebarProps = {
  displayYear: number
  activeKontextId?: StammKontextId | null
  onDragComplete: (start: string, ende: string) => void
}

function rowIndexFromY(e: React.MouseEvent): number {
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const y = e.clientY - rect.top
  return Math.floor((y / rect.height) * 24)
}

export function KontextSidebar({ displayYear, activeKontextId, onDragComplete }: KontextSidebarProps) {
  const { kontexte, remove } = useStammKontext()
  const navigate = useNavigate()
  const {
    fileInputRef, parseError, pendingImport,
    handleFileDrop, handleFileInput, triggerFileSelect,
    handleConfirmImport, clearPendingImport, clearError,
  } = useStammImport()
  const {
    dragStart, dragSelection, isDragging,
    handleMouseDown, handleMouseMove, handleMouseUp, reset,
  } = useKontextDragSelect({ displayYear, onDragComplete })

  const yearKontexte = useMemo(
    () => kontexte.filter((k) => kontextInYear(k, displayYear)),
    [kontexte, displayYear],
  )

  const rows = useMemo(
    () => Array.from({ length: 24 }, (_, i) => ({ index: i, isMonthStart: i % 2 === 0 })),
    [],
  )

  const kontextBlocks = useMemo(() => {
    return yearKontexte
      .map((k) => ({ kontext: k, span: kontextRowSpan(k, displayYear) }))
      .filter((x): x is { kontext: StammKontext; span: { top: number; bottom: number } } => x.span !== null)
  }, [yearKontexte, displayYear])

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
        onMouseLeave={() => { if (isDragging) reset() }}
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
            if ((e.target as HTMLElement).closest(`.${styles.kontextBlock}`)) return
            e.preventDefault()
            handleMouseDown(rowIndexFromY(e))
          }}
          onMouseMove={(e) => {
            if (dragStart === null) return
            handleMouseMove(rowIndexFromY(e))
          }}
        >
          {kontextBlocks.map(({ kontext: k, span }) => (
            <KontextBlock
              key={k.id}
              kontext={k}
              span={span}
              isActive={activeKontextId === k.id}
              onOpen={() => navigate(`/stammkontext/${k.id}`)}
              onDelete={() => {
                void remove(k.id)
                if (activeKontextId === k.id) navigate('/stammkontext')
              }}
            />
          ))}

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
