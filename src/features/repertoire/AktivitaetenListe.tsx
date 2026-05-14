import { useState, useMemo } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import type { AktivitaetId } from '@/domain/ids'
import type { Aktivitaet, AktivitaetQuelle } from '@/domain/types'
import {
  AKTIVITAET_TYPEN,
  TYP_LABELS,
  TYP_ICONS,
  UNTERTYP_LABELS,
  type AktivitaetTyp,
} from '@/domain/aktivitaetKatalog'
import styles from './RepertoirePage.module.css'

/** Typen, die im Aktivitäten-Tab angezeigt werden (ohne Pfadfindertechnik + Wegezeit). */
const AKT_FILTERABLE_TYPEN = AKTIVITAET_TYPEN.filter(
  (t) => t !== 'wegezeit' && t !== 'pfadfindertechnik',
)

const QUELLE_OPTIONS: { value: AktivitaetQuelle | ''; label: string }[] = [
  { value: '', label: 'Alle Quellen' },
  { value: 'eigene', label: 'Eigene' },
  { value: 'vorinstalliert', label: 'Vorinstalliert' },
  { value: 'stamm-import', label: 'Stamm-Import' },
  { value: 'temporaer', label: 'Temporär' },
]

export function AktivitaetenListe({
  aktivitaeten,
  selectedId,
  onSelect,
  onNew,
}: {
  aktivitaeten: readonly Aktivitaet[]
  selectedId: AktivitaetId | null
  onSelect: (id: AktivitaetId) => void
  onNew: () => void
}) {
  const [search, setSearch] = useState('')
  const [typFilter, setTypFilter] = useState<AktivitaetTyp | ''>('')
  const [quelleFilter, setQuelleFilter] = useState<AktivitaetQuelle | ''>('')

  // Count temporäre
  const tempCount = useMemo(
    () => aktivitaeten.filter((a) => a.quelle === 'temporaer' && !a.deaktiviert).length,
    [aktivitaeten],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return aktivitaeten.filter((a) => {
      if (a.deaktiviert) return false
      if (a.typ === 'pfadfindertechnik') return false // eigener Tab
      if (a.typ === 'wegezeit') return false // kein Repertoire-Eintrag
      if (typFilter && a.typ !== typFilter) return false
      if (quelleFilter && a.quelle !== quelleFilter) return false
      if (q && !a.name.toLowerCase().includes(q) &&
        !TYP_LABELS[a.typ].toLowerCase().includes(q)) return false
      return true
    })
  }, [aktivitaeten, search, typFilter, quelleFilter])

  // Group by typ
  const groups = useMemo(() => {
    const map = new Map<AktivitaetTyp, Aktivitaet[]>()
    for (const a of filtered) {
      const list = map.get(a.typ) ?? []
      list.push(a)
      map.set(a.typ, list)
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
            placeholder="Aktivität suchen…"
          />
        </div>
        <div className={styles.filterRow}>
          <select
            className={styles.typSelect}
            value={typFilter}
            onChange={(e) => setTypFilter(e.target.value as AktivitaetTyp | '')}
          >
            <option value="">Alle Typen</option>
            {AKT_FILTERABLE_TYPEN.map((t) => (
              <option key={t} value={t}>{TYP_LABELS[t]}</option>
            ))}
          </select>
          <select
            className={styles.typSelect}
            value={quelleFilter}
            onChange={(e) => setQuelleFilter(e.target.value as AktivitaetQuelle | '')}
          >
            {QUELLE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className={styles.newBtn} onClick={onNew}>
            <Icon name="plus" size={12} />
            Neu
          </button>
        </div>
      </div>

      {/* Temporär-Banner */}
      {tempCount > 0 && quelleFilter !== 'temporaer' && (
        <div className={styles.tempBanner}>
          <span>{tempCount} temporäre Aktivität{tempCount > 1 ? 'en' : ''} zur Übernahme</span>
          <button
            className={styles.tempBannerLink}
            onClick={() => setQuelleFilter('temporaer')}
          >
            Anzeigen
          </button>
        </div>
      )}

      <div className={styles.listeBody}>
        {filtered.length === 0 && (
          <div className={styles.empty}>Keine Aktivitäten gefunden.</div>
        )}
        {[...groups.entries()].map(([typ, items]) => {
          const label = TYP_LABELS[typ]
          if (!label) return null
          return (
          <div key={typ} className={styles.group}>
            <div className={styles.groupTitle}>
              <Icon name={TYP_ICONS[typ]} size={12} />
              {label}
              <span className={styles.groupCount}>{items.length}</span>
            </div>
            {items.map((a) => (
              <button
                key={a.id}
                className={`${styles.listItem} ${a.id === selectedId ? styles.listItemSelected : ''}`}
                onClick={() => onSelect(a.id)}
              >
                <span className={styles.listItemName}>{a.name}</span>
                <span className={styles.listItemMeta}>
                  {a.untertyp ? UNTERTYP_LABELS[a.untertyp] : ''}
                </span>
                <span className={styles.listItemTime}>
                  {a.zeitMin}–{a.zeitMax} min
                </span>
              </button>
            ))}
          </div>
          )
        })}
      </div>
    </div>
  )
}
