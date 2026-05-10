/**
 * RepertoirePage — Repertoire-Verwaltung (Phase 12).
 *
 * SegmentedControl mit 4 Segmenten:
 *   Aktivitäten | Pfadfindertechnik | Andachtsreihen | Abzeichen
 *
 * Layout: Liste links (65 %), Detail/Edit-Panel rechts (35 %).
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Panels, Panel } from '@/features/appShell'
import { useRepertoire, useRepertoireActions } from './useRepertoire'
import { Icon } from '@/ui/primitives/Icon'
import { SegmentedControl } from '@/ui/primitives/SegmentedControl'
import { newId } from '@/domain/ids'
import type { AktivitaetId, AndachtsreiheId, AndachtsEinheitId, AbzeichenId, AbzeichenAnforderungId } from '@/domain/ids'
import type { Aktivitaet, Andachtsreihe, AndachtsEinheit, Abzeichen, AktivitaetQuelle } from '@/domain/types'
import {
  AKTIVITAET_TYPEN,
  TYP_LABELS,
  TYP_ICONS,
  UNTERTYPEN_FUER_TYP,
  UNTERTYP_LABELS,
  getWBDefaultTags,
  aktivitaetLabel,
  MIN_STUFEN,
  MIN_STUFE_LABELS,
  type AktivitaetTyp,
  type AktivitaetUntertyp,
  type MinStufe,
} from '@/domain/aktivitaetKatalog'
import { parseRepertoireImport } from './repertoireImport'
import { WBAktivitaetEditor } from '@/ui/domain-primitives/WBAktivitaetEditor'
import { ALTERSSTUFE_LABELS } from '@/domain/abzeichenKatalog'
import styles from './RepertoirePage.module.css'

// ─── Segment type ─────────────────────────────────────────────────────────

type RepertoireSegment = 'aktivitaeten' | 'pfadfindertechnik' | 'andachtsreihen' | 'abzeichen'

const SEGMENT_OPTIONS: { value: RepertoireSegment; label: string }[] = [
  { value: 'aktivitaeten', label: 'Aktivitäten' },
  { value: 'pfadfindertechnik', label: 'Pfadfindertechnik' },
  { value: 'andachtsreihen', label: 'Andachtsreihen' },
  { value: 'abzeichen', label: 'Abzeichen' },
]

// ─── Shared helpers ───────────────────────────────────────────────────────

/** Typen, die im Aktivitäten-Tab angezeigt werden (ohne Pfadfindertechnik + Wegezeit). */
const AKT_FILTERABLE_TYPEN = AKTIVITAET_TYPEN.filter(
  (t) => t !== 'wegezeit' && t !== 'pfadfindertechnik',
)

/** Alle filterbaren Typen (für Detail-Selects). */
const ALL_FILTERABLE_TYPEN = AKTIVITAET_TYPEN.filter((t) => t !== 'wegezeit')

function quelleLabel(q: string): string {
  switch (q) {
    case 'eigene': return 'Eigene'
    case 'vorinstalliert': return 'Vorinstalliert'
    case 'stamm-import': return 'Stamm-Import'
    case 'temporaer': return 'Temporär'
    default: return q
  }
}

const QUELLE_OPTIONS: { value: AktivitaetQuelle | ''; label: string }[] = [
  { value: '', label: 'Alle Quellen' },
  { value: 'eigene', label: 'Eigene' },
  { value: 'vorinstalliert', label: 'Vorinstalliert' },
  { value: 'stamm-import', label: 'Stamm-Import' },
  { value: 'temporaer', label: 'Temporär' },
]

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

// ═══════════════════════════════════════════════════════════════════════════
// 1. AKTIVITÄTEN-TAB
// ═══════════════════════════════════════════════════════════════════════════

function AktivitaetenListe({
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

// ─── Shared: Aktivität-Detail (used by Aktivitäten + Pfadfindertechnik) ──

function AktivitaetDetail({
  aktivitaet,
  onSave,
  onDeactivate,
  onDelete,
  typOptions,
  planungen,
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

// ═══════════════════════════════════════════════════════════════════════════
// 2. PFADFINDERTECHNIK-TAB
// ═══════════════════════════════════════════════════════════════════════════

function PfadfindertechnikListe({
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

// ═══════════════════════════════════════════════════════════════════════════
// 3. ANDACHTSREIHEN-TAB
// ═══════════════════════════════════════════════════════════════════════════

function AndachtsreihenListe({
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

function AndachtsreiheDetail({
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

// ═══════════════════════════════════════════════════════════════════════════
// 4. ABZEICHEN-TAB (read-only)
// ═══════════════════════════════════════════════════════════════════════════

function AbzeichenListe({
  abzeichen,
  selectedId,
  onSelect,
  aktivitaeten,
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

function AbzeichenDetail({
  abzeichen,
  aktivitaeten,
  onCreateAktivitaet,
}: {
  abzeichen: Abzeichen
  aktivitaeten: readonly Aktivitaet[]
  onCreateAktivitaet: (anf: Abzeichen['anforderungen'][number]) => void
}) {
  // Check which Anforderungen already have a linked Aktivität
  const anforderungStatus = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const anf of abzeichen.anforderungen) {
      const hasAkt = aktivitaeten.some(
        (a) => a.stufenbezug?.includes(anf.id) && !a.deaktiviert,
      )
      map.set(anf.id as string, hasAkt)
    }
    return map
  }, [abzeichen, aktivitaeten])

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <span className={styles.detailTitle}>
          <Icon name="award" size={14} />
          {abzeichen.name}
        </span>
        <span className={styles.detailQuelle}>
          {ALTERSSTUFE_LABELS[abzeichen.altersstufe]}
        </span>
      </div>

      <div className={styles.detailBody}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Anforderungen</span>
        </div>
        <div className={styles.anforderungenList}>
          {abzeichen.anforderungen.map((anf) => {
            const imRepertoire = anforderungStatus.get(anf.id as string) ?? false
            return (
              <div key={anf.id} className={styles.anforderungRow}>
                <div className={styles.anforderungInfo}>
                  <span className={styles.anforderungName}>{anf.name}</span>
                  <span className={styles.anforderungMeta}>
                    {TYP_LABELS[anf.typ]}
                    {anf.untertyp && ` · ${UNTERTYP_LABELS[anf.untertyp]}`}
                    {' · '}
                    {anf.zeitMin}–{anf.zeitMax} min
                  </span>
                </div>
                {imRepertoire ? (
                  <span className={styles.statusBadgeGreen}>Im Repertoire</span>
                ) : (
                  <button
                    className={styles.statusBadgeBtn}
                    onClick={() => onCreateAktivitaet(anf)}
                  >
                    Ins Repertoire
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function RepertoirePage() {
  const { aktivitaeten, andachtsreihen, abzeichen, loaded } = useRepertoire()
  const {
    save, remove, saveAndachtsreihe, removeAndachtsreihe,
    importAktivitaeten, importAndachtsreihen, importAbzeichen,
  } = useRepertoireActions()
  const [segment, setSegment] = useState<RepertoireSegment>('aktivitaeten')

  // ── Drag-over detection ──
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const dragCountRef = useRef(0)

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (e.dataTransfer?.types.includes('Files')) {
        dragCountRef.current++
        setIsDraggingFile(true)
      }
    }
    function onDragLeave(e: DragEvent) {
      if (!e.relatedTarget) {
        dragCountRef.current = 0
        setIsDraggingFile(false)
      }
    }
    function onDrop() {
      dragCountRef.current = 0
      setIsDraggingFile(false)
    }
    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
    }
  }, [])

  // Selection state per segment
  const [selectedAktId, setSelectedAktId] = useState<AktivitaetId | null>(null)
  const [selectedPtId, setSelectedPtId] = useState<AktivitaetId | null>(null)
  const [selectedReiheId, setSelectedReiheId] = useState<AndachtsreiheId | null>(null)
  const [selectedAbzId, setSelectedAbzId] = useState<AbzeichenId | null>(null)

  // Lookups
  const selectedAkt = useMemo(
    () => aktivitaeten.find((a) => a.id === selectedAktId) ?? null,
    [aktivitaeten, selectedAktId],
  )
  const selectedPt = useMemo(
    () => aktivitaeten.find((a) => a.id === selectedPtId) ?? null,
    [aktivitaeten, selectedPtId],
  )
  const selectedReihe = useMemo(
    () => andachtsreihen.find((r) => r.id === selectedReiheId) ?? null,
    [andachtsreihen, selectedReiheId],
  )
  const selectedAbz = useMemo(
    () => abzeichen.find((a) => a.id === selectedAbzId) ?? null,
    [abzeichen, selectedAbzId],
  )

  // Handlers
  const handleSaveAkt = useCallback(async (a: Aktivitaet) => { await save(a) }, [save])

  const handleDeactivateAkt = useCallback(async (id: AktivitaetId) => {
    const akt = aktivitaeten.find((a) => a.id === id)
    if (!akt) return
    await save({ ...akt, deaktiviert: true })
    setSelectedAktId(null)
    setSelectedPtId(null)
  }, [aktivitaeten, save])

  const handleDeleteAkt = useCallback(async (id: AktivitaetId) => {
    await remove(id)
    setSelectedAktId(null)
    setSelectedPtId(null)
  }, [remove])

  const handleNewAkt = useCallback(async () => {
    const newAkt: Aktivitaet = {
      id: newId<AktivitaetId>(),
      name: 'Neue Aktivität',
      typ: 'sonstiges',
      wbTags: [],
      themenTags: [],
      zeitMin: 15,
      zeitMax: 30,
      quelle: 'eigene',
    }
    await save(newAkt)
    setSelectedAktId(newAkt.id)
  }, [save])

  const handleNewPt = useCallback(async () => {
    const newAkt: Aktivitaet = {
      id: newId<AktivitaetId>(),
      name: 'Neue Pfadfindertechnik',
      typ: 'pfadfindertechnik',
      wbTags: [],
      themenTags: [],
      zeitMin: 15,
      zeitMax: 30,
      quelle: 'eigene',
    }
    await save(newAkt)
    setSelectedPtId(newAkt.id)
  }, [save])

  const handleSaveReihe = useCallback(async (r: Andachtsreihe) => {
    await saveAndachtsreihe(r)
  }, [saveAndachtsreihe])

  const handleDeactivateReihe = useCallback(async (id: AndachtsreiheId) => {
    const r = andachtsreihen.find((r) => r.id === id)
    if (!r) return
    await saveAndachtsreihe({ ...r, deaktiviert: true })
    setSelectedReiheId(null)
  }, [andachtsreihen, saveAndachtsreihe])

  const handleNewReihe = useCallback(async () => {
    const newR: Andachtsreihe = {
      id: newId<AndachtsreiheId>(),
      name: 'Neue Andachtsreihe',
      art: 'reihe',
      quelle: 'eigene',
      einheiten: [],
    }
    await saveAndachtsreihe(newR)
    setSelectedReiheId(newR.id)
  }, [saveAndachtsreihe])

  const handleCreateFromAnforderung = useCallback(async (anf: Abzeichen['anforderungen'][number]) => {
    const newAkt: Aktivitaet = {
      id: newId<AktivitaetId>(),
      name: anf.name,
      typ: anf.typ,
      untertyp: anf.untertyp,
      wbTags: [],
      themenTags: [],
      zeitMin: anf.zeitMin,
      zeitMax: anf.zeitMax,
      stufenbezug: [anf.id],
      quelle: 'eigene',
    }
    await save(newAkt)
  }, [save])

  // ── File drop handler ──
  const [importFeedback, setImportFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current = 0
    setIsDraggingFile(false)

    const file = Array.from(e.dataTransfer.files).find((f) => f.name.endsWith('.json'))
    if (!file) {
      setImportFeedback({ type: 'err', message: 'Nur JSON-Dateien werden unterstützt.' })
      return
    }

    let data: unknown
    try {
      data = JSON.parse(await file.text())
    } catch {
      setImportFeedback({ type: 'err', message: 'Datei ist kein gültiges JSON.' })
      return
    }

    const outcome = parseRepertoireImport(data)
    if (outcome.kind === 'unknown') {
      setImportFeedback({ type: 'err', message: outcome.error })
      return
    }
    if (!outcome.result.ok) {
      setImportFeedback({ type: 'err', message: outcome.result.error })
      return
    }

    const { items, skipped } = outcome.result
    if (items.length === 0) {
      setImportFeedback({ type: 'err', message: 'Keine gültigen Einträge in der Datei.' })
      return
    }

    if (outcome.kind === 'aktivitaeten') {
      await importAktivitaeten(items as Aktivitaet[])
      setSegment(
        (items as Aktivitaet[]).some((a) => a.typ === 'pfadfindertechnik')
          ? 'pfadfindertechnik'
          : 'aktivitaeten',
      )
    } else if (outcome.kind === 'andachtsreihen') {
      await importAndachtsreihen(items as Andachtsreihe[])
      setSegment('andachtsreihen')
    } else if (outcome.kind === 'abzeichen') {
      await importAbzeichen(items as Abzeichen[])
      setSegment('abzeichen')
    }

    const skipNote = skipped > 0 ? `, ${skipped} übersprungen` : ''
    setImportFeedback({ type: 'ok', message: `${items.length} Einträge importiert${skipNote}.` })
    setTimeout(() => setImportFeedback(null), 4000)
  }, [importAktivitaeten, importAndachtsreihen, importAbzeichen])

  if (!loaded) return null

  // ── Render list + detail for current segment ──

  let listContent: React.ReactNode
  let detailContent: React.ReactNode

  switch (segment) {
    case 'aktivitaeten':
      listContent = (
        <AktivitaetenListe
          aktivitaeten={aktivitaeten}
          selectedId={selectedAktId}
          onSelect={setSelectedAktId}
          onNew={handleNewAkt}
        />
      )
      detailContent = selectedAkt ? (
        <AktivitaetDetail
          aktivitaet={selectedAkt}
          onSave={handleSaveAkt}
          onDeactivate={handleDeactivateAkt}
          onDelete={handleDeleteAkt}
          typOptions={AKT_FILTERABLE_TYPEN}
        />
      ) : (
        <div className={styles.emptyDetail}>
          <Icon name="book" size={24} strokeWidth={1.5} className={styles.emptyIcon} />
          <span>Aktivität auswählen</span>
        </div>
      )
      break

    case 'pfadfindertechnik':
      listContent = (
        <PfadfindertechnikListe
          aktivitaeten={aktivitaeten}
          selectedId={selectedPtId}
          onSelect={setSelectedPtId}
          onNew={handleNewPt}
        />
      )
      detailContent = selectedPt ? (
        <AktivitaetDetail
          aktivitaet={selectedPt}
          onSave={handleSaveAkt}
          onDeactivate={handleDeactivateAkt}
          onDelete={handleDeleteAkt}
          typOptions={['pfadfindertechnik'] as const}
        />
      ) : (
        <div className={styles.emptyDetail}>
          <Icon name="tool" size={24} strokeWidth={1.5} className={styles.emptyIcon} />
          <span>Pfadfindertechnik auswählen</span>
        </div>
      )
      break

    case 'andachtsreihen':
      listContent = (
        <AndachtsreihenListe
          reihen={andachtsreihen}
          selectedId={selectedReiheId}
          onSelect={setSelectedReiheId}
          onNew={handleNewReihe}
        />
      )
      detailContent = selectedReihe ? (
        <AndachtsreiheDetail
          reihe={selectedReihe}
          onSave={handleSaveReihe}
          onDeactivate={handleDeactivateReihe}
        />
      ) : (
        <div className={styles.emptyDetail}>
          <Icon name="book-open" size={24} strokeWidth={1.5} className={styles.emptyIcon} />
          <span>Andachtsreihe auswählen</span>
        </div>
      )
      break

    case 'abzeichen':
      listContent = (
        <AbzeichenListe
          abzeichen={abzeichen}
          selectedId={selectedAbzId}
          onSelect={setSelectedAbzId}
          aktivitaeten={aktivitaeten}
        />
      )
      detailContent = selectedAbz ? (
        <AbzeichenDetail
          abzeichen={selectedAbz}
          aktivitaeten={aktivitaeten}
          onCreateAktivitaet={handleCreateFromAnforderung}
        />
      ) : (
        <div className={styles.emptyDetail}>
          <Icon name="award" size={24} strokeWidth={1.5} className={styles.emptyIcon} />
          <span>Abzeichen auswählen</span>
        </div>
      )
      break
  }

  return (
    <Panels split="main-side">
      <Panel role="main" title="Repertoire">
        <div className={styles.segmentRow}>
          <SegmentedControl
            options={SEGMENT_OPTIONS}
            value={segment}
            onValueChange={setSegment}
            sizeVariant="sm"
            ariaLabel="Repertoire-Bereich"
          />
        </div>

        {importFeedback && (
          <div className={`${styles.importBanner} ${importFeedback.type === 'ok' ? styles.importBannerOk : styles.importBannerErr}`}>
            {importFeedback.message}
          </div>
        )}

        {isDraggingFile ? (
          <div
            className={styles.dropZone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <Icon name="upload" size={36} strokeWidth={1.2} className={styles.dropZoneIcon} />
            <span className={styles.dropZoneTitle}>JSON-Datei hier ablegen</span>
            <span className={styles.dropZoneSub}>Aktivitäten · Andachtsreihen · Abzeichen</span>
          </div>
        ) : (
          listContent
        )}
      </Panel>
      <Panel role="side">
        {detailContent}
      </Panel>
    </Panels>
  )
}
