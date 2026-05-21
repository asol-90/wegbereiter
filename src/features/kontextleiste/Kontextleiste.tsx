/**
 * Kontextleiste — right panel in Calendar/List views (concept §6 + konzept-planungsziele-kontextleiste.md).
 *
 * Layout:
 * - WB section: always visible at top (no accordion)
 * - Separator
 * - Exclusive AccordionGroup for Andachtsreihe, Abzeichen, Stamm-Kontext
 *   (sections 2–4 only appear when data is present)
 *
 * Drag-to-assign: CheckRow items set native HTML DnD dataTransfer with
 * a KontextDragPayload. TreffenKarten act as drop targets.
 */
import { type AndachtsreiheId } from '@/domain/ids'
import type { Abzeichen, Andachtsreihe, Planung, StammKontext } from '@/domain/types'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { useStammKontext } from '@/features/stammKontext'
import { AccordionGroup, type AccordionGroupItem } from '@/ui/primitives'
import { useMemo } from 'react'
import { AbschlussSektion } from './AbschlussSektion'
import {
  AbzeichenInner, AndachtsreiheInner, StammKontextInner, WBSektion,
} from './KontextleisteSections'
import {
  countAbzeichenZuweisungen, countAndachtsZuweisungen,
} from './kontextleisteHelpers'
import styles from './Kontextleiste.module.css'
import { useKontextDaten } from './useKontextDaten'

export type KontextleisteProps = {
  planung: Planung
}

function useZuordnungen(planung: Planung) {
  return useMemo(() => {
    if (planung.andachtsreihenZuordnung) return planung.andachtsreihenZuordnung
    // Migration: alte Planungen haben noch andachtsreiheIds statt andachtsreihenZuordnung
    const legacy = (planung as { andachtsreiheIds?: string[] }).andachtsreiheIds
    if (legacy && legacy.length > 0) {
      return legacy.map((id) => ({ reiheId: id as AndachtsreiheId }))
    }
    return []
  }, [planung])
}

function countLabel(done: number, total: number) {
  return <span className={styles.accordionCount}>{done}/{total}</span>
}

function buildAndachtsItems(
  andachtsreihen: Andachtsreihe[], planung: Planung,
): AccordionGroupItem[] {
  return andachtsreihen.map((reihe) => {
    const zuweisungen = countAndachtsZuweisungen(planung)
    const done = reihe.einheiten.filter((e) => (zuweisungen.get(e.id as string)?.length ?? 0) > 0).length
    return {
      id: `andacht-${reihe.id}`,
      title: reihe.name,
      trailing: countLabel(done, reihe.einheiten.length),
      children: <AndachtsreiheInner reihe={reihe} zuweisungen={zuweisungen} />,
    }
  })
}

function buildAbzeichenItems(abzeichen: Abzeichen[], planung: Planung): AccordionGroupItem[] {
  return abzeichen.map((abz) => {
    const zuweisungen = countAbzeichenZuweisungen(abz, planung)
    const done = abz.anforderungen.filter((a) => (zuweisungen.get(a.id as string)?.length ?? 0) > 0).length
    return {
      id: `abzeichen-${abz.id}`,
      title: abz.name,
      trailing: countLabel(done, abz.anforderungen.length),
      children: <AbzeichenInner abzeichen={abz} zuweisungen={zuweisungen} />,
    }
  })
}

function buildStammItem(
  stammKontext: StammKontext, stammAktivitaeten: ReturnType<typeof useRepertoire>['aktivitaeten'],
  planung: Planung,
): AccordionGroupItem {
  return {
    id: `stamm-${stammKontext.id}`,
    title: 'Stamm-Kontext',
    children: <StammKontextInner kontext={stammKontext} aktivitaeten={stammAktivitaeten} planung={planung} />,
  }
}

export function Kontextleiste({ planung }: KontextleisteProps) {
  const abzeichenIds = useMemo(
    () => planung.abzeichenAuswahl.map((a) => a.abzeichenId),
    [planung.abzeichenAuswahl],
  )
  const zuordnungen = useZuordnungen(planung)
  const { andachtsreihen, abzeichen } = useKontextDaten(zuordnungen, abzeichenIds)
  const { kontexte } = useStammKontext()
  const { aktivitaeten } = useRepertoire()

  const stammKontext = useMemo(
    () => planung.stammKontextId
      ? kontexte.find((k) => k.id === planung.stammKontextId) ?? null
      : null,
    [kontexte, planung.stammKontextId],
  )
  const stammAktivitaeten = useMemo(
    () => stammKontext
      ? aktivitaeten.filter((a) => a.stammImportId === stammKontext.stammImportId && !a.deaktiviert)
      : [],
    [aktivitaeten, stammKontext],
  )

  const accordionItems = useMemo(() => {
    const items: AccordionGroupItem[] = [
      ...buildAndachtsItems(andachtsreihen, planung),
      ...buildAbzeichenItems(abzeichen, planung),
    ]
    if (stammKontext) items.push(buildStammItem(stammKontext, stammAktivitaeten, planung))
    return items
  }, [andachtsreihen, abzeichen, stammKontext, stammAktivitaeten, planung])

  return (
    <div className={styles.root}>
      <div className={styles.scrollArea}>
        <WBSektion planung={planung} />
        {accordionItems.length > 0 && (
          <>
            <hr className={styles.separator} />
            <AccordionGroup items={accordionItems} mode="exclusive" defaultOpen={accordionItems[0]?.id} />
          </>
        )}
      </div>
      <AbschlussSektion
        planung={planung}
        andachtsreihen={andachtsreihen}
        abzeichen={abzeichen}
        stammKontext={stammKontext}
        stammAktivitaeten={stammAktivitaeten}
        alleAktivitaeten={aktivitaeten}
      />
    </div>
  )
}
