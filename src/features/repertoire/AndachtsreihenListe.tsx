import { useState, useMemo } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import type { AndachtsreiheId } from '@/domain/ids'
import type { Andachtsreihe } from '@/domain/types'
import styles from './RepertoirePage.module.css'

export function AndachtsreihenListe({
  reihen,
  selectedId,
  onSelect,
  onNew,
}: {
  reihen: readonly Andachtsreihe[]
  selectedId: AndachtsreiheId | null
  onSelect: (id: AndachtsreiheId) => void
  onNew: () => void
}) {
  const [search, setSearch] = useState('')
  const [expandedId, setExpandedId] = useState<AndachtsreiheId | null>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return reihen.filter((r) => !r.deaktiviert)
    return reihen.filter((r) => {
      if (r.deaktiviert) return false
      return r.name.toLowerCase().includes(q) ||
        r.einheiten.some((e) => e.titel.toLowerCase().includes(q))
    })
  }, [reihen, search])

  return (
    <div className={styles.liste}>
      <div className={styles.listeHeader}>
        <div className={styles.searchRow}>
          <Icon name="search" size={13} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Andachtsreihe suchen…"
          />
        </div>
        <div className={styles.filterRow}>
          <span className={styles.filterInfo}>
            {filtered.length} Reihe{filtered.length !== 1 ? 'n' : ''}
          </span>
          <button className={styles.newBtn} onClick={onNew}>
            <Icon name="plus" size={12} />
            Neue Reihe
          </button>
        </div>
      </div>
      <div className={styles.listeBody}>
        {filtered.length === 0 && (
          <div className={styles.empty}>Keine Andachtsreihen gefunden.</div>
        )}
        {filtered.map((r) => {
          const isExpanded = expandedId === r.id
          return (
            <div key={r.id} className={styles.accordionItem}>
              <button
                className={`${styles.accordionHeader} ${r.id === selectedId ? styles.listItemSelected : ''}`}
                onClick={() => {
                  onSelect(r.id)
                  setExpandedId(isExpanded ? null : r.id)
                }}
              >
                <Icon name={isExpanded ? 'chevron-down' : 'chevron-right'} size={12} />
                <span className={styles.listItemName}>{r.name}</span>
                <span className={styles.artBadge}>{r.art === 'reihe' ? 'Reihe' : 'Sammlung'}</span>
                <span className={styles.listItemMeta}>{r.einheiten.length} Einh.</span>
              </button>
              {isExpanded && (
                <div className={styles.accordionBody}>
                  {r.einheiten.map((e) => (
                    <div key={e.id} className={styles.einheitRow}>
                      <span className={styles.einheitIndex}>{e.index + 1}.</span>
                      <span className={styles.einheitTitel}>{e.titel}</span>
                      {e.bibelstelle && <span className={styles.einheitRef}>{e.bibelstelle}</span>}
                    </div>
                  ))}
                  {r.buchquelle && (
                    <div className={styles.buchquelleHint}>
                      <Icon name="book-open" size={11} />
                      {r.buchquelle.titel}
                      {r.buchquelle.autor && ` — ${r.buchquelle.autor}`}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
