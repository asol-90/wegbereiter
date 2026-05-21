import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Programmpunkt, StammBlock, AktivitaetTyp, AktivitaetUntertyp } from '@/domain/types'
import type { TreffenId, ProgrammpunktId, MitarbeiterId } from '@/domain/ids'
import { TYP_ICONS } from '@/domain/aktivitaetKatalog'
import { TypeIcon } from '@/ui/domain/TypeIcon'
import { Icon } from '@/ui/primitives/Icon'
import clsx from '@/ui/utils/clsx'
import type { TreffenMutations } from './treffenKarteTypes'
import {
  EditableDurationField,
  EditableNameField,
  KonkretisierenButton,
  ResponsibleSelect,
} from './ProgrammpunktFields'
import styles from './TreffenKarte.module.css'

export function SortableProgrammpunktRow({
  pp,
  team,
  treffenId,
  mutations,
  onKonkretisieren,
}: {
  pp: Programmpunkt
  team: { id: MitarbeiterId; name: string }[]
  treffenId: TreffenId
  mutations: TreffenMutations
  onKonkretisieren?: (treffenId: TreffenId, ppId: ProgrammpunktId, typ: AktivitaetTyp, untertyp?: AktivitaetUntertyp) => void
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pp.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
    position: isDragging ? 'relative' as const : undefined,
  }

  const isAbstrakt = pp.kind === 'abstrakt'

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(styles.point, isDragging && styles.pointDragging)}
    >
      <span
        className={styles.pointHandle}
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        <Icon name="drag-handle" size={11} />
      </span>

      {isAbstrakt ? (
        <Icon name={TYP_ICONS[(pp as { typ: AktivitaetTyp }).typ]} size={13} className={styles.pointTypeIcon} />
      ) : (
        <TypeIcon
          type={{ kind: 'programmpunkt', value: pp.kind }}
          size={13}
          hideLabel
        />
      )}

      <EditableNameField
        value={pp.name}
        onCommit={(name) => mutations.updateProgrammpunkt(treffenId, pp.id, { name })}
      />

      <ResponsibleSelect
        value={pp.verantwortlicherId}
        team={team}
        onChange={(change) => mutations.updateProgrammpunkt(treffenId, pp.id, change)}
      />

      <EditableDurationField
        value={pp.dauerMin}
        onCommit={(dauerMin) => mutations.updateProgrammpunkt(treffenId, pp.id, { dauerMin })}
      />

      {isAbstrakt && onKonkretisieren ? (
        <KonkretisierenButton
          onClick={() => {
            const a = pp as { typ: AktivitaetTyp; untertyp?: AktivitaetUntertyp }
            onKonkretisieren(treffenId, pp.id, a.typ, a.untertyp)
          }}
        />
      ) : (
        <span />
      )}

      <button
        className={styles.pointDelete}
        onClick={() => mutations.removeProgrammpunkt(treffenId, pp.id)}
        title="Entfernen"
      >
        <Icon name="x" size={13} />
      </button>
    </div>
  )
}

export function StammBlockRow({ block }: { block: StammBlock }) {
  return (
    <div className={styles.pointStamm}>
      <span />
      <TypeIcon
        type={{ kind: 'stamm' }}
        size={13}
        hideLabel
        className={styles.pointStammIcon}
      />
      <span className={styles.pointName}>{block.name}</span>
      <span className={styles.pointStammResp}>Stamm</span>
      <span className={styles.pointStammDur}>{block.dauerMin} min</span>
      <span />
      <span />
    </div>
  )
}
