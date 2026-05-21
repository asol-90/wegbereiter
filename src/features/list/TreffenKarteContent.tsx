/**
 * TreffenKarteContent — right column of TreffenKarte: notiz, programmpunkte
 * (with dnd-kit sortable), Stamm-Anfangs-/End-Blöcke, Add-Button und Zeitbalken.
 */
import { useCallback, useMemo } from 'react'
import {
  DndContext, closestCenter, KeyboardSensor, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import type { ProgrammpunktId, TreffenId } from '@/domain/ids'
import type { Mitarbeiter, Treffen } from '@/domain/types'
import { DurationBar } from '@/ui/domain/DurationBar'
import { Icon } from '@/ui/primitives/Icon'
import { SortableProgrammpunktRow, StammBlockRow } from './SortableProgrammpunktRow'
import { TreffenKarteNote } from './TreffenKarteNote'
import type { StammBlocksForTreffen, TreffenMutations } from './treffenKarteTypes'
import styles from './TreffenKarte.module.css'

export type TreffenKarteContentProps = {
  treffen: Treffen
  tid: TreffenId
  team: Mitarbeiter[]
  mutations: TreffenMutations
  stammBlocks?: StammBlocksForTreffen
  stammMinTotal: number
  ist: number
  dauerMinuten: number
  targetRange: [number, number]
  onAddClick: (tid: TreffenId) => void
  onKonkretisieren?: TreffenKarteContentProps_OnKonkretisieren
}

type TreffenKarteContentProps_OnKonkretisieren = NonNullable<
  React.ComponentProps<typeof SortableProgrammpunktRow>['onKonkretisieren']
>

export function TreffenKarteContent({
  treffen, tid, team, mutations,
  stammBlocks, stammMinTotal, ist, dauerMinuten, targetRange,
  onAddClick, onKonkretisieren,
}: TreffenKarteContentProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )
  const ppIds = useMemo(() => treffen.programm.map((p) => p.id), [treffen.programm])
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIdx = ppIds.indexOf(active.id as ProgrammpunktId)
      const newIdx = ppIds.indexOf(over.id as ProgrammpunktId)
      if (oldIdx < 0 || newIdx < 0) return
      mutations.reorderProgrammpunkte(tid, arrayMove(ppIds, oldIdx, newIdx))
    },
    [ppIds, mutations, tid],
  )

  return (
    <div className={styles.content}>
      <TreffenKarteNote treffen={treffen} tid={tid} mutations={mutations} />
      {stammBlocks && stammBlocks.anfangsBlock.length > 0 && (
        <div className={styles.points}>
          {stammBlocks.anfangsBlock.map((b, i) => (
            <StammBlockRow key={`sa-${i}`} block={b} />
          ))}
        </div>
      )}
      {treffen.programm.length > 0 && (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={ppIds} strategy={verticalListSortingStrategy}>
            <div className={styles.points}>
              {treffen.programm.map((pp) => (
                <SortableProgrammpunktRow
                  key={pp.id}
                  pp={pp}
                  team={team}
                  treffenId={tid}
                  mutations={mutations}
                  onKonkretisieren={onKonkretisieren}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
      <button className={styles.add} onClick={() => onAddClick(tid)}>
        <Icon name="plus" size={13} />
        Punkt hinzufügen
      </button>
      {stammBlocks && stammBlocks.endBlock.length > 0 && (
        <div className={styles.points}>
          {stammBlocks.endBlock.map((b, i) => (
            <StammBlockRow key={`se-${i}`} block={b} />
          ))}
        </div>
      )}
      <div className={styles.barRow}>
        <DurationBar
          ist={ist}
          verfuegbar={dauerMinuten}
          targetRange={targetRange}
          stammMin={stammMinTotal}
          showLabel
        />
      </div>
    </div>
  )
}
