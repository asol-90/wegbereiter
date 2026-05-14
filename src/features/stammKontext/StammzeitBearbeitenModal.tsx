import { useState } from 'react'
import { Button, Modal } from '@/ui/primitives'
import { IconButton } from '@/ui/primitives/IconButton'
import { Icon } from '@/ui/primitives/Icon'
import type { StammBlock } from '@/domain/types'
import type { AktivitaetTyp } from '@/domain/aktivitaetKatalog'
import styles from './StammKontextEditorPanel.module.css'

// ─── BlockRow ─────────────────────────────────────────────────────────────────

function BlockRow({
  block,
  onChange,
  onRemove,
  dragIndex,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  block: StammBlock
  onChange: (b: StammBlock) => void
  onRemove: () => void
  dragIndex: number
  onDragStart: (i: number) => void
  onDragOver: (i: number) => void
  onDrop: () => void
}) {
  return (
    <div
      className={styles.blockRow}
      draggable
      onDragStart={() => onDragStart(dragIndex)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(dragIndex) }}
      onDrop={onDrop}
    >
      <span className={styles.dragHandle} title="Verschieben">
        <Icon name="drag-handle" size={14} />
      </span>
      <input
        type="text"
        className={styles.blockName}
        value={block.name}
        placeholder="Name"
        onChange={(e) => onChange({ ...block, name: e.target.value })}
      />
      <input
        type="number"
        className={styles.blockDauer}
        value={block.dauerMin}
        min={1}
        max={120}
        onChange={(e) => onChange({ ...block, dauerMin: Math.max(1, Number(e.target.value) || 1) })}
        title="Minuten"
      />
      <span className={styles.blockDauerUnit}>Min</span>
      <IconButton icon="trash" label="Entfernen" tone="danger" size={12} onClick={onRemove} />
    </div>
  )
}

// ─── BlockListEditor ──────────────────────────────────────────────────────────

function BlockListEditor({
  label,
  blocks,
  onChange,
}: {
  label: string
  blocks: StammBlock[]
  onChange: (b: StammBlock[]) => void
}) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  function handleDrop() {
    if (draggingIdx === null || overIdx === null || draggingIdx === overIdx) {
      setDraggingIdx(null)
      setOverIdx(null)
      return
    }
    const next = [...blocks]
    const [item] = next.splice(draggingIdx, 1)
    next.splice(overIdx, 0, item!)
    onChange(next)
    setDraggingIdx(null)
    setOverIdx(null)
  }

  function addBlock() {
    onChange([...blocks, { name: '', typ: 'stammformat' as AktivitaetTyp, dauerMin: 10 }])
  }

  return (
    <div className={styles.blockListSection}>
      <span className={styles.blockListLabel}>{label}</span>
      {blocks.map((b, i) => (
        <BlockRow
          key={i}
          block={b}
          dragIndex={i}
          onChange={(updated) => {
            const next = [...blocks]
            next[i] = updated
            onChange(next)
          }}
          onRemove={() => onChange(blocks.filter((_, j) => j !== i))}
          onDragStart={setDraggingIdx}
          onDragOver={setOverIdx}
          onDrop={handleDrop}
        />
      ))}
      <button type="button" className={styles.addRowBtn} onClick={addBlock}>
        <Icon name="plus" size={12} />
        <span>Programmpunkt hinzufügen</span>
      </button>
    </div>
  )
}

// ─── StammzeitBearbeitenModal ─────────────────────────────────────────────────

export function StammzeitBearbeitenModal({
  initialAnfang,
  initialEnde,
  onSave,
  onClose,
}: {
  initialAnfang: StammBlock[]
  initialEnde: StammBlock[]
  onSave: (anfang: StammBlock[], ende: StammBlock[]) => void
  onClose: () => void
}) {
  const [anfang, setAnfang] = useState<StammBlock[]>(initialAnfang)
  const [ende, setEnde] = useState<StammBlock[]>(initialEnde)

  return (
    <Modal
      open
      onClose={onClose}
      title="Stammzeit bearbeiten"
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={() => onSave(anfang, ende)}>Speichern</Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <BlockListEditor label="Anfangsblock" blocks={anfang} onChange={setAnfang} />
        <BlockListEditor label="Endblock" blocks={ende} onChange={setEnde} />
      </div>
    </Modal>
  )
}
