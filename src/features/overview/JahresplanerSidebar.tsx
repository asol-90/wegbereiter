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
 * Drag on the timeline opens the NewPlanungWizard pre-filled with the selected range.
 */
import {parseIso} from '@/domain/dateUtils'
import type {PlanungId, StammKontextId} from '@/domain/ids'
import type {Planung, StammKontext} from '@/domain/types'
import {usePlanungen, usePlanungenActions} from '@/features/planungen'
import {useStammKontext} from '@/features/stammKontext'
import {Button, ConfirmDialog, IconButton, Input, Modal} from '@/ui/primitives'
import {Icon} from '@/ui/primitives/Icon'
import clsx from '@/ui/utils/clsx'
import {format} from 'date-fns'
import {de} from 'date-fns/locale'
import {useCallback, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import styles from './JahresplanerSidebar.module.css'
import {NewPlanungWizard} from './NewPlanungWizard'

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
  const navigate = useNavigate()

  // ── Delete / edit state ──
  const [deleteTarget, setDeleteTarget] = useState<Planung | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<Planung | null>(null)
  const [editName, setEditName] = useState('')

  // ── Wizard state ──
  const [dialogOpen, setDialogOpen] = useState(false)
  const [wizardInitialZeitraum, setWizardInitialZeitraum] = useState<{
    start: string
    ende: string
  } | null>(null)

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

  // ── Drag handling ──
  const handleRowMouseDown = useCallback(
    (halfMonthIndex: number, e: React.MouseEvent) => {
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
      const startMonth = Math.floor(minRow / 2)
      const endMonth = Math.floor(maxRow / 2)
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
        </div>
      </div>

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
              <div className={styles.emptyHint}>Ziehen um eine Planung anzulegen</div>
            )}
          </div>
        </div>

        <NewPlanungWizard
            open={dialogOpen}
            onClose={() => {
              setDialogOpen(false)
              setWizardInitialZeitraum(null)
            }}
            onCreated={(p) => navigate(`/planung/${p.id}/kalender`)}
            initialZeitraum={wizardInitialZeitraum ?? undefined}
          />

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
  )
}
