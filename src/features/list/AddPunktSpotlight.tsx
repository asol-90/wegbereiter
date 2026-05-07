/**
 * AddPunktSpotlight — Spotlight-basiertes Overlay zum Hinzufügen von
 * Programmpunkten. Nutzt das Repertoire und den Typ-Katalog.
 *
 * Navigation:
 * - Ebene 0 (kein Filter, kein Query): Nur Typen anzeigen.
 *   Typen mit Untertypen zeigen ›-Indikator → Drill-Down.
 * - Ebene 1 (drillTyp gesetzt): "Allgemein" + Untertypen des gewählten Typs.
 * - Suche: Durchsucht Typen, Untertypen und konkrete Aktivitäten.
 * - Konkretisieren (filterTyp): Vorgefiltert, zeigt Repertoire + Untertypen.
 */
import { useState, useCallback, useMemo } from 'react'
import type { TreffenId, AktivitaetId } from '@/domain/ids'
import { newId } from '@/domain/ids'
import type {
  Programmpunkt,
  ProgrammpunktAbstrakt,
  ProgrammpunktKonkret,
  ProgrammpunktWegezeit,
  Aktivitaet,
} from '@/domain/types'
import type { TreffenMutations } from './TreffenKarte'
import { Spotlight, type SpotlightItem } from '@/ui/primitives/Spotlight'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { Icon } from '@/ui/primitives/Icon'
import {
  AKTIVITAET_TYPEN,
  TYP_LABELS,
  TYP_ICONS,
  UNTERTYPEN_FUER_TYP,
  UNTERTYP_LABELS,
  getWBDefaultTags,
  getWBDefaults,
  aktivitaetLabel,
  type AktivitaetTyp,
  type AktivitaetUntertyp,
} from '@/domain/aktivitaetKatalog'
import type { WBKey } from '@/domain/wb'

export type AddPunktSpotlightProps = {
  treffenId: TreffenId
  mutations: TreffenMutations
  onClose: () => void
  /** If set, pre-filter to this type (for "Konkretisieren" flow). */
  filterTyp?: AktivitaetTyp
  filterUntertyp?: AktivitaetUntertyp
}

// ─── WB distance for sorting ───────────────────────────────────────────────

type WBProfile = Record<WBKey, number>

function wbDistance(a: WBProfile, b: WBProfile): number {
  let sum = 0
  for (const k of ['koerperlich', 'gesellschaftlich', 'geistig', 'geistlich'] as WBKey[]) {
    sum += (a[k] - b[k]) ** 2
  }
  return sum
}

function aktivitaetWBProfile(akt: Aktivitaet): WBProfile {
  const defaults = getWBDefaults(akt.typ, akt.untertyp)
  if (akt.wbTags.length > 0) {
    const profile: WBProfile = { koerperlich: 0, gesellschaftlich: 0, geistig: 0, geistlich: 0 }
    for (const tag of akt.wbTags) {
      profile[tag.key] = Math.max(profile[tag.key], tag.intensity)
    }
    return profile
  }
  return defaults
}

// ─── Chevron trailing for drill-down ──────────────────────────────────────

const drillChevron = (
  <Icon name="chevron-right" size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
)

// ─── Component ─────────────────────────────────────────────────────────────

export function AddPunktSpotlight({
  treffenId,
  mutations,
  onClose,
  filterTyp,
  filterUntertyp,
}: AddPunktSpotlightProps) {
  const [query, setQuery] = useState('')
  const { aktivitaeten } = useRepertoire()

  // Drill-down state: which type are we looking at subtypes for?
  const [drillTyp, setDrillTyp] = useState<AktivitaetTyp | null>(null)

  const addKonkret = useCallback(
    (akt: Aktivitaet) => {
      const wbTags = akt.wbTags.length > 0
        ? akt.wbTags
        : getWBDefaultTags(akt.typ, akt.untertyp)

      const pp: Omit<ProgrammpunktKonkret, 'id'> = {
        kind: 'konkret',
        name: akt.name,
        aktivitaetId: akt.id,
        typ: akt.typ,
        untertyp: akt.untertyp,
        wbTags,
        dauerMin: akt.zeitMin,
      }
      mutations.addProgrammpunkt(treffenId, pp)
      onClose()
    },
    [treffenId, mutations, onClose],
  )

  const addAbstrakt = useCallback(
    (typ: AktivitaetTyp, untertyp?: AktivitaetUntertyp) => {
      const pp: Omit<ProgrammpunktAbstrakt, 'id'> = {
        kind: 'abstrakt',
        name: aktivitaetLabel(typ, untertyp),
        typ,
        untertyp,
        wbTags: getWBDefaultTags(typ, untertyp),
        dauerMin: 15,
      }
      mutations.addProgrammpunkt(treffenId, pp)
      onClose()
    },
    [treffenId, mutations, onClose],
  )

  const addWegezeit = useCallback(() => {
    const pp: Omit<ProgrammpunktWegezeit, 'id'> = {
      kind: 'wegezeit',
      name: 'Wegezeit',
      wbTags: [],
      dauerMin: 10,
    }
    mutations.addProgrammpunkt(treffenId, pp)
    onClose()
  }, [treffenId, mutations, onClose])

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q)
    // Reset drill-down when user starts typing
    if (q.trim()) setDrillTyp(null)
  }, [])

  const items = useMemo((): SpotlightItem[] => {
    const q = query.toLowerCase().trim()
    const result: SpotlightItem[] = []

    // Active type scope (either from drill-down or from Konkretisieren filter)
    const activeTyp = filterTyp ?? drillTyp

    // ─── Drilled-in or Konkretisieren: show subtypes + repertoire ───
    if (activeTyp && !q) {
      const uTypen = UNTERTYPEN_FUER_TYP[activeTyp]

      // "Allgemein" entry (no subtype — quick pick)
      result.push({
        id: `typ-${activeTyp}-allgemein`,
        label: `${TYP_LABELS[activeTyp]} (allgemein)`,
        icon: TYP_ICONS[activeTyp],
        onSelect: () => addAbstrakt(activeTyp),
      })

      // Subtypes
      if (uTypen) {
        for (const ut of uTypen) {
          if (filterUntertyp && ut !== filterUntertyp) continue
          result.push({
            id: `typ-${activeTyp}-${ut}`,
            label: UNTERTYP_LABELS[ut],
            icon: TYP_ICONS[activeTyp],
            onSelect: () => addAbstrakt(activeTyp, ut),
          })
        }
      }

      // Repertoire items matching this type
      const relevantAkt = aktivitaeten.filter((a) => {
        if (a.deaktiviert || a.typ === 'wegezeit') return false
        if (a.typ !== activeTyp) return false
        if (filterUntertyp && a.untertyp !== filterUntertyp) return false
        return true
      })

      if (relevantAkt.length > 0) {
        const refProfile = getWBDefaults(activeTyp, filterUntertyp)
        const sorted = [...relevantAkt].sort((a, b) =>
          wbDistance(aktivitaetWBProfile(a), refProfile) -
          wbDistance(aktivitaetWBProfile(b), refProfile),
        )
        for (const akt of sorted.slice(0, 15)) {
          result.push({
            id: `akt-${akt.id}`,
            label: akt.name,
            description: `${akt.zeitMin}–${akt.zeitMax} min`,
            icon: TYP_ICONS[akt.typ],
            onSelect: () => addKonkret(akt),
          })
        }
      }

      return result
    }

    // ─── Top-level type list (no query, no drill) ───────────────────
    if (!q && !activeTyp) {
      for (const typ of AKTIVITAET_TYPEN) {
        if (typ === 'wegezeit') continue
        const hasSubtypes = typ in UNTERTYPEN_FUER_TYP
        result.push({
          id: `typ-${typ}`,
          label: TYP_LABELS[typ],
          icon: TYP_ICONS[typ],
          trailing: hasSubtypes ? drillChevron : undefined,
          onSelect: hasSubtypes
            ? () => setDrillTyp(typ)
            : () => addAbstrakt(typ),
        })
      }
      // Wegezeit at the end
      result.push({
        id: 'wegezeit',
        label: 'Wegezeit',
        description: 'Zeitspanne ohne WB',
        icon: 'clock',
        onSelect: addWegezeit,
      })
      return result
    }

    // ─── Search mode: types + subtypes + repertoire ─────────────────
    if (q) {
      // Types & subtypes
      for (const typ of AKTIVITAET_TYPEN) {
        if (typ === 'wegezeit') continue
        const label = TYP_LABELS[typ]
        const typMatches = label.toLowerCase().includes(q)
        const hasSubtypes = typ in UNTERTYPEN_FUER_TYP

        if (typMatches) {
          result.push({
            id: `typ-${typ}`,
            label,
            icon: TYP_ICONS[typ],
            trailing: hasSubtypes ? drillChevron : undefined,
            onSelect: hasSubtypes
              ? () => { setDrillTyp(typ); setQuery('') }
              : () => addAbstrakt(typ),
          })
        }

        // Search subtypes
        const uTypen = UNTERTYPEN_FUER_TYP[typ]
        if (uTypen) {
          for (const ut of uTypen) {
            const utLabel = UNTERTYP_LABELS[ut]
            if (utLabel.toLowerCase().includes(q) || typMatches) {
              // Only add if not redundant with parent (skip if parent already matched and this is just inherited)
              if (!typMatches || utLabel.toLowerCase().includes(q)) {
                result.push({
                  id: `typ-${typ}-${ut}`,
                  label: utLabel,
                  description: label,
                  icon: TYP_ICONS[typ],
                  onSelect: () => addAbstrakt(typ, ut),
                })
              }
            }
          }
        }
      }

      // Wegezeit
      if ('wegezeit'.includes(q)) {
        result.push({
          id: 'wegezeit',
          label: 'Wegezeit',
          description: 'Zeitspanne ohne WB',
          icon: 'clock',
          onSelect: addWegezeit,
        })
      }

      // Repertoire items matching query
      const matched = aktivitaeten.filter((a) => {
        if (a.deaktiviert || a.typ === 'wegezeit') return false
        return a.name.toLowerCase().includes(q) ||
          TYP_LABELS[a.typ].toLowerCase().includes(q) ||
          (a.untertyp && UNTERTYP_LABELS[a.untertyp].toLowerCase().includes(q))
      })

      for (const akt of matched.slice(0, 15)) {
        const typLabel = akt.untertyp
          ? `${TYP_LABELS[akt.typ]} · ${UNTERTYP_LABELS[akt.untertyp]}`
          : TYP_LABELS[akt.typ]
        result.push({
          id: `akt-${akt.id}`,
          label: akt.name,
          description: `${typLabel} · ${akt.zeitMin}–${akt.zeitMax} min`,
          icon: TYP_ICONS[akt.typ],
          onSelect: () => addKonkret(akt),
        })
      }
    }

    return result
  }, [query, aktivitaeten, filterTyp, filterUntertyp, drillTyp, addKonkret, addAbstrakt, addWegezeit])

  const placeholder = filterTyp
    ? `${TYP_LABELS[filterTyp]} durchsuchen…`
    : drillTyp
      ? `${TYP_LABELS[drillTyp]} — Untertyp wählen…`
      : 'Aktivität suchen…'

  return (
    <Spotlight
      open
      onClose={onClose}
      query={query}
      onQueryChange={handleQueryChange}
      items={items}
      placeholder={placeholder}
      emptyState="Keine passenden Aktivitäten gefunden."
    />
  )
}
