/**
 * Inline-editable Felder für eine ProgrammpunktRow.
 *
 * Jedes Feld hält seinen eigenen Edit-State (commit auf Blur/Enter,
 * revert auf Escape) und meldet Änderungen über `onCommit` zurück.
 */
import { useRef, useState } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import type { MitarbeiterId } from '@/domain/ids'
import styles from './TreffenKarte.module.css'

export function EditableNameField({
  value, onCommit,
}: { value: string; onCommit: (next: string) => void }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(value)
  const ref = useRef<HTMLInputElement>(null)

  const commit = () => {
    setEditing(false)
    const trimmed = local.trim()
    if (trimmed && trimmed !== value) onCommit(trimmed)
    else setLocal(value)
  }

  if (editing) {
    return (
      <input
        ref={ref}
        className={styles.pointNameInput}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') ref.current?.blur()
          if (e.key === 'Escape') { setLocal(value); setEditing(false) }
        }}
        autoFocus
      />
    )
  }
  return (
    <span
      className={styles.pointName}
      onClick={() => { setLocal(value); setEditing(true) }}
    >
      {value}
    </span>
  )
}

export function EditableDurationField({
  value, onCommit,
}: { value: number; onCommit: (next: number) => void }) {
  const [editing, setEditing] = useState(false)
  const [local, setLocal] = useState(String(value))
  const ref = useRef<HTMLInputElement>(null)

  const commit = () => {
    setEditing(false)
    const parsed = parseInt(local, 10)
    if (!isNaN(parsed) && parsed > 0 && parsed !== value) onCommit(parsed)
    else setLocal(String(value))
  }

  if (editing) {
    return (
      <input
        ref={ref}
        className={styles.pointDurInput}
        type="number"
        min={1}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') ref.current?.blur()
          if (e.key === 'Escape') { setLocal(String(value)); setEditing(false) }
        }}
        autoFocus
      />
    )
  }
  return (
    <span
      className={styles.pointDur}
      onClick={() => { setLocal(String(value)); setEditing(true) }}
    >
      {value} min
    </span>
  )
}

type ResponsibleValue = MitarbeiterId | 'offen' | undefined
type ResponsibleChange =
  | { verantwortlicherId: 'offen'; gastName: undefined }
  | { verantwortlicherId: MitarbeiterId; gastName: undefined }
  | { verantwortlicherId: undefined }

export function ResponsibleSelect({
  value, team, onChange,
}: {
  value: ResponsibleValue
  team: { id: MitarbeiterId; name: string }[]
  onChange: (change: ResponsibleChange) => void
}) {
  return (
    <select
      className={styles.pointRespSelect}
      value={value ?? ''}
      onChange={(e) => {
        const v = e.target.value
        if (v === 'offen') onChange({ verantwortlicherId: 'offen', gastName: undefined })
        else if (v) onChange({ verantwortlicherId: v as MitarbeiterId, gastName: undefined })
        else onChange({ verantwortlicherId: undefined })
      }}
      title="Verantwortlich"
    >
      <option value="">—</option>
      <option value="offen">Offen</option>
      {team.map((m) => (
        <option key={m.id} value={m.id}>{m.name}</option>
      ))}
    </select>
  )
}

export function KonkretisierenButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      className={styles.pointKonkretIcon}
      onClick={onClick}
      title="Konkretisieren"
    >
      <Icon name="crosshair" size={13} />
    </button>
  )
}
