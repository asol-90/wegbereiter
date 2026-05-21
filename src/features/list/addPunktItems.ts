/**
 * Pure helpers that build the SpotlightItem list for AddPunktSpotlight.
 *
 * Three modes:
 * - Drilled / Konkretisieren: subtypes of a specific Typ + matching repertoire
 * - Top-level: list of all Typen + Wegezeit
 * - Search: free-text against Typen, Untertypen, and repertoire
 */
import {
  AKTIVITAET_TYPEN,
  type AktivitaetTyp, type AktivitaetUntertyp,
  getWBDefaults, getWBDefaultTags, TYP_ICONS, TYP_LABELS, UNTERTYP_LABELS, UNTERTYPEN_FUER_TYP,
} from '@/domain/aktivitaetKatalog'
import type { Aktivitaet } from '@/domain/types'
import { type WBKey } from '@/domain/wb'
import type { SpotlightItem } from '@/ui/primitives/Spotlight'
import type { ReactNode } from 'react'

type WBProfile = Record<WBKey, number>

function wbDistance(a: WBProfile, b: WBProfile): number {
  const keys: WBKey[] = ['koerperlich', 'gesellschaftlich', 'geistig', 'geistlich']
  return keys.reduce((sum, k) => sum + (a[k] - b[k]) ** 2, 0)
}

function aktivitaetWBProfile(akt: Aktivitaet): WBProfile {
  if (akt.wbTags.length === 0) return getWBDefaults(akt.typ, akt.untertyp)
  const profile: WBProfile = { koerperlich: 0, gesellschaftlich: 0, geistig: 0, geistlich: 0 }
  for (const tag of akt.wbTags) {
    profile[tag.key] = Math.max(profile[tag.key], tag.intensity)
  }
  return profile
}

const EXCLUDED_FROM_MENU: ReadonlySet<AktivitaetTyp> = new Set(['wegezeit', 'sonstiges', 'stammformat'])

export type ItemsContext = {
  aktivitaeten: readonly Aktivitaet[]
  filterUntertyp?: AktivitaetUntertyp
  drillChevron: ReactNode
  addKonkret: (akt: Aktivitaet) => void
  addAbstrakt: (typ: AktivitaetTyp, untertyp?: AktivitaetUntertyp, name?: string) => void
  addWegezeit: () => void
  onDrillTyp: (typ: AktivitaetTyp | null) => void
  setQuery: (q: string) => void
}

// ─── Drilled / Konkretisieren mode ────────────────────────────────────────────

export function buildDrilledItems(activeTyp: AktivitaetTyp, ctx: ItemsContext): SpotlightItem[] {
  const { filterUntertyp, aktivitaeten, addAbstrakt, addKonkret } = ctx
  const items: SpotlightItem[] = []

  items.push({
    id: `typ-${activeTyp}-allgemein`,
    label: `${TYP_LABELS[activeTyp]} (allgemein)`,
    icon: TYP_ICONS[activeTyp],
    onSelect: () => addAbstrakt(activeTyp),
  })

  const uTypen = UNTERTYPEN_FUER_TYP[activeTyp]
  if (uTypen) {
    for (const ut of uTypen) {
      if (filterUntertyp && ut !== filterUntertyp) continue
      items.push({
        id: `typ-${activeTyp}-${ut}`,
        label: UNTERTYP_LABELS[ut],
        icon: TYP_ICONS[activeTyp],
        onSelect: () => addAbstrakt(activeTyp, ut),
      })
    }
  }

  const relevant = aktivitaeten.filter((a) =>
    !a.deaktiviert && a.typ !== 'wegezeit' && a.typ === activeTyp
    && (!filterUntertyp || a.untertyp === filterUntertyp),
  )
  if (relevant.length === 0) return items

  const refProfile = getWBDefaults(activeTyp, filterUntertyp)
  const sorted = [...relevant].sort(
    (a, b) => wbDistance(aktivitaetWBProfile(a), refProfile) - wbDistance(aktivitaetWBProfile(b), refProfile),
  )
  for (const akt of sorted.slice(0, 15)) {
    items.push({
      id: `akt-${akt.id}`,
      label: akt.name,
      description: `${akt.zeitMin}–${akt.zeitMax} min`,
      icon: TYP_ICONS[akt.typ] ?? 'more-horizontal',
      onSelect: () => addKonkret(akt),
    })
  }
  return items
}

// ─── Top-level mode (no query, no drill) ──────────────────────────────────────

export function buildTopLevelItems(ctx: ItemsContext): SpotlightItem[] {
  const { addAbstrakt, addWegezeit, drillChevron, onDrillTyp } = ctx
  const items: SpotlightItem[] = []
  for (const typ of AKTIVITAET_TYPEN) {
    if (EXCLUDED_FROM_MENU.has(typ)) continue
    const hasSubtypes = typ in UNTERTYPEN_FUER_TYP
    items.push({
      id: `typ-${typ}`,
      label: TYP_LABELS[typ],
      icon: TYP_ICONS[typ],
      trailing: hasSubtypes ? drillChevron : undefined,
      onSelect: hasSubtypes ? () => onDrillTyp(typ) : () => addAbstrakt(typ),
    })
  }
  items.push({
    id: 'wegezeit',
    label: 'Wegezeit',
    description: 'Zeitspanne ohne WB',
    icon: 'clock',
    onSelect: addWegezeit,
  })
  return items
}

// ─── Search mode ──────────────────────────────────────────────────────────────

function pushSubtypeMatches(
  typ: AktivitaetTyp, q: string, typMatches: boolean,
  ctx: ItemsContext, into: SpotlightItem[],
) {
  const uTypen = UNTERTYPEN_FUER_TYP[typ]
  if (!uTypen) return
  for (const ut of uTypen) {
    const utLabel = UNTERTYP_LABELS[ut]
    const utMatches = utLabel.toLowerCase().includes(q)
    // Skip if only the parent matched (avoids redundant entries)
    if (!utMatches && typMatches) continue
    if (!utMatches && !typMatches) continue
    into.push({
      id: `typ-${typ}-${ut}`,
      label: utLabel,
      description: TYP_LABELS[typ],
      icon: TYP_ICONS[typ],
      onSelect: () => ctx.addAbstrakt(typ, ut),
    })
  }
}

function pushTypeMatches(q: string, ctx: ItemsContext, into: SpotlightItem[]) {
  const { drillChevron, addAbstrakt, onDrillTyp, setQuery } = ctx
  for (const typ of AKTIVITAET_TYPEN) {
    if (EXCLUDED_FROM_MENU.has(typ)) continue
    const label = TYP_LABELS[typ]
    const typMatches = label.toLowerCase().includes(q)
    const hasSubtypes = typ in UNTERTYPEN_FUER_TYP
    if (typMatches) {
      into.push({
        id: `typ-${typ}`,
        label,
        icon: TYP_ICONS[typ],
        trailing: hasSubtypes ? drillChevron : undefined,
        onSelect: hasSubtypes ? () => { onDrillTyp(typ); setQuery('') } : () => addAbstrakt(typ),
      })
    }
    pushSubtypeMatches(typ, q, typMatches, ctx, into)
  }
}

function pushAktivitaetMatches(q: string, ctx: ItemsContext, into: SpotlightItem[]) {
  const matched = ctx.aktivitaeten.filter((a) => {
    if (a.deaktiviert || a.typ === 'wegezeit') return false
    return a.name.toLowerCase().includes(q)
      || TYP_LABELS[a.typ]?.toLowerCase().includes(q)
      || (a.untertyp && UNTERTYP_LABELS[a.untertyp]?.toLowerCase().includes(q))
  })
  for (const akt of matched.slice(0, 15)) {
    const typLabel = akt.untertyp
      ? `${TYP_LABELS[akt.typ] ?? akt.typ} · ${UNTERTYP_LABELS[akt.untertyp] ?? akt.untertyp}`
      : (TYP_LABELS[akt.typ] ?? akt.typ)
    into.push({
      id: `akt-${akt.id}`,
      label: akt.name,
      description: `${typLabel} · ${akt.zeitMin}–${akt.zeitMax} min`,
      icon: TYP_ICONS[akt.typ] ?? 'more-horizontal',
      onSelect: () => ctx.addKonkret(akt),
    })
  }
}

export function buildSearchItems(query: string, ctx: ItemsContext): SpotlightItem[] {
  const q = query.toLowerCase().trim()
  const items: SpotlightItem[] = []
  pushTypeMatches(q, ctx, items)
  if ('wegezeit'.includes(q)) {
    items.push({
      id: 'wegezeit', label: 'Wegezeit', description: 'Zeitspanne ohne WB',
      icon: 'clock', onSelect: ctx.addWegezeit,
    })
  }
  pushAktivitaetMatches(q, ctx, items)
  if (items.length === 0) {
    items.push({
      id: 'sonstiges-neu',
      label: `„${query}" als Sonstiges eintragen`,
      icon: 'more-horizontal',
      onSelect: () => ctx.addAbstrakt('sonstiges', undefined, query),
    })
  }
  return items
}

// ─── Top-level dispatcher ────────────────────────────────────────────────────

export type BuildItemsInput = {
  query: string
  filterTyp?: AktivitaetTyp
  drillTyp: AktivitaetTyp | null
  ctx: ItemsContext
}

export function buildSpotlightItems({ query, filterTyp, drillTyp, ctx }: BuildItemsInput): SpotlightItem[] {
  const q = query.toLowerCase().trim()
  const activeTyp = filterTyp ?? drillTyp
  if (activeTyp && !q) return buildDrilledItems(activeTyp, ctx)
  if (!q && !activeTyp) return buildTopLevelItems(ctx)
  return buildSearchItems(query, ctx)
}

// ─── Programmpunkt builders ──────────────────────────────────────────────────

export function buildKonkretFromAktivitaet(akt: Aktivitaet) {
  return {
    kind: 'konkret' as const,
    name: akt.name,
    aktivitaetId: akt.id,
    typ: akt.typ,
    untertyp: akt.untertyp,
    wbTags: akt.wbTags.length > 0 ? akt.wbTags : getWBDefaultTags(akt.typ, akt.untertyp),
    dauerMin: akt.zeitMin,
  }
}
