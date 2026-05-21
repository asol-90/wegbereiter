/**
 * Modal to add/edit a single StammAktion (Stamm/Distrikt/Regional).
 */
import { useState } from 'react'
import { newId, type StammAktionId } from '@/domain/ids'
import type { IsoDate, StammAktion } from '@/domain/types'
import { Button, Modal } from '@/ui/primitives'
import type { AktionGruppe } from './StammKontextEditorPanel'
import styles from './StammKontextPage.module.css'

const GRUPPE_LABELS: Record<AktionGruppe, string> = {
  stamm: 'Stamm-Aktion',
  distrikt: 'Distrikt-Aktion',
  regional: 'Regional-Aktion',
}

export type AktionBearbeitenModalProps = {
  aktion?: StammAktion
  gruppe: AktionGruppe
  initialDatum?: IsoDate
  onSave: (a: StammAktion, gruppe: AktionGruppe) => void
  onClose: () => void
}

export function AktionBearbeitenModal({
  aktion, gruppe, initialDatum, onSave, onClose,
}: AktionBearbeitenModalProps) {
  const isNew = !aktion
  const today = (initialDatum ?? new Date().toISOString().slice(0, 10)) as IsoDate
  const [draft, setDraft] = useState<StammAktion>(() =>
    aktion ?? { id: newId<StammAktionId>(), titel: '', beginn: today, ende: today },
  )
  const canSave = draft.titel.trim().length > 0

  return (
    <Modal
      open onClose={onClose} size="sm"
      title={isNew ? `${GRUPPE_LABELS[gruppe]} hinzufügen` : `${GRUPPE_LABELS[gruppe]} bearbeiten`}
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={!canSave} onClick={() => onSave(draft, gruppe)}>
            {isNew ? 'Hinzufügen' : 'Speichern'}
          </Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Titel *</label>
          <input type="text" className={styles.fieldInput} autoFocus
            value={draft.titel} placeholder="z.B. Sommerlager, Stammversammlung"
            onChange={(e) => setDraft((d) => ({ ...d, titel: e.target.value }))} />
        </div>
        <div className={styles.treffenModalRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Von</label>
            <input type="date" className={styles.fieldInput} value={draft.beginn}
              onChange={(e) => setDraft((d) => ({
                ...d,
                beginn: e.target.value as IsoDate,
                ende: e.target.value > d.ende ? (e.target.value as IsoDate) : d.ende,
              }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Bis</label>
            <input type="date" className={styles.fieldInput} value={draft.ende} min={draft.beginn}
              onChange={(e) => setDraft((d) => ({ ...d, ende: e.target.value as IsoDate }))} />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Ort</label>
          <input type="text" className={styles.fieldInput} value={draft.ort ?? ''} placeholder="Optional"
            onChange={(e) => setDraft((d) => ({ ...d, ort: e.target.value || undefined }))} />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Beschreibung</label>
          <textarea className={styles.fieldTextarea} value={draft.beschreibung ?? ''} rows={2}
            onChange={(e) => setDraft((d) => ({ ...d, beschreibung: e.target.value || undefined }))} />
        </div>
      </div>
    </Modal>
  )
}
