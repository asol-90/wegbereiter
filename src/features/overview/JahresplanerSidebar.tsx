/**
 * JahresplanerSidebar — vertical year timeline for the overview page (Phase 11).
 *
 * 24 rows (2 per month). Solid grid lines at month boundaries, dashed at
 * mid-month. Drag on the timeline opens NewPlanungWizard pre-filled.
 *
 * Visual subcomponents: KontextBar, PlanungsBlock (see JahresplanerBars).
 * Drag state lives in useJahresplanerDrag.
 */
import type { PlanungId, StammKontextId } from '@/domain/ids'
import type { Planung, StammKontext } from '@/domain/types'
import { usePlanungen, usePlanungenActions } from '@/features/planungen'
import { useStammKontext } from '@/features/stammKontext'
import { ConfirmDialog } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import clsx from '@/ui/utils/clsx'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { EditPlanungModal } from './EditPlanungModal'
import { KontextBar, PlanungsBlock } from './JahresplanerBars'
import {
  MONTH_SHORT, kontextInYear, kontextRowSpan, planungInYear, planungRowSpan,
} from './jahresplanerHelpers'
import { useJahresplanerDrag } from './useJahresplanerDrag'
import { NewPlanungWizard } from './NewPlanungWizard'
import styles from './JahresplanerSidebar.module.css'

export type JahresplanerSidebarProps = {
  displayYear: number
  highlightedPlanungId?: PlanungId | null
  onPlanungHover?: (id: PlanungId | null) => void
  onKontextHover?: (id: StammKontextId | null) => void
}

type WizardState = {
  open: boolean
  initialZeitraum: { start: string; ende: string } | null
}

type KontextBarEntry = { kontext: StammKontext; span: { top: number; bottom: number } }
type PlanBlockEntry = { planung: Planung; span: { top: number; bottom: number } }

function useYearData(year: number) {
  const { loaded, planungen } = usePlanungen()
  const { kontexte } = useStammKontext()
  const yearPlanungen = useMemo(() => planungen.filter((p) => planungInYear(p, year)), [planungen, year])
  const yearKontexte = useMemo(() => kontexte.filter((k) => kontextInYear(k, year)), [kontexte, year])
  const kontextBars = useMemo<KontextBarEntry[]>(
    () => yearKontexte.map((k) => ({ kontext: k, span: kontextRowSpan(k, year) }))
      .filter((x): x is KontextBarEntry => x.span !== null),
    [yearKontexte, year],
  )
  const planBlocks = useMemo<PlanBlockEntry[]>(
    () => yearPlanungen.map((p) => ({ planung: p, span: planungRowSpan(p, year) }))
      .filter((x): x is PlanBlockEntry => x.span !== null),
    [yearPlanungen, year],
  )
  return {
    loaded, kontextBars, planBlocks,
    hasData: yearPlanungen.length > 0 || yearKontexte.length > 0,
  }
}

function MonthLabels() {
  return (
    <>
      {Array.from({ length: 12 }, (_, m) => (
        <div key={`label-${m}`} className={styles.monthLabel} style={{ gridRow: `${m * 2 + 1} / span 2` }}>
          {MONTH_SHORT[m]}
        </div>
      ))}
    </>
  )
}

function GridLines() {
  return (
    <>
      {Array.from({ length: 24 }, (_, i) => (
        <div
          key={`line-${i}`}
          className={clsx(styles.halfRow, i % 2 !== 0 && styles.dashed, i === 0 && styles.first)}
          style={{ gridRow: i + 1, gridColumn: '2 / -1' }}
        />
      ))}
    </>
  )
}

type TimelineProps = {
  kontextBars: KontextBarEntry[]
  planBlocks: PlanBlockEntry[]
  highlightedPlanungId?: PlanungId | null
  hasData: boolean
  loaded: boolean
  drag: ReturnType<typeof useJahresplanerDrag>
  navigate: (path: string) => void
  onPlanungHover?: (id: PlanungId | null) => void
  onKontextHover?: (id: StammKontextId | null) => void
  onEditPlanung: (p: Planung) => void
  onDeletePlanung: (p: Planung) => void
}

function Timeline({
  kontextBars, planBlocks, highlightedPlanungId, hasData, loaded, drag,
  navigate, onPlanungHover, onKontextHover, onEditPlanung, onDeletePlanung,
}: TimelineProps) {
  return (
    <div className={styles.timeline}>
      <MonthLabels />
      <GridLines />

      <div className={styles.kontextCol} style={{ gridRow: '1 / -1', gridColumn: 2 }}>
        {kontextBars.map(({ kontext, span }) => (
          <KontextBar key={kontext.id} kontext={kontext} span={span}
            onHover={onKontextHover} onPlanungHover={onPlanungHover} />
        ))}
      </div>

      <div className={styles.planCol} style={{ gridRow: '1 / -1', gridColumn: 3 }}
        onMouseDown={drag.handleColMouseDown} onMouseMove={drag.handleColMouseMove}>
        {planBlocks.map(({ planung, span }) => (
          <PlanungsBlock key={planung.id} planung={planung} span={span}
            isHighlighted={highlightedPlanungId === planung.id}
            isDimmed={!!highlightedPlanungId && highlightedPlanungId !== planung.id}
            onClick={() => navigate(`/planung/${planung.id}/kalender`)}
            onHover={onPlanungHover}
            onEdit={onEditPlanung} onDelete={onDeletePlanung}
          />
        ))}
        {drag.selection && (
          <div className={styles.dragSelection}
            style={{ top: `${drag.selection.top}%`, height: `${drag.selection.height}%` }}>
            <span className={styles.dragLabel}>Neue Planung</span>
          </div>
        )}
        {loaded && !hasData && !drag.isDragging && (
          <div className={styles.emptyHint}>Ziehen um eine Planung anzulegen</div>
        )}
      </div>
    </div>
  )
}

export function JahresplanerSidebar({
  displayYear, highlightedPlanungId, onPlanungHover, onKontextHover,
}: JahresplanerSidebarProps) {
  const { remove: removePlanung, update: updatePlanung } = usePlanungenActions()
  const navigate = useNavigate()

  const [deleteTarget, setDeleteTarget] = useState<Planung | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [editTarget, setEditTarget] = useState<Planung | null>(null)
  const [wizard, setWizard] = useState<WizardState>({ open: false, initialZeitraum: null })

  const drag = useJahresplanerDrag({
    year: displayYear,
    onZeitraumSelected: (range) => setWizard({ open: true, initialZeitraum: range }),
  })
  const { loaded, kontextBars, planBlocks, hasData } = useYearData(displayYear)

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget || deleting) return
    setDeleting(true)
    try { await removePlanung(deleteTarget.id); setDeleteTarget(null) }
    finally { setDeleting(false) }
  }, [deleteTarget, deleting, removePlanung])

  return (
    <div className={styles.root} onMouseUp={drag.handleMouseUp} onMouseLeave={drag.handleMouseLeave}>
      <div className={styles.header}>
        <span className={styles.sectionLabel}>Planungen & Kontext</span>
        <div className={styles.headerActions}>
          <button type="button" className={styles.splitMain}
            onClick={() => setWizard({ open: true, initialZeitraum: null })}>
            <Icon name="plus" size={12} />
            <span>Neu</span>
          </button>
        </div>
      </div>

      <Timeline
        kontextBars={kontextBars} planBlocks={planBlocks}
        highlightedPlanungId={highlightedPlanungId}
        hasData={hasData} loaded={loaded} drag={drag} navigate={navigate}
        onPlanungHover={onPlanungHover} onKontextHover={onKontextHover}
        onEditPlanung={setEditTarget} onDeletePlanung={setDeleteTarget}
      />

      <NewPlanungWizard
        open={wizard.open}
        onClose={() => setWizard({ open: false, initialZeitraum: null })}
        onCreated={(p) => navigate(`/planung/${p.id}/kalender`)}
        initialZeitraum={wizard.initialZeitraum ?? undefined}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onCancel={() => !deleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title="Planung löschen?"
        description={deleteTarget
          ? <>Die Planung „<strong>{deleteTarget.name}</strong>" und alle zugehörigen Treffen werden unwiederbringlich gelöscht.</>
          : ''}
        confirmLabel="Löschen" cancelLabel="Abbrechen" tone="danger" loading={deleting}
      />

      <EditPlanungModal
        target={editTarget}
        onSave={async (updated) => { await updatePlanung(updated); setEditTarget(null) }}
        onClose={() => setEditTarget(null)}
      />
    </div>
  )
}
