import { useState, useId } from 'react'
import { Button, Modal } from '@/ui/primitives'
import styles from './StammKontextEditorPanel.module.css'

export function ThemaBearbeitenModal({
  initialThema,
  initialBeschreibung,
  initialNotiz,
  initialTag,
  onSave,
  onClose,
}: {
  initialThema: string
  initialBeschreibung?: string
  initialNotiz?: string
  initialTag?: string
  onSave: (thema: string, beschreibung?: string, notiz?: string, tag?: string) => void
  onClose: () => void
}) {
  const uid = useId()
  const [thema, setThema] = useState(initialThema)
  const [beschreibung, setBeschreibung] = useState(initialBeschreibung ?? '')
  const [notiz, setNotiz] = useState(initialNotiz ?? '')
  const [tag, setTag] = useState(initialTag ?? '')

  return (
    <Modal
      open
      onClose={onClose}
      title="Thema bearbeiten"
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button
            variant="primary"
            disabled={!thema.trim()}
            onClick={() =>
              onSave(thema, beschreibung || undefined, notiz || undefined, tag || undefined)
            }
          >
            Speichern
          </Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-thema`}>Thema *</label>
          <input
            id={`${uid}-thema`}
            type="text"
            className={styles.fieldInput}
            autoFocus
            value={thema}
            placeholder="Saison-Thema"
            onChange={(e) => setThema(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-beschreibung`}>Beschreibung</label>
          <textarea
            id={`${uid}-beschreibung`}
            className={styles.fieldTextarea}
            value={beschreibung}
            rows={3}
            onChange={(e) => setBeschreibung(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-notiz`}>Bearbeitungsnotiz</label>
          <textarea
            id={`${uid}-notiz`}
            className={styles.fieldTextarea}
            value={notiz}
            placeholder="Änderungshinweis für Gruppenleiter"
            rows={2}
            onChange={(e) => setNotiz(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-tag`}>Themen-Tag</label>
          <input
            id={`${uid}-tag`}
            type="text"
            className={styles.fieldInput}
            value={tag}
            placeholder="Wird Aktivitäten beim Import zugewiesen"
            onChange={(e) => setTag(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}
