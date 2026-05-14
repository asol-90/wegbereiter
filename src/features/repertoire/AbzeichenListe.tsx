import { useState, useMemo } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import type { AbzeichenId } from '@/domain/ids'
import type { Abzeichen, Aktivitaet } from '@/domain/types'
import { ALTERSSTUFE_LABELS } from '@/domain/abzeichenKatalog'
import styles from './RepertoirePage.module.css'

export function AbzeichenListe({
  abzeichen,
  selectedId,
  onSelect,
  aktivitaeten: _aktivitaeten,
}: {
  abzeichen: readonly Abzeichen[]
  selectedId: AbzeichenId | null
  onSelect: (id: AbzeichenId) => void
  aktivitaeten: readonly Aktivitaet[]
}) {
  const [search, setSearch] = useState('')
  const [stufeFilter, setStufeFilter] = useState<'kundschafter' | 'pfadfinder' | ''>('')

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return abzeichen.filter((a) => {
      if (a.deaktiviert) return false
      if (stufeFilter && a.altersstufe !== stufeFilter) return false
      if (q && !a.name.toLowerCase().includes(q)) return false
      return true
    })
  }, [abzeichen, search, stufeFilter])

  // Group by Altersstufe
  const groups = useMemo(() => {
    const map = new Map<string, Abzeichen[]>()
    for (const a of filtered) {
      const list = map.get(a.altersstufe) ?? []
      list.push(a)
      map.set(a.altersstufe, list)
    }
    return map
  }, [filtered])

  return (
    <div className={styles.liste}>
      <div className={styles.listeHeader}>
        <div className={styles.searchRow}>
          <Icon name="search" size={13} className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Abzeichen suchen…"
          />
        </div>
        <div className={styles.filterRow}>
          <select
            className={styles.typSelect}
            value={stufeFilter}
            onChange={(e) => setStufeFilter(e.target.value as '' | 'kundschafter' | 'pfadfinder')}
          >
            <option value="">Alle Stufen</option>
            <option value="kundschafter">{ALTERSSTUFE_LABELS.kundschafter}</option>
            <option value="pfadfinder">{ALTERSSTUFE_LABELS.pfadfinder}</option>
          </select>
        </div>
      </div>
      <div className={styles.listeBody}>
        {filtered.length === 0 && (
          <div className={styles.empty}>Keine Abzeichen gefunden.</div>
        )}
        {[...groups.entries()].map(([stufe, items]) => (
          <div key={stufe} className={styles.group}>
            <div className={styles.groupTitle}>
              <Icon name="award" size={12} />
              {ALTERSSTUFE_LABELS[stufe as 'kundschafter' | 'pfadfinder']}
              <span className={styles.groupCount}>{items.length}</span>
            </div>
            {items.map((a) => (
              <button
                key={a.id}
                className={`${styles.listItem} ${a.id === selectedId ? styles.listItemSelected : ''}`}
                onClick={() => onSelect(a.id)}
              >
                <span className={styles.listItemName}>{a.name}</span>
                <span className={styles.listItemMeta}>{a.anforderungen.length} Anforderungen</span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
