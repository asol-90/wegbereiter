import { useState, useMemo } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import type { AktivitaetId } from '@/domain/ids'
import type { Aktivitaet } from '@/domain/types'
import { UNTERTYP_LABELS, type AktivitaetUntertyp } from '@/domain/aktivitaetKatalog'
import styles from './RepertoirePage.module.css'

// ─── Pfadfindertechnik Subkategorie-Labels ────────────────────────────────

const PT_SUBKAT_LABELS: Record<string, string> = {
  camp: 'Camp & Lager',
  'knoten-buende': 'Knoten & Bünde',
  feuer: 'Feuer',
  orientierung: 'Orientierung',
  'erste-hilfe-sicherheit': 'Erste Hilfe & Sicherheit',
  naturkunde: 'Naturkunde',
}

function ptSubkatLabel(untertyp?: string): string {
  if (!untertyp) return 'Allgemein'
  return PT_SUBKAT_LABELS[untertyp] ?? UNTERTYP_LABELS[untertyp as AktivitaetUntertyp] ?? untertyp
}

export function PfadfindertechnikListe({
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

  const ptAktivitaeten = useMemo(
    () => aktivitaeten.filter((a) => a.typ === 'pfadfindertechnik' && !a.deaktiviert),
    [aktivitaeten],
  )

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return ptAktivitaeten
    return ptAktivitaeten.filter(
      (a) => a.name.toLowerCase().includes(q) ||
        (a.untertyp && UNTERTYP_LABELS[a.untertyp].toLowerCase().includes(q)),
    )
  }, [ptAktivitaeten, search])

  // Group by untertyp (Subkategorie)
  const groups = useMemo(() => {
    const map = new Map<string, Aktivitaet[]>()
    for (const a of filtered) {
      const key = a.untertyp ?? '_allgemein'
      const list = map.get(key) ?? []
      list.push(a)
      map.set(key, list)
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
            placeholder="Pfadfindertechnik suchen…"
          />
        </div>
        <div className={styles.filterRow}>
          <span className={styles.filterInfo}>
            {filtered.length} Einträge
          </span>
          <button className={styles.newBtn} onClick={onNew}>
            <Icon name="plus" size={12} />
            Neu
          </button>
        </div>
      </div>
      <div className={styles.listeBody}>
        {filtered.length === 0 && (
          <div className={styles.emptyHint}>
            <Icon name="compass" size={20} strokeWidth={1.5} className={styles.emptyHintIcon} />
            <span>Noch keine Pfadfindertechnik-Aktivitäten.</span>
            <span className={styles.emptyHintSub}>
              Erstelle neue über „Neu" oder übernimm Anforderungen aus dem Abzeichen-Tab.
            </span>
          </div>
        )}
        {[...groups.entries()].map(([key, items]) => (
          <div key={key} className={styles.group}>
            <div className={styles.groupTitle}>
              <Icon name="tool" size={12} />
              {ptSubkatLabel(key === '_allgemein' ? undefined : key)}
              <span className={styles.groupCount}>{items.length}</span>
            </div>
            {items.map((a) => (
              <button
                key={a.id}
                className={`${styles.listItem} ${a.id === selectedId ? styles.listItemSelected : ''}`}
                onClick={() => onSelect(a.id)}
              >
                <span className={styles.listItemName}>
                  {a.name}
                  {a.stufenbezug && a.stufenbezug.length > 0 && (
                    <Icon name="award" size={11} className={styles.badgeIndicator} />
                  )}
                </span>
                <span className={styles.listItemTime}>
                  {a.zeitMin}–{a.zeitMax} min
                </span>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
