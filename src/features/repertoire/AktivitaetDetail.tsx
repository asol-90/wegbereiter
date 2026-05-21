import { useCallback, useState } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import type { AktivitaetId } from '@/domain/ids'
import type { Aktivitaet } from '@/domain/types'
import {
  AKTIVITAET_TYPEN, getWBDefaultTags, TYP_ICONS, type AktivitaetTyp,
} from '@/domain/aktivitaetKatalog'
import { quelleLabel } from './repertoireUtils'
import {
  DauerRow, DetailFooter, MinStufeField, StufenbezugInfo,
  ThemenTagsField, TypUntertypRow, WBSection,
} from './AktivitaetDetailFields'
import styles from './RepertoirePage.module.css'

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
  typOptions?: readonly AktivitaetTyp[]
  planungen?: { name: string; count: number }[]
}) {
  const [draft, setDraft] = useState<Aktivitaet>(aktivitaet)

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
    : (getWBDefaultTags(draft.typ, draft.untertyp) as typeof draft.wbTags)
  const typen = typOptions ?? ALL_FILTERABLE_TYPEN

  const setField = useCallback(<K extends keyof Aktivitaet>(key: K, val: Aktivitaet[K]) => {
    setDraft((d) => ({ ...d, [key]: val }))
  }, [])

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

        <TypUntertypRow draft={draft} typen={typen} setDraft={setDraft} setField={setField} />
        <DauerRow draft={draft} setField={setField} />
        <ThemenTagsField draft={draft} setDraft={setDraft} />
        <StufenbezugInfo draft={draft} />
        <MinStufeField draft={draft} setField={setField} />
        <WBSection
          hasWBOverride={hasWBOverride}
          displayWBTags={displayWBTags}
          setField={setField}
        />

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

      <DetailFooter
        aktivitaet={aktivitaet}
        draft={draft}
        dirty={dirty}
        onSave={onSave}
        onDeactivate={onDeactivate}
        onDelete={onDelete}
      />
    </div>
  )
}
