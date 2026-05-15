import { useState, useCallback } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import { newId, type AndachtsEinheitId, type AndachtsreiheId } from '@/domain/ids'
import type { AndachtsEinheit, Andachtsreihe } from '@/domain/types'
import { quelleLabel } from './repertoireUtils'
import styles from './RepertoirePage.module.css'

export function AndachtsreiheDetail({
  reihe,
  onSave,
  onDeactivate,
}: {
  reihe: Andachtsreihe
  onSave: (r: Andachtsreihe) => void
  onDeactivate: (id: AndachtsreiheId) => void
}) {
  const [draft, setDraft] = useState<Andachtsreihe>(reihe)

  const id = reihe.id
  const [lastId, setLastId] = useState(id)
  if (id !== lastId) {
    setLastId(id)
    setDraft(reihe)
  }

  const dirty = JSON.stringify(draft) !== JSON.stringify(reihe)

  const updateEinheit = useCallback((einheitId: AndachtsEinheitId, update: Partial<AndachtsEinheit>) => {
    setDraft((d) => ({
      ...d,
      einheiten: d.einheiten.map((e) =>
        e.id === einheitId ? { ...e, ...update } : e,
      ),
    }))
  }, [])

  const addEinheit = useCallback(() => {
    setDraft((d) => ({
      ...d,
      einheiten: [
        ...d.einheiten,
        {
          id: newId<AndachtsEinheitId>(),
          index: d.einheiten.length,
          titel: '',
        },
      ],
    }))
  }, [])

  const removeEinheit = useCallback((einheitId: AndachtsEinheitId) => {
    setDraft((d) => ({
      ...d,
      einheiten: d.einheiten
        .filter((e) => e.id !== einheitId)
        .map((e, i) => ({ ...e, index: i })),
    }))
  }, [])

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <span className={styles.detailTitle}>
          <Icon name="book-open" size={14} />
          Andachtsreihe bearbeiten
        </span>
        <span className={styles.detailQuelle}>{quelleLabel(draft.quelle)}</span>
      </div>

      <div className={styles.detailBody}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Name</span>
          <input
            className={styles.fieldInput}
            value={draft.name}
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </label>

        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Art</span>
            <select
              className={styles.fieldInput}
              value={draft.art}
              onChange={(e) => setDraft((d) => ({ ...d, art: e.target.value as 'reihe' | 'sammlung' }))}
            >
              <option value="reihe">Reihe (sequenziell)</option>
              <option value="sammlung">Sammlung (Pool)</option>
            </select>
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Quelle</span>
            <span className={`${styles.fieldInput} ${styles.readOnly}`}>{quelleLabel(draft.quelle)}</span>
          </label>
        </div>

        {/* Buchquelle */}
        <div className={styles.fieldRow}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Buchquelle — Titel</span>
            <input
              className={styles.fieldInput}
              value={draft.buchquelle?.titel ?? ''}
              onChange={(e) => {
                const titel = e.target.value
                setDraft((d) => ({
                  ...d,
                  buchquelle: titel.trim()
                    ? { titel, autor: d.buchquelle?.autor }
                    : undefined,
                }))
              }}
              placeholder="(optional)"
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Buchquelle — Autor</span>
            <input
              className={styles.fieldInput}
              value={draft.buchquelle?.autor ?? ''}
              onChange={(e) => {
                setDraft((d) => ({
                  ...d,
                  buchquelle: d.buchquelle
                    ? { ...d.buchquelle, autor: e.target.value || undefined }
                    : undefined,
                }))
              }}
              placeholder="(optional)"
            />
          </label>
        </div>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Notizen</span>
          <textarea
            className={styles.fieldTextarea}
            value={draft.notizen ?? ''}
            onChange={(e) => setDraft((d) => ({ ...d, notizen: e.target.value || undefined }))}
            rows={2}
          />
        </label>

        {/* Einheiten */}
        <div className={styles.einheitenSection}>
          <div className={styles.einheitenHeader}>
            <span className={styles.fieldLabel}>Einheiten ({draft.einheiten.length})</span>
            <button className={styles.newBtn} onClick={addEinheit}>
              <Icon name="plus" size={12} />
              Einheit
            </button>
          </div>
          <div className={styles.einheitenList}>
            {draft.einheiten.map((e) => (
              <div key={e.id} className={styles.einheitEdit}>
                <span className={styles.einheitEditIndex}>{e.index + 1}.</span>
                <div className={styles.einheitEditFields}>
                  <input
                    className={styles.fieldInput}
                    value={e.titel}
                    onChange={(ev) => updateEinheit(e.id, { titel: ev.target.value })}
                    placeholder="Titel"
                  />
                  <div className={styles.einheitEditRow}>
                    <input
                      className={styles.fieldInputSm}
                      value={e.bibelstelle ?? ''}
                      onChange={(ev) => updateEinheit(e.id, { bibelstelle: ev.target.value || undefined })}
                      placeholder="Bibelstelle"
                    />
                    <input
                      className={styles.fieldInputSm}
                      value={e.kapitelSeite ?? ''}
                      onChange={(ev) => updateEinheit(e.id, { kapitelSeite: ev.target.value || undefined })}
                      placeholder="Kapitel/Seite"
                    />
                    <input
                      className={styles.fieldInputSm}
                      value={e.thema ?? ''}
                      onChange={(ev) => updateEinheit(e.id, { thema: ev.target.value || undefined })}
                      placeholder="Thema"
                    />
                  </div>
                </div>
                <button
                  className={styles.einheitRemoveBtn}
                  onClick={() => removeEinheit(e.id)}
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.detailFooter}>
        <button
          className={styles.deactivateBtn}
          onClick={() => onDeactivate(reihe.id)}
        >
          Deaktivieren
        </button>
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
