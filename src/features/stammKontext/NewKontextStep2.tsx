/**
 * Schritt 2 des NewKontextWizard — Thema, Beschreibung und optional
 * eine Liste vorbefüllter Aktivitäten (werden beim Anlegen ins
 * Repertoire geschrieben).
 */
import type { AktivitaetTyp } from '@/domain/aktivitaetKatalog'
import { Input, Select } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import { AKTIVITAET_TYP_OPTIONS, type AktivitaetDraft } from './newKontextHelpers'
import styles from './NewKontextWizard.module.css'

export function NewKontextStep2({
  thema, setThema, beschreibung, setBeschreibung,
  aktivitaeten, onAdd, onUpdate, onRemove,
}: {
  thema: string
  setThema: (s: string) => void
  beschreibung: string
  setBeschreibung: (s: string) => void
  aktivitaeten: AktivitaetDraft[]
  onAdd: () => void
  onUpdate: (key: string, patch: Partial<AktivitaetDraft>) => void
  onRemove: (key: string) => void
}) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.field}>
        <label className={styles.fieldLabel}>Thema *</label>
        <Input
          value={thema}
          onChange={(e) => setThema(e.target.value)}
          placeholder="z.B. Auf den Spuren der Entdecker"
          autoFocus
        />
      </div>

      <div className={styles.field}>
        <label className={styles.fieldLabel}>Beschreibung</label>
        <textarea
          className={styles.textarea}
          value={beschreibung}
          onChange={(e) => setBeschreibung(e.target.value)}
          placeholder="Worum geht es in diesem Stammkontext?"
          rows={3}
        />
      </div>

      <div className={styles.aktivitaetenSection}>
        <div className={styles.aktivitaetenHeader}>
          <span className={styles.fieldLabel}>Aktivitäten</span>
          <button type="button" className={styles.addBtn} onClick={onAdd}>
            <Icon name="plus" size={11} />
            Hinzufügen
          </button>
        </div>
        {aktivitaeten.map((a) => (
          <div key={a._key} className={styles.aktivitaetRow}>
            <Input
              value={a.name}
              onChange={(e) => onUpdate(a._key, { name: e.target.value })}
              placeholder="Name der Aktivität"
            />
            <Select
              value={a.typ}
              options={AKTIVITAET_TYP_OPTIONS}
              onValueChange={(v) => onUpdate(a._key, { typ: v as AktivitaetTyp })}
            />
            <button
              type="button"
              className={styles.removeBtn}
              onClick={() => onRemove(a._key)}
              aria-label="Entfernen"
            >
              <Icon name="x" size={12} />
            </button>
          </div>
        ))}
        {aktivitaeten.length === 0 && (
          <p className={styles.emptyHint}>Aktivitäten können auch später im Editor ergänzt werden.</p>
        )}
      </div>
    </div>
  )
}
