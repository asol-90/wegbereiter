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
import {
  aktivitaetLabel, getWBDefaultTags, TYP_LABELS,
  type AktivitaetTyp, type AktivitaetUntertyp,
} from '@/domain/aktivitaetKatalog'
import type { TreffenId } from '@/domain/ids'
import type {
  Aktivitaet, ProgrammpunktAbstrakt, ProgrammpunktWegezeit,
} from '@/domain/types'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { Icon } from '@/ui/primitives/Icon'
import { Spotlight } from '@/ui/primitives/Spotlight'
import { useCallback, useMemo, useState } from 'react'
import type { TreffenMutations } from './TreffenKarte'
import { buildKonkretFromAktivitaet, buildSpotlightItems, type ItemsContext } from './addPunktItems'

export type AddPunktSpotlightProps = {
  treffenId: TreffenId
  mutations: TreffenMutations
  onClose: () => void
  /** If set, pre-filter to this type (for "Konkretisieren" flow). */
  filterTyp?: AktivitaetTyp
  filterUntertyp?: AktivitaetUntertyp
}

const drillChevron = (
  <Icon name="chevron-right" size={12} style={{ opacity: 0.35, flexShrink: 0 }} />
)

export function AddPunktSpotlight({
  treffenId, mutations, onClose, filterTyp, filterUntertyp,
}: AddPunktSpotlightProps) {
  const [query, setQuery] = useState('')
  const [drillTyp, setDrillTyp] = useState<AktivitaetTyp | null>(null)
  const { aktivitaeten } = useRepertoire()

  const addKonkret = useCallback(
    (akt: Aktivitaet) => {
      mutations.addProgrammpunkt(treffenId, buildKonkretFromAktivitaet(akt))
      onClose()
    },
    [treffenId, mutations, onClose],
  )

  const addAbstrakt = useCallback(
    (typ: AktivitaetTyp, untertyp?: AktivitaetUntertyp, name?: string) => {
      const pp: Omit<ProgrammpunktAbstrakt, 'id'> = {
        kind: 'abstrakt',
        name: name ?? aktivitaetLabel(typ, untertyp),
        typ, untertyp,
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
      kind: 'wegezeit', name: 'Wegezeit', wbTags: [], dauerMin: 10,
    }
    mutations.addProgrammpunkt(treffenId, pp)
    onClose()
  }, [treffenId, mutations, onClose])

  const handleQueryChange = useCallback((q: string) => {
    setQuery(q)
    if (q.trim()) setDrillTyp(null)
  }, [])

  const items = useMemo(() => {
    const ctx: ItemsContext = {
      aktivitaeten, filterUntertyp, drillChevron,
      addKonkret, addAbstrakt, addWegezeit,
      onDrillTyp: setDrillTyp, setQuery,
    }
    return buildSpotlightItems({ query, filterTyp, drillTyp, ctx })
  }, [query, aktivitaeten, filterTyp, filterUntertyp, drillTyp, addKonkret, addAbstrakt, addWegezeit])

  const placeholder = filterTyp
    ? `${TYP_LABELS[filterTyp]} durchsuchen…`
    : drillTyp
      ? `${TYP_LABELS[drillTyp]} — Untertyp wählen…`
      : 'Aktivität suchen…'

  return (
    <Spotlight
      open onClose={onClose}
      query={query} onQueryChange={handleQueryChange}
      items={items}
      placeholder={placeholder}
      emptyState="Keine passenden Aktivitäten gefunden."
    />
  )
}
