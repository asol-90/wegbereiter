/**
 * Edit dialog for a Planung — currently only the name; goal fields stay in
 * the wizard. Kept separate from JahresplanerSidebar to keep that component slim.
 */
import { useState } from 'react'
import type { Planung } from '@/domain/types'
import { Button, Input, Modal } from '@/ui/primitives'

export type EditPlanungModalProps = {
  target: Planung | null
  onSave: (updated: Planung) => Promise<void>
  onClose: () => void
}

/**
 * Inner body — only mounted when there's a target, so we can rely on its
 * fresh useState initial value instead of syncing via an effect.
 */
function EditPlanungModalBody({
  target, onSave, onClose,
}: { target: Planung; onSave: EditPlanungModalProps['onSave']; onClose: () => void }) {
  const [name, setName] = useState(target.name)

  async function handleSave() {
    await onSave({
      ...target,
      name: name.trim() || target.name,
      aktualisiertAm: new Date().toISOString() as Planung['aktualisiertAm'],
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title="Planung bearbeiten"
      size="sm"
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={handleSave}>Speichern</Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <Input label="Name der Planung" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
    </Modal>
  )
}

export function EditPlanungModal({ target, onSave, onClose }: EditPlanungModalProps) {
  if (!target) return null
  return <EditPlanungModalBody key={target.id} target={target} onSave={onSave} onClose={onClose} />
}
