/**
 * Drag-orderable list of StammBlock entries plus quick-add buttons for the
 * available blocks. Used inside TreffenBearbeitenModal.
 */
import { useState } from 'react'
import type { StammBlock } from '@/domain/types'
import { Icon } from '@/ui/primitives/Icon'
import { IconButton } from '@/ui/primitives/IconButton'
import styles from './StammKontextPage.module.css'

export type StammBlockPickerProps = {
  blocks: StammBlock[]
  availableBlocks: StammBlock[]
  onChange: (blocks: StammBlock[]) => void
}

export function StammBlockPicker({ blocks, availableBlocks, onChange }: StammBlockPickerProps) {
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

  const addedNames = new Set(blocks.map((b) => b.name))
  const unaddedBlocks = availableBlocks.filter((a) => !addedNames.has(a.name))

  return (
    <div className={styles.blockPicker}>
      {blocks.length === 0 && (
        <p className={styles.blockPickerEmpty}>Keine Blöcke ausgewählt</p>
      )}
      {blocks.map((b, i) => (
        <div
          key={i}
          className={styles.blockPickerRow}
          draggable
          onDragStart={() => setDraggingIdx(i)}
          onDragOver={(e) => { e.preventDefault(); setOverIdx(i) }}
          onDrop={handleDrop}
        >
          <span className={styles.dragHandle}><Icon name="drag-handle" size={12} /></span>
          <span className={styles.blockPickerName}>{b.name}</span>
          <span className={styles.blockPickerMeta}>{b.dauerMin} Min</span>
          <IconButton
            icon="trash" label="Entfernen" tone="danger" size={11}
            onClick={() => onChange(blocks.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      {unaddedBlocks.length > 0 && (
        <div className={styles.blockPickerAvailable}>
          {unaddedBlocks.map((a, i) => (
            <button
              key={i}
              type="button"
              className={styles.blockPickerAdd}
              onClick={() => onChange([...blocks, a])}
            >
              <Icon name="plus" size={10} />
              {a.name}
            </button>
          ))}
        </div>
      )}
      {availableBlocks.length === 0 && blocks.length === 0 && (
        <p className={styles.blockPickerHint}>
          Keine Stammformat-Aktivitäten verfügbar. Aktivitäten zuerst im Abschnitt „Aktivitäten" anlegen.
        </p>
      )}
    </div>
  )
}
