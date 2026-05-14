import { useState } from 'react'
import { Button, Modal } from '@/ui/primitives'
import { WBAktivitaetEditor } from '@/ui/domain-primitives/WBAktivitaetEditor'
import {
  AKTIVITAET_TYPEN,
  TYP_LABELS,
  UNTERTYPEN_FUER_TYP,
  UNTERTYP_LABELS,
  type AktivitaetUntertyp,
} from '@/domain/aktivitaetKatalog'
import { newId } from '@/domain/ids'
import type { AktivitaetId } from '@/domain/ids'
import type { Aktivitaet, AktivitaetTyp } from '@/domain/types'
import styles from './StammKontextEditorPanel.module.css'

export function AktivitaetBearbeitenModal({
  isNew,
  initialAktivitaet,
  stammImportId,
  onSave,
  onClose,
}: {
  isNew: boolean
  initialAktivitaet?: Aktivitaet
  stammImportId: Aktivitaet['stammImportId']
  onSave: (a: Aktivitaet) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Aktivitaet>(() =>
    initialAktivitaet ?? {
      id: newId<AktivitaetId>(),
      name: '',
      typ: 'sonstiges' as AktivitaetTyp,
      wbTags: [],
      themenTags: [],
      zeitMin: 15,
      zeitMax: 30,
      quelle: 'stamm-import',
      stammImportId,
    },
  )

  const untertypen = UNTERTYPEN_FUER_TYP[draft.typ]
  const canSave = draft.name.trim().length > 0

  function handleTypChange(newTyp: AktivitaetTyp) {
    setDraft((d) => ({ ...d, typ: newTyp, untertyp: undefined }))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Aktivität hinzufügen' : 'Aktivität bearbeiten'}
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={!canSave} onClick={() => onSave(draft)}>
            {isNew ? 'Hinzufügen' : 'Speichern'}
          </Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Name *</label>
          <input
            type="text"
            className={styles.fieldInput}
            autoFocus
            value={draft.name}
            placeholder="Aktivitätsname"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Typ</label>
            <select
              className={styles.fieldInput}
              value={draft.typ}
              onChange={(e) => handleTypChange(e.target.value as AktivitaetTyp)}
            >
              {AKTIVITAET_TYPEN.filter((t) => t !== 'wegezeit').map((t) => (
                <option key={t} value={t}>{TYP_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {untertypen && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Untertyp</label>
              <select
                className={styles.fieldInput}
                value={draft.untertyp ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    untertyp: (e.target.value || undefined) as AktivitaetUntertyp | undefined,
                  }))
                }
              >
                <option value="">–</option>
                {untertypen.map((ut) => (
                  <option key={ut} value={ut}>{UNTERTYP_LABELS[ut]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Dauer min (Min)</label>
            <input
              type="number"
              className={styles.dauerInput}
              value={draft.zeitMin}
              min={1}
              onChange={(e) =>
                setDraft((d) => ({ ...d, zeitMin: Math.max(1, +e.target.value || 1) }))
              }
            />
          </div>
          <span className={styles.dauerSep}>–</span>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Dauer max (Min)</label>
            <input
              type="number"
              className={styles.dauerInput}
              value={draft.zeitMax}
              min={draft.zeitMin}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  zeitMax: Math.max(d.zeitMin, +e.target.value || d.zeitMin),
                }))
              }
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Wachstumsbereiche</label>
          <WBAktivitaetEditor
            value={draft.wbTags}
            onChange={(tags) => setDraft((d) => ({ ...d, wbTags: tags }))}
          />
        </div>
      </div>
    </Modal>
  )
}
