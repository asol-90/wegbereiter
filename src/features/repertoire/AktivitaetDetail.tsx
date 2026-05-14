import { useState, useCallback } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import { WBAktivitaetEditor } from '@/ui/domain-primitives/WBAktivitaetEditor'
import type { AktivitaetId } from '@/domain/ids'
import type { Aktivitaet } from '@/domain/types'
import {
  AKTIVITAET_TYPEN,
  TYP_LABELS,
  TYP_ICONS,
  UNTERTYPEN_FUER_TYP,
  UNTERTYP_LABELS,
  getWBDefaultTags,
  MIN_STUFE_LABELS,
  MIN_STUFEN,
  type AktivitaetTyp,
  type AktivitaetUntertyp,
  type MinStufe,
} from '@/domain/aktivitaetKatalog'
import { quelleLabel } from './repertoireUtils'
import styles from './RepertoirePage.module.css'

/** Alle filterbaren Typen (für Detail-Selects). */
const ALL_FILTERABLE_TYPEN = AKTIVITAET_TYPEN.filter((t) => t !== 'wegezeit')

export function AktivitaetDetail({
  aktivitaet,
  onSave,
  onDeactivate,
  onDelete,
  typOptions,
  planungen: _planungen,
}: {
  aktivitaet: Aktivitaet
  onSave: (a: Aktivitaet) => void
  onDeactivate: (id: AktivitaetId) => void
  onDelete?: (id: AktivitaetId) => void
  /** Which types to show in the typ dropdown. */
  typOptions?: readonly AktivitaetTyp[]
  /** Planungen referencing this activity (for Verwendung). */
  planungen?: { name: string; count: number }[]
}) {
  const [draft, setDraft] = useState<Aktivitaet>(aktivitaet)

  // Reset draft when selection changes
  const id = aktivitaet.id
  const [lastId, setLastId] = useState(id)
  if (id !== lastId) {
    setLastId(id)
    setDraft(aktivitaet)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(aktivitaet)
  const hasWBOverride = draft.wbTags.length > 0
  const displayWBTags = hasWBOverride
    ? draft.wbTags
    : getWBDefaultTags(draft.typ, draft.untertyp) as typeof draft.wbTags
  const typen = typOptions ?? ALL_FILTERABLE_TYPEN

  const setField = useCallback(<K extends keyof Aktivitaet>(key: K, val: Aktivitaet[K]) => {
    setDraft((d) => ({ ...d, [key]: val }))
  }, [])

  const untertypen = UNTERTYPEN_FUER_TYP[draft.typ]

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <span className={styles.detailTitle}>
          <Icon name={TYP_ICONS[draft.typ]} size={14} />
          Bearbeiten
        </span>
        <span className={styles.detailQuelle}>{quelleLabel(draft.quelle)}</span>
      </div>

      <div className={styles.detailBody}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Name</span>
          <input
            className={styles.fieldInput}
            value={draft.name}
            onChange={(e) => setField('name', e.target.value)}
          />
        </label>

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Typ</span>
            <select
              className={styles.fieldInput}
              value={draft.typ}
              onChange={(e) => {
                const newTyp = e.target.value as AktivitaetTyp
                setDraft((d) => ({ ...d, typ: newTyp, untertyp: undefined }))
              }}
            >
              {typen.map((t) => (
                <option key={t} value={t}>{TYP_LABELS[t]}</option>
              ))}
            </select>
          </label>
          {untertypen && (
            <label className={styles.field}>
              <span className={styles.fieldLabel}>Untertyp</span>
              <select
                className={styles.fieldInput}
                value={draft.untertyp ?? ''}
                onChange={(e) =>
                  setField('untertyp', (e.target.value || undefined) as AktivitaetUntertyp | undefined)
                }
              >
                <option value="">– (kein Untertyp)</option>
                {untertypen.map((ut) => (
                  <option key={ut} value={ut}>{UNTERTYP_LABELS[ut]}</option>
                ))}
              </select>
            </label>
          )}
        </div>

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Dauer min (Min)</span>
            <input
              className={styles.fieldInput}
              type="number"
              min={1}
              value={draft.zeitMin}
              onChange={(e) => setField('zeitMin', Math.max(1, +e.target.value || 1))}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Dauer max (Min)</span>
            <input
              className={styles.fieldInput}
              type="number"
              min={1}
              value={draft.zeitMax}
              onChange={(e) => setField('zeitMax', Math.max(1, +e.target.value || 1))}
            />
          </label>
        </div>

        {/* Themen-Tags */}
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Themen-Tags</span>
          <div className={styles.tagRow}>
            {draft.themenTags.map((tag, i) => (
              <span key={i} className={styles.tag}>
                {tag}
                <button
                  className={styles.tagRemove}
                  onClick={() => setDraft((d) => ({
                    ...d,
                    themenTags: d.themenTags.filter((_, j) => j !== i),
                  }))}
                >
                  ×
                </button>
              </span>
            ))}
            <button
              className={styles.tagAdd}
              onClick={() => {
                const tag = prompt('Neuer Tag:')
                if (tag?.trim()) {
                  setDraft((d) => ({ ...d, themenTags: [...d.themenTags, tag.trim()] }))
                }
              }}
            >
              + Tag
            </button>
          </div>
        </div>

        {/* Stufenbezug (Abzeichen-Anforderungen) */}
        {draft.stufenbezug && draft.stufenbezug.length > 0 && (
          <div className={styles.field}>
            <span className={styles.fieldLabel}>Stufenbezug</span>
            <span className={styles.infoText}>
              Deckt {draft.stufenbezug.length} Abzeichen-Anforderung{draft.stufenbezug.length > 1 ? 'en' : ''} ab
            </span>
          </div>
        )}

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Geeignet ab</span>
          <select
            className={styles.fieldInput}
            value={draft.minStufe ?? 'alle'}
            onChange={(e) => {
              const val = e.target.value as MinStufe
              setField('minStufe', val === 'alle' ? undefined : val)
            }}
          >
            {MIN_STUFEN.map((s) => (
              <option key={s} value={s}>{MIN_STUFE_LABELS[s]}</option>
            ))}
          </select>
        </label>

        {/* WB-Section */}
        <div className={styles.wbSection}>
          <div className={styles.wbHeader}>
            <span className={styles.fieldLabel}>Wachstumsbereiche</span>
            {!hasWBOverride && (
              <span className={styles.wbHint}>Standard aus Typ</span>
            )}
          </div>
          <WBAktivitaetEditor
            value={displayWBTags}
            onChange={(tags) => setField('wbTags', tags)}
          />
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Notizen</span>
          <textarea
            className={styles.fieldTextarea}
            value={draft.notizen ?? ''}
            onChange={(e) => setField('notizen', e.target.value || undefined)}
            rows={3}
          />
        </label>
      </div>

      <div className={styles.detailFooter}>
        <div className={styles.footerLeft}>
          <button
            className={styles.deactivateBtn}
            onClick={() => onDeactivate(aktivitaet.id)}
          >
            Deaktivieren
          </button>
          {onDelete && (aktivitaet.quelle === 'eigene' || aktivitaet.quelle === 'temporaer') && (
            <button
              className={styles.deleteBtn}
              onClick={() => {
                if (confirm(`„${aktivitaet.name}" endgültig löschen?`)) {
                  onDelete(aktivitaet.id)
                }
              }}
            >
              <Icon name="trash" size={12} />
              Löschen
            </button>
          )}
        </div>
        <button
          className={styles.saveBtn}
          disabled={!dirty || !draft.name.trim()}
          onClick={() => onSave(draft)}
        >
          Speichern
        </button>
      </div>
    </div>
  )
}
