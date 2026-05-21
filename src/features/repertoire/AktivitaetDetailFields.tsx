/**
 * Field-Sections für AktivitaetDetail.
 *
 * Jede Sektion isoliert ihre eigene Conditional-Render-Logik, damit der
 * Top-Level-Editor unter den eslint-Schwellen bleibt.
 */
import { Icon } from '@/ui/primitives/Icon'
import { WBAktivitaetEditor } from '@/ui/domain-primitives/WBAktivitaetEditor'
import type { Aktivitaet } from '@/domain/types'
import type { AktivitaetId } from '@/domain/ids'
import {
  MIN_STUFE_LABELS, MIN_STUFEN, TYP_LABELS, UNTERTYPEN_FUER_TYP, UNTERTYP_LABELS,
  type AktivitaetTyp, type AktivitaetUntertyp, type MinStufe,
} from '@/domain/aktivitaetKatalog'
import styles from './RepertoirePage.module.css'

type DraftSetter = (updater: (d: Aktivitaet) => Aktivitaet) => void
type FieldSetter = <K extends keyof Aktivitaet>(key: K, val: Aktivitaet[K]) => void

export function TypUntertypRow({
  draft, typen, setDraft, setField,
}: {
  draft: Aktivitaet
  typen: readonly AktivitaetTyp[]
  setDraft: DraftSetter
  setField: FieldSetter
}) {
  const untertypen = UNTERTYPEN_FUER_TYP[draft.typ]
  return (
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
  )
}

export function DauerRow({ draft, setField }: { draft: Aktivitaet; setField: FieldSetter }) {
  return (
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
  )
}

export function ThemenTagsField({ draft, setDraft }: { draft: Aktivitaet; setDraft: DraftSetter }) {
  return (
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
  )
}

export function StufenbezugInfo({ draft }: { draft: Aktivitaet }) {
  if (!draft.stufenbezug || draft.stufenbezug.length === 0) return null
  const n = draft.stufenbezug.length
  return (
    <div className={styles.field}>
      <span className={styles.fieldLabel}>Stufenbezug</span>
      <span className={styles.infoText}>
        Deckt {n} Abzeichen-Anforderung{n > 1 ? 'en' : ''} ab
      </span>
    </div>
  )
}

export function MinStufeField({ draft, setField }: { draft: Aktivitaet; setField: FieldSetter }) {
  return (
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
  )
}

export function WBSection({
  hasWBOverride, displayWBTags, setField,
}: {
  hasWBOverride: boolean
  displayWBTags: Aktivitaet['wbTags']
  setField: FieldSetter
}) {
  return (
    <div className={styles.wbSection}>
      <div className={styles.wbHeader}>
        <span className={styles.fieldLabel}>Wachstumsbereiche</span>
        {!hasWBOverride && <span className={styles.wbHint}>Standard aus Typ</span>}
      </div>
      <WBAktivitaetEditor
        value={displayWBTags}
        onChange={(tags) => setField('wbTags', tags)}
      />
    </div>
  )
}

export function DetailFooter({
  aktivitaet, draft, dirty, onSave, onDeactivate, onDelete,
}: {
  aktivitaet: Aktivitaet
  draft: Aktivitaet
  dirty: boolean
  onSave: (a: Aktivitaet) => void
  onDeactivate: (id: AktivitaetId) => void
  onDelete?: (id: AktivitaetId) => void
}) {
  const canDelete = onDelete && (aktivitaet.quelle === 'eigene' || aktivitaet.quelle === 'temporaer')
  return (
    <div className={styles.detailFooter}>
      <div className={styles.footerLeft}>
        <button
          className={styles.deactivateBtn}
          onClick={() => onDeactivate(aktivitaet.id)}
        >
          Deaktivieren
        </button>
        {canDelete && (
          <button
            className={styles.deleteBtn}
            onClick={() => {
              if (confirm(`„${aktivitaet.name}" endgültig löschen?`)) {
                onDelete!(aktivitaet.id)
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
  )
}
