/**
 * AbwesenheitsSidebar — vertical timeline with one column per team member.
 *
 * Layout: month labels + treffen column (small diamonds) + one column per
 * member. Horizontal lines: dashed per KW, solid at month boundaries.
 * Avatars as column headers.
 *
 * The actual rendering, drag logic and per-member popover live in
 * AbwesenheitsTimeline, useAbwesenheitsDrag, and MemberPopover respectively.
 */
import { useCallback, useMemo, useRef } from 'react'
import { type AbwesenheitId, type MitarbeiterId } from '@/domain/ids'
import type { Abwesenheit, IsoDate, Mitarbeiter, Planung } from '@/domain/types'
import { Button } from '@/ui/primitives'
import { AbwesenheitsAvatarRow } from './AbwesenheitsAvatarRow'
import { AbwesenheitsTimeline } from './AbwesenheitsTimeline'
import { buildWeekRows } from './abwesenheitsHelpers'
import { useAbwesenheitsDrag } from './useAbwesenheitsDrag'
import styles from './AbwesenheitsSidebar.module.css'

export type AbwesenheitsSidebarProps = {
  planung: Planung
  onUpdate: (abwesenheiten: Abwesenheit[]) => void
  onTeamUpdate?: (team: Mitarbeiter[]) => void
  onNavigateToList?: () => void
  hoveredTreffenDatum?: IsoDate | null
  onAbwesenheitHover?: (abwesenheit: Abwesenheit | null) => void
}

function EmptyState() {
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

export function AbwesenheitsSidebar({
  planung, onUpdate, onTeamUpdate, onNavigateToList, hoveredTreffenDatum, onAbwesenheitHover,
}: AbwesenheitsSidebarProps) {
  const { team, abwesenheiten, zeitraum, treffen } = planung

  const weekRows = useMemo(() => buildWeekRows(zeitraum.start, zeitraum.ende), [zeitraum.start, zeitraum.ende])
  const membersAreaRef = useRef<HTMLDivElement>(null)

  const drag = useAbwesenheitsDrag({
    abwesenheiten, weekRows, zeitraum,
    containerRef: membersAreaRef,
    onUpdate, onAbwesenheitHover,
  })

  const handleDelete = useCallback(
    (absId: AbwesenheitId) => {
      onAbwesenheitHover?.(null)
      onUpdate(abwesenheiten.filter((a) => a.id !== absId))
    },
    [abwesenheiten, onUpdate, onAbwesenheitHover],
  )

  const handleAbsenceCleanup = useCallback(
    (deletedMemberId: MitarbeiterId) => {
      onUpdate(abwesenheiten.filter((a) => a.mitarbeiterId !== deletedMemberId))
    },
    [abwesenheiten, onUpdate],
  )

  const absentOnHoveredDate = useMemo(() => {
    if (!hoveredTreffenDatum) return new Set<MitarbeiterId>()
    return new Set(
      abwesenheiten
        .filter((a) => a.von <= hoveredTreffenDatum && a.bis >= hoveredTreffenDatum)
        .map((a) => a.mitarbeiterId),
    )
  }, [abwesenheiten, hoveredTreffenDatum])

  if (team.length === 0) return <EmptyState />

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.headerLabel}>Abwesenheiten</span>
      </div>
      <AbwesenheitsAvatarRow
        team={team}
        absentOnHoveredDate={absentOnHoveredDate}
        onTeamUpdate={onTeamUpdate}
        onAbsenceCleanup={handleAbsenceCleanup}
      />
      <AbwesenheitsTimeline
        team={team}
        abwesenheiten={abwesenheiten}
        treffen={treffen}
        weekRows={weekRows}
        zeitraum={zeitraum}
        hoveredTreffenDatum={hoveredTreffenDatum}
        drag={drag}
        containerRef={membersAreaRef}
        onDelete={handleDelete}
        onHover={onAbwesenheitHover}
      />
      {onNavigateToList && (
        <div className={styles.footer}>
          <Button variant="secondary" size="sm" fullWidth onClick={onNavigateToList}>
            Weiter zur Detailplanung
          </Button>
        </div>
      )}
    </div>
  )
}
