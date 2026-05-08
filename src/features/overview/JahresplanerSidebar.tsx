/**
 * JahresplanerSidebar — vertical year timeline for the overview page (Phase 11).
 *
 * Replaces the former Planungsliste. Shows 12 months distributed over the full
 * panel height, with a narrow Kontext column (Stammkontext coverage) and a wide
 * Planungs column (colored blocks per Planung).
 *
 * Layout:
 *   ┌─────┬────┬─────────────────────────┐
 *   │ Mon │ Ctx│  Planungs-Blöcke        │  ← repeats for each half-month
 *   └─────┴────┴─────────────────────────┘
 *
 * 24 rows (2 per month: top = 1st–15th, bottom = 16th–end). Solid grid lines
 * at month boundaries, dashed at mid-month.
 *
 * Features:
 * - Planungs-Blöcke with cross-hover (highlight matching Planung in Jahreskalender)
 * - Kontext-Balken with info icon + hover tooltip
 * - Drag gesture over empty rows to create a new Planung
 * - Split button (Neue Planung / Kontext laden) + DropZone
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { ContextMenu, ConfirmDialog, IconButton, Modal, Input, Button, type MenuItem } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import { usePlanungen, usePlanungenActions } from '@/features/planungen'
import { useStammKontext, useStammKontextActions } from '@/features/stammKontext'
import type { PlanungId, StammKontextId } from '@/domain/ids'
import type { Planung, StammKontext, Aktivitaet } from '@/domain/types'
import { parseIso, isoToday } from '@/domain/dateUtils'
import { parseStammDatei, StammParseError, detectFileType } from '@/domain/stammParser'
import { checkOverlap, clipKontext } from '@/domain/stammOverlap'
import { repertoireStore } from '@/features/repertoire/repertoireStore'
import { NewPlanungWizard } from './NewPlanungWizard'
import { StammImportDialog } from './StammImportDialog'
import { DropZone } from './DropZone'
import clsx from '@/ui/utils/clsx'
import styles from './JahresplanerSidebar.module.css'

// ─── Constants ───────────────────────────────────────────────────────────────

const MONTH_SHORT = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'] as const

/* All Planungen share the same purple accent — no multi-color palette. */

// ─── Types ───────────────────────────────────────────────────────────────────

export type JahresplanerSidebarProps = {
  displayYear: number
  highlightedPlanungId?: PlanungId | null
  onPlanungHover?: (id: PlanungId | null) => void
  /** Called when Kontext bar is hovered — triggers cross-hover in Jahreskalender. */
  onKontextHover?: (id: StammKontextId | null) => void
}

// ─── Geometry helpers ────────────────────────────────────────────────────────

/**
 * Convert an ISO date into a fractional row index (0–24) within a year.
 * Row 0 = Jan 1, Row 2 = Feb 1, etc. Mid-month (row 1) = Jan 16.
 */
function dateToRow(iso: string, year: number): number {
  const d = parseIso(iso)
  const m = d.getMonth() // 0-based
  const day = d.getDate()
  const daysInMonth = new Date(year, m + 1, 0).getDate()
  // Each month is 2 rows. Map day 1 → row m*2, day last → row (m+1)*2
  return m * 2 + ((day - 1) / (daysInMonth - 1)) * 2
}

/**
 * Convert a row index (0–24) to a % position within the timeline.
 */
function rowToPercent(row: number): number {
  return (row / 24) * 100
}

/** Does a Planung have any Treffen in the given year, or does its zeitraum overlap it? */
function planungInYear(p: Planung, year: number): boolean {
  const prefix = `${year}`
  if (p.treffen.some((t) => t.datum.startsWith(prefix))) return true
  return p.zeitraum.start <= `${year}-12-31` && p.zeitraum.ende >= `${year}-01-01`
}

/** Does a Kontext have data in the given year? */
function kontextInYear(k: StammKontext, year: number): boolean {
  const prefix = `${year}`
  return (
    k.treffen.some((t) => t.datum.startsWith(prefix)) ||
    k.stammaktionen.some((a) => a.beginn.startsWith(prefix) || a.ende.startsWith(prefix))
  )
}

/**
 * Compute the top/bottom row for a Kontext's coverage in the given year.
 * Returns the earliest and latest dates as row indices.
 */
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
  // Extend to month boundaries for visual cleanliness
  const firstMonth = parseInt(first.slice(5, 7), 10) - 1
  const lastMonth = parseInt(last.slice(5, 7), 10) - 1
  return {
    top: firstMonth * 2,
    bottom: (lastMonth + 1) * 2,
  }
}

/**
 * Compute the top/bottom row for a Planung in the given year.
 * Uses actual zeitraum start/end, clamped to the year.
 */
function planungRowSpan(p: Planung, year: number): { top: number; bottom: number } | null {
  if (!planungInYear(p, year)) return null
  const yearStart = `${year}-01-01`
  const yearEnd = `${year}-12-31`
  const clampedStart = p.zeitraum.start < yearStart ? yearStart : p.zeitraum.start
  const clampedEnd = p.zeitraum.ende > yearEnd ? yearEnd : p.zeitraum.ende
  return {
    top: dateToRow(clampedStart, year),
    bottom: dateToRow(clampedEnd, year),
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

// ─── Component ───────────────────────────────────────────────────────────────

export function JahresplanerSidebar({
  displayYear,
  highlightedPlanungId,
  onPlanungHover,
  onKontextHover,
}: JahresplanerSidebarProps) {
  const { loaded, planungen } = usePlanungen()
  const { remove: removePlanung, update: updatePlanung } = usePlanungenActions()
  const { kontexte } = useStammKontext()
  const stammActions = useStammKontextActions()
  const navigate = useNavigate()

  // ── Delete / edit state ──
  const [deleteTarget, setDeleteTarget] = useState<Planung | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<Planung | null>(null)
  const [editName, setEditName] = useState('')

  // ── Wizard / import state ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [wizardInitialZeitraum, setWizardInitialZeitraum] = useState<{
    start: string
    ende: string
  } | null>(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<{
    kontext: StammKontext
    aktivitaeten: Aktivitaet[]
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Drag state ──
  const [dragStart, setDragStart] = useState<number | null>(null)
  const [dragEnd, setDragEnd] = useState<number | null>(null)
  const isDragging = dragStart !== null && dragEnd !== null

  // ── Filtered data ──
  const yearPlanungen = useMemo(
    () => planungen.filter((p) => planungInYear(p, displayYear)),
    [planungen, displayYear],
  )
  const yearKontexte = useMemo(
    () => kontexte.filter((k) => kontextInYear(k, displayYear)),
    [kontexte, displayYear],
  )

  // ── File handling (mirrored from Planungsliste) ──
  const handleFileDrop = useCallback((content: string, _fileName: string) => {
    setParseError(null)
    const fileType = detectFileType(content)
    if (fileType === 'stammkontext') {
      try {
        const result = parseStammDatei(content)
        setPendingImport(result)
      } catch (e) {
        setParseError(
          e instanceof StammParseError
            ? e.message
            : 'Die Datei konnte nicht gelesen werden.',
        )
      }
    } else {
      setParseError('Unbekanntes Dateiformat. Erwartet: Stammkontext-JSON.')
    }
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleFileDrop(reader.result, file.name)
        }
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [handleFileDrop],
  )

  const handleConfirmImport = useCallback(async () => {
    if (!pendingImport) return
    const { kontext: incoming, aktivitaeten: incomingAktivitaeten } = pendingImport
    for (const existing of kontexte) {
      const result = checkOverlap(existing, incoming)
      if (result.kind === 'overlap') {
        const clipped = clipKontext(existing, result.overlapStart)
        if (clipped) {
          await stammActions.update(clipped)
        } else {
          await stammActions.remove(existing.id)
        }
      }
    }
    await stammActions.importKontext(incoming)
    for (const a of incomingAktivitaeten) {
      await repertoireStore.saveAktivitaet(a)
    }
    setPendingImport(null)
  }, [pendingImport, kontexte, stammActions])

  // ── Drag handling ──
  const handleRowMouseDown = useCallback(
    (halfMonthIndex: number, e: React.MouseEvent) => {
      // Only start drag in the plan column area (not on existing blocks)
      if ((e.target as HTMLElement).closest(`.${styles.planBlock}`)) return
      e.preventDefault()
      setDragStart(halfMonthIndex)
      setDragEnd(halfMonthIndex)
    },
    [],
  )

  const handleRowMouseEnter = useCallback(
    (halfMonthIndex: number) => {
      if (dragStart !== null) {
        setDragEnd(halfMonthIndex)
      }
    },
    [dragStart],
  )

  const handleMouseUp = useCallback(() => {
    if (dragStart !== null && dragEnd !== null) {
      const minRow = Math.min(dragStart, dragEnd)
      const maxRow = Math.max(dragStart, dragEnd)
      // Convert half-month rows back to months
      const startMonth = Math.floor(minRow / 2) // 0-based month
      const endMonth = Math.floor(maxRow / 2)
      // Need at least 1 month span
      if (endMonth >= startMonth) {
        const startDay = minRow % 2 === 0 ? '01' : '15'
        const endDay = maxRow % 2 === 0 ? '15' : new Date(displayYear, endMonth + 1, 0).getDate().toString().padStart(2, '0')
        const start = `${displayYear}-${(startMonth + 1).toString().padStart(2, '0')}-${startDay}`
        const ende = `${displayYear}-${(endMonth + 1).toString().padStart(2, '0')}-${endDay}`
        setWizardInitialZeitraum({ start, ende })
        setDialogOpen(true)
      }
    }
    setDragStart(null)
    setDragEnd(null)
  }, [dragStart, dragEnd, displayYear])

  // ── Menu ──
  const menuItems: MenuItem[] = [
    {
      id: 'planung',
      label: 'Neue Planung',
      icon: 'plus',
      onSelect: () => {
        setWizardInitialZeitraum(null)
        setDialogOpen(true)
      },
    },
    {
      id: 'kontext',
      label: 'Kontext laden',
      icon: 'upload',
      onSelect: () => fileInputRef.current?.click(),
    },
  ]

  // ── Delete / Edit handlers ──
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try {
      await removePlanung(deleteTarget.id)
      setDeleteTarget(null)
    } finally {
      setDeleting(false)
    }
  }, [deleteTarget, deleting, removePlanung])

  const handleEditOpen = useCallback((p: Planung) => {
    setEditTarget(p)
    setEditName(p.name)
  }, [])

  const handleEditSave = useCallback(async () => {
    if (!editTarget) return
    const updated: Planung = {
      ...editTarget,
      name: editName.trim() || editTarget.name,
      aktualisiertAm: new Date().toISOString() as Planung['aktualisiertAm'],
    }
    await updatePlanung(updated)
    setEditTarget(null)
  }, [editTarget, editName, updatePlanung])

  // ── Build timeline rows ──
  // 24 rows: 0=Jan top, 1=Jan mid, 2=Feb top, 3=Feb mid, ...
  const rows = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => ({
      index: i,
      monthIndex: Math.floor(i / 2),
      isMonthStart: i % 2 === 0,
    }))
  }, [])

  // ── Kontext bar positions ──
  const kontextBars = useMemo(() => {
    return yearKontexte.map((k) => {
      const span = kontextRowSpan(k, displayYear)
      return { kontext: k, span }
    }).filter((x): x is { kontext: StammKontext; span: { top: number; bottom: number } } => x.span !== null)
  }, [yearKontexte, displayYear])

  // ── Planungs block positions ──
  const planBlocks = useMemo(() => {
    return yearPlanungen.map((p) => {
      const span = planungRowSpan(p, displayYear)
      return { planung: p, span }
    }).filter((x): x is { planung: Planung; span: { top: number; bottom: number } } => x.span !== null)
  }, [yearPlanungen, displayYear])

  // ── Drag selection visual ──
  const dragSelection = useMemo(() => {
    if (dragStart === null || dragEnd === null) return null
    const min = Math.min(dragStart, dragEnd)
    const max = Math.max(dragStart, dragEnd)
    return {
      top: rowToPercent(min),
      height: rowToPercent(max + 1) - rowToPercent(min),
    }
  }, [dragStart, dragEnd])

  const hasData = yearPlanungen.length > 0 || yearKontexte.length > 0

  return (
    <DropZone onFileDrop={handleFileDrop}>
      <div
        className={styles.root}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          if (isDragging) {
            setDragStart(null)
            setDragEnd(null)
          }
        }}
      >
        {/* Header */}
        <div className={styles.header}>
          <span className={styles.sectionLabel}>Planungen & Kontext</span>
          <div className={styles.headerActions}>
            <div className={styles.splitBtn}>
              <button
                type="button"
                className={styles.splitMain}
                onClick={() => {
                  setWizardInitialZeitraum(null)
                  setDialogOpen(true)
                }}
              >
                <Icon name="plus" size={12} />
                <span>Neu</span>
              </button>
              <button
                type="button"
                className={styles.splitChevron}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setMenuAnchor({ x: rect.right, y: rect.bottom + 4 })
                  setMenuOpen((prev) => !prev)
                }}
                aria-label="Weitere Optionen"
              >
                <Icon name="chevron-down" size={12} />
              </button>
            </div>
            {menuOpen && menuAnchor && (
              <ContextMenu
                open={menuOpen}
                sections={[{ id: 'main', items: menuItems }]}
                position={menuAnchor}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>

        {/* Error banner */}
        {parseError && (
          <div className={styles.error}>
            <span>{parseError}</span>
            <button
              className={styles.errorDismiss}
              onClick={() => setParseError(null)}
              aria-label="Schließen"
            >
              ×
            </button>
          </div>
        )}

        {/* Timeline */}
        <div className={styles.timeline}>
          {/* Month labels — one per month, spanning 2 rows */}
          {Array.from({ length: 12 }, (_, m) => (
            <div
              key={`label-${m}`}
              className={styles.monthLabel}
              style={{ gridRow: `${m * 2 + 1} / span 2` }}
            >
              {MONTH_SHORT[m]}
            </div>
          ))}

          {/* Grid lines — one per half-month row */}
          {rows.map((row) => (
            <div
              key={`line-${row.index}`}
              className={clsx(
                styles.halfRow,
                !row.isMonthStart && styles.dashed,
                row.index === 0 && styles.first,
              )}
              style={{ gridRow: row.index + 1, gridColumn: '2 / -1' }}
            />
          ))}

          {/* Kontext bars (absolute positioned within the ctx column area) */}
          {/* We use a single relative container spanning all ctx rows */}
          <div
            className={styles.kontextCol}
            style={{ gridRow: '1 / -1', gridColumn: 2 }}
          >
            {kontextBars.map(({ kontext: k, span }) => {
              const topPct = rowToPercent(span.top)
              const heightPct = rowToPercent(span.bottom) - topPct
              const isTop = span.top === 0
              const isBottom = span.bottom === 24
              const isSingle = span.bottom - span.top <= 2

              let roundClass = styles.middle
              if (isSingle) roundClass = styles.roundedBoth
              else if (isTop && isBottom) roundClass = styles.middle
              else if (isTop) roundClass = '' // no top rounding if starts at very top
              else if (isBottom) roundClass = styles.roundedBottom
              else roundClass = styles.roundedBoth

              // Default: both ends rounded unless at boundaries
              if (!isTop && !isBottom) roundClass = styles.roundedBoth
              if (!isTop && isBottom) roundClass = styles.roundedTop
              if (isTop && !isBottom) roundClass = styles.roundedBottom
              if (isTop && isBottom) roundClass = ''

              // Simpler logic: always round both ends
              const topRound = span.top > 0
              const bottomRound = span.bottom < 24

              return (
                <div
                  key={k.id}
                  className={clsx(
                    styles.kontextBar,
                    topRound && bottomRound && styles.roundedBoth,
                    topRound && !bottomRound && styles.roundedTop,
                    !topRound && bottomRound && styles.roundedBottom,
                    !topRound && !bottomRound && styles.middle,
                  )}
                  style={{
                    top: `${topPct}%`,
                    height: `${heightPct}%`,
                  }}
                  onMouseEnter={() => {
                    onKontextHover?.(k.id)
                    onPlanungHover?.(null)
                  }}
                  onMouseLeave={() => onKontextHover?.(null)}
                >
                  <div className={styles.kontextTooltip}>
                    <div className={styles.kontextTooltipTitle}>{k.thema}</div>
                    <div className={styles.kontextTooltipRange}>
                      {formatKontextRange(k)}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Planungs blocks (absolute positioned within the plan column area) */}
          <div
            className={styles.planCol}
            style={{ gridRow: '1 / -1', gridColumn: 3 }}
            onMouseDown={(e) => {
              // Determine which half-month row was clicked
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const y = e.clientY - rect.top
              const rowIndex = Math.floor((y / rect.height) * 24)
              handleRowMouseDown(Math.max(0, Math.min(23, rowIndex)), e)
            }}
            onMouseMove={(e) => {
              if (dragStart === null) return
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const y = e.clientY - rect.top
              const rowIndex = Math.floor((y / rect.height) * 24)
              handleRowMouseEnter(Math.max(0, Math.min(23, rowIndex)))
            }}
          >
            {planBlocks.map(({ planung: p, span }) => {
              const topPct = rowToPercent(span.top)
              const heightPct = rowToPercent(span.bottom) - topPct
              const isHighlighted = highlightedPlanungId === p.id
              const isDimmed = highlightedPlanungId !== null && highlightedPlanungId !== p.id
              const isDraft = p.status === 'entwurf'

              return (
                <div
                  key={p.id}
                  className={clsx(
                    styles.planBlock,
                    isHighlighted && styles.highlighted,
                    isDimmed && styles.dimmed,
                  )}
                  style={{
                    top: `${topPct}%`,
                    height: `${Math.max(heightPct, 4)}%`,
                  }}
                  onClick={() => navigate(`/planung/${p.id}/kalender`)}
                  onMouseEnter={() => onPlanungHover?.(p.id)}
                  onMouseLeave={() => onPlanungHover?.(null)}
                >
                  <div className={clsx(
                    styles.planStripe,
                    isDraft ? styles.planStripeDraft : styles.planStripeFinal,
                  )} />
                  <div className={styles.planHeader}>
                    <span className={styles.planName}>{p.name}</span>
                    <div className={styles.planActions}>
                      <IconButton
                        icon="edit"
                        label={`Planung „${p.name}" bearbeiten`}
                        size={11}
                        shape="circle"
                        className={styles.planActionBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleEditOpen(p)
                        }}
                      />
                      <IconButton
                        icon="trash"
                        label={`Planung „${p.name}" löschen`}
                        tone="danger"
                        size={11}
                        shape="circle"
                        className={styles.planActionBtn}
                        onClick={(e) => {
                          e.stopPropagation()
                          setDeleteTarget(p)
                        }}
                      />
                    </div>
                  </div>
                  <span className={styles.planMeta}>
                    {p.treffen.length} Treffen
                  </span>
                </div>
              )
            })}

            {/* Drag selection overlay */}
            {dragSelection && (
              <div
                className={styles.dragSelection}
                style={{
                  top: `${dragSelection.top}%`,
                  height: `${dragSelection.height}%`,
                }}
              >
                <span className={styles.dragLabel}>Neue Planung</span>
              </div>
            )}

            {/* Empty state */}
            {loaded && !hasData && !isDragging && (
              <div className={styles.emptyHint}>
                Ziehen um eine Planung anzulegen
              </div>
            )}
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {/* Import preview dialog */}
        {pendingImport && (
          <StammImportDialog
            open
            kontext={pendingImport.kontext}
            aktivitaeten={pendingImport.aktivitaeten}
            onConfirm={handleConfirmImport}
            onCancel={() => setPendingImport(null)}
          />
        )}

        <NewPlanungWizard
          open={dialogOpen}
          onClose={() => {
            setDialogOpen(false)
            setWizardInitialZeitraum(null)
          }}
          onCreated={(p) => navigate(`/planung/${p.id}/kalender`)}
          initialZeitraum={wizardInitialZeitraum ?? undefined}
        />

        {/* Delete confirmation */}
        <ConfirmDialog
          open={!!deleteTarget}
          onCancel={() => !deleting && setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Planung löschen?"
          description={
            deleteTarget ? (
              <>
                Die Planung „<strong>{deleteTarget.name}</strong>" und alle
                zugehörigen Treffen werden unwiederbringlich gelöscht.
              </>
            ) : ''
          }
          confirmLabel="Löschen"
          cancelLabel="Abbrechen"
          tone="danger"
          loading={deleting}
        />

        {/* Edit dialog — name + goals from initialization */}
        <Modal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          title="Planung bearbeiten"
          size="sm"
          footer={
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <Button variant="ghost" onClick={() => setEditTarget(null)}>
                Abbrechen
              </Button>
              <Button variant="primary" onClick={handleEditSave}>
                Speichern
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Input
              label="Name der Planung"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />
          </div>
        </Modal>
      </div>
    </DropZone>
  )
}
