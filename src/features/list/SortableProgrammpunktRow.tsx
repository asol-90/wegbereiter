import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { Programmpunkt, StammBlock, AktivitaetTyp, AktivitaetUntertyp } from '@/domain/types'
import type { TreffenId, ProgrammpunktId, MitarbeiterId } from '@/domain/ids'
import { TYP_ICONS } from '@/domain/aktivitaetKatalog'
import { TypeIcon } from '@/ui/domain/TypeIcon'
import { Icon } from '@/ui/primitives/Icon'
import clsx from '@/ui/utils/clsx'
import type { TreffenMutations } from './treffenKarteTypes'
import styles from './TreffenKarte.module.css'

// ─── Sortable Programmpunkt row ─────────────────────────────────────────────

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

  const [editingName, setEditingName] = useState(false)
  const [editingDur, setEditingDur] = useState(false)
  const [localName, setLocalName] = useState(pp.name)
  const [localDur, setLocalDur] = useState(String(pp.dauerMin))

  const nameRef = useRef<HTMLInputElement>(null)
  const durRef = useRef<HTMLInputElement>(null)

  const commitName = () => {
    setEditingName(false)
    const trimmed = localName.trim()
    if (trimmed && trimmed !== pp.name) {
      mutations.updateProgrammpunkt(treffenId, pp.id, { name: trimmed })
    } else {
      setLocalName(pp.name)
    }
  }

  const commitDur = () => {
    setEditingDur(false)
    const parsed = parseInt(localDur, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed !== pp.dauerMin) {
      mutations.updateProgrammpunkt(treffenId, pp.id, { dauerMin: parsed })
    } else {
      setLocalDur(String(pp.dauerMin))
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={clsx(styles.point, isDragging && styles.pointDragging)}
    >
      {/* Drag handle — only this element triggers dragging */}
      <span
        className={styles.pointHandle}
        {...attributes}
        {...listeners}
        style={{ cursor: 'grab', touchAction: 'none' }}
      >
        <Icon name="drag-handle" size={11} />
      </span>

      {pp.kind === 'abstrakt' ? (
        <Icon name={TYP_ICONS[(pp as { typ: AktivitaetTyp }).typ]} size={13} className={styles.pointTypeIcon} />
      ) : (
        <TypeIcon
          type={{ kind: 'programmpunkt', value: pp.kind }}
          size={13}
          hideLabel
        />
      )}

      {/* Name — click to edit */}
      {editingName ? (
        <input
          ref={nameRef}
          className={styles.pointNameInput}
          value={localName}
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') nameRef.current?.blur()
            if (e.key === 'Escape') {
              setLocalName(pp.name)
              setEditingName(false)
            }
          }}
          autoFocus
        />
      ) : (
        <span
          className={styles.pointName}
          onClick={() => {
            setLocalName(pp.name)
            setEditingName(true)
          }}
        >
          {pp.name}
        </span>
      )}

      {/* Responsible */}
      <select
        className={styles.pointRespSelect}
        value={pp.verantwortlicherId ?? ''}
        onChange={(e) => {
          const val = e.target.value
          if (val === 'offen') {
            mutations.updateProgrammpunkt(treffenId, pp.id, {
              verantwortlicherId: 'offen',
              gastName: undefined,
            })
          } else if (val) {
            mutations.updateProgrammpunkt(treffenId, pp.id, {
              verantwortlicherId: val as MitarbeiterId,
              gastName: undefined,
            })
          } else {
            mutations.updateProgrammpunkt(treffenId, pp.id, {
              verantwortlicherId: undefined,
            })
          }
        }}
        title="Verantwortlich"
      >
        <option value="">—</option>
        <option value="offen">Offen</option>
        {team.map((m) => (
          <option key={m.id} value={m.id}>{m.name}</option>
        ))}
      </select>

      {/* Duration — click to edit */}
      {editingDur ? (
        <input
          ref={durRef}
          className={styles.pointDurInput}
          type="number"
          min={1}
          value={localDur}
          onChange={(e) => setLocalDur(e.target.value)}
          onBlur={commitDur}
          onKeyDown={(e) => {
            if (e.key === 'Enter') durRef.current?.blur()
            if (e.key === 'Escape') {
              setLocalDur(String(pp.dauerMin))
              setEditingDur(false)
            }
          }}
          autoFocus
        />
      ) : (
        <span
          className={styles.pointDur}
          onClick={() => {
            setLocalDur(String(pp.dauerMin))
            setEditingDur(true)
          }}
        >
          {pp.dauerMin} min
        </span>
      )}

      {/* Konkretisieren — always occupies col 6; hidden placeholder when not needed */}
      {pp.kind === 'abstrakt' && onKonkretisieren ? (
        <button
          className={styles.pointKonkretIcon}
          onClick={() => {
            const a = pp as { typ: AktivitaetTyp; untertyp?: AktivitaetUntertyp }
            onKonkretisieren(treffenId, pp.id, a.typ, a.untertyp)
          }}
          title="Konkretisieren"
        >
          <Icon name="crosshair" size={13} />
        </button>
      ) : (
        <span />
      )}

      {/* Delete */}
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

// ─── Stamm block row (non-sortable, green) ─────────────────────────────────

export function StammBlockRow({ block }: { block: StammBlock }) {
  return (
    <div className={styles.pointStamm}>
      <span /> {/* handle placeholder */}
      <TypeIcon
        type={{ kind: 'stamm' }}
        size={13}
        hideLabel
        className={styles.pointStammIcon}
      />
      <span className={styles.pointName}>{block.name}</span>
      <span className={styles.pointStammResp}>Stamm</span>
      <span className={styles.pointStammDur}>{block.dauerMin} min</span>
      <span /> {/* crosshair placeholder */}
      <span /> {/* delete placeholder */}
    </div>
  )
}
