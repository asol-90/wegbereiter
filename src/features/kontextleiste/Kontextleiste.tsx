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
import { useMemo, useCallback, type DragEvent } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { WB_KEYS, type WBKey } from '@/domain/wb'
import {
  contributionOf,
  combine,
  normalize,
  characterize,
  characterLabel,
} from '@/domain/wbLogic'
import { wbZielverteilung } from '@/domain/wbZielverteilung'
import { parseIso } from '@/domain/dateUtils'
import type {
  Aktivitaet,
  Planung,
  Programmpunkt,
  Andachtsreihe,
  Abzeichen,
  StammKontext,
} from '@/domain/types'
import { WBDonut } from '@/ui/domain/WBDonut'
import { WBGoalBars, type WBGoalBarDatum } from '@/ui/domain/WBGoalBars'
import { Icon, AccordionGroup, type AccordionGroupItem } from '@/ui/primitives'
import { useStammKontext } from '@/features/stammKontext'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { useKontextDaten } from './useKontextDaten'
import {
  KONTEXT_DRAG_MIME,
  encodePayload,
  type KontextDragPayload,
} from './dragPayload'
import styles from './Kontextleiste.module.css'

// ─── Props ──────────────────────────────────────────────────────────────────

export type KontextleisteProps = {
  planung: Planung
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Kontextleiste({ planung }: KontextleisteProps) {
  const abzeichenIds = useMemo(
    () => planung.abzeichenAuswahl.map((a) => a.abzeichenId),
    [planung.abzeichenAuswahl],
  )
  // Migration: alte Planungen haben noch andachtsreiheIds statt andachtsreihenZuordnung
  const zuordnungen = useMemo(() => {
    if (planung.andachtsreihenZuordnung) return planung.andachtsreihenZuordnung
    // Fallback für Legacy-Daten
    const legacy = (planung as any).andachtsreiheIds as string[] | undefined
    if (legacy && legacy.length > 0) {
      return legacy.map((id: string) => ({ reiheId: id }))
    }
    return []
  }, [planung])
  const { andachtsreihen, abzeichen } = useKontextDaten(
    zuordnungen,
    abzeichenIds,
  )
  const { kontexte } = useStammKontext()
  const { aktivitaeten } = useRepertoire()
  const stammKontext = useMemo(
    () =>
      planung.stammKontextId
        ? kontexte.find((k) => k.id === planung.stammKontextId) ?? null
        : null,
    [kontexte, planung.stammKontextId],
  )

  // Build exclusive accordion items for sections 2–4
  const accordionItems = useMemo(() => {
    const items: AccordionGroupItem[] = []

    for (const reihe of andachtsreihen) {
      const zuweisungen = countAndachtsZuweisungen(reihe, planung)
      const total = reihe.einheiten.length
      const done = reihe.einheiten.filter(
        (e) => (zuweisungen.get(e.id as string)?.length ?? 0) > 0,
      ).length
      items.push({
        id: `andacht-${reihe.id}`,
        title: reihe.name,
        trailing: (
          <span className={styles.accordionCount}>
            {done}/{total}
          </span>
        ),
        children: (
          <AndachtsreiheInner
            reihe={reihe}
            planung={planung}
            zuweisungen={zuweisungen}
          />
        ),
      })
    }

    for (const abz of abzeichen) {
      const zuweisungen = countAbzeichenZuweisungen(abz, planung)
      const total = abz.anforderungen.length
      const done = abz.anforderungen.filter(
        (a) => (zuweisungen.get(a.id as string)?.length ?? 0) > 0,
      ).length
      items.push({
        id: `abzeichen-${abz.id}`,
        title: abz.name,
        trailing: (
          <span className={styles.accordionCount}>
            {done}/{total}
          </span>
        ),
        children: (
          <AbzeichenInner
            abzeichen={abz}
            zuweisungen={zuweisungen}
          />
        ),
      })
    }

    if (stammKontext) {
      const stammAktivitaeten = aktivitaeten.filter(
        (a) => a.stammImportId === stammKontext.stammImportId && !a.deaktiviert,
      )
      items.push({
        id: `stamm-${stammKontext.id}`,
        title: 'Stamm-Kontext',
        children: (
          <StammKontextInner
            kontext={stammKontext}
            aktivitaeten={stammAktivitaeten}
            planung={planung}
          />
        ),
      })
    }

    return items
  }, [andachtsreihen, abzeichen, stammKontext, aktivitaeten, planung])

  return (
    <div className={styles.root}>
      <WBSektion planung={planung} />

      {accordionItems.length > 0 && (
        <>
          <hr className={styles.separator} />
          <AccordionGroup
            items={accordionItems}
            mode="exclusive"
            defaultOpen={accordionItems[0]?.id}
          />
        </>
      )}
    </div>
  )
}

// ─── 1. WB-Sektion (always visible) ────────────────────────────────────────

function WBSektion({ planung }: { planung: Planung }) {
  const allPP = useMemo(() => {
    const pp: Programmpunkt[] = []
    for (const t of planung.treffen) {
      for (const p of t.programm) pp.push(p)
    }
    return pp
  }, [planung.treffen])

  const dist = useMemo(
    () => combine(...allPP.map(contributionOf)),
    [allPP],
  )

  const norm = useMemo(() => normalize(dist), [dist])
  const char = useMemo(() => characterize(dist), [dist])
  const charText = characterLabel(char)

  const targets = useMemo(
    () => wbZielverteilung(planung.wbSchwerpunkt),
    [planung.wbSchwerpunkt],
  )

  const barData = useMemo(() => {
    const result: Partial<Record<WBKey, WBGoalBarDatum>> = {}
    for (const k of WB_KEYS) {
      result[k] = {
        share: norm[k],
        target: targets
          ? [targets[k].min, targets[k].max]
          : undefined,
      }
    }
    return result
  }, [norm, targets])

  return (
    <section>
      <div className={styles.sectionLabel}>Wachstumsbereiche</div>
      <div className={styles.wbHeader}>
        <WBDonut values={norm} size={48} thickness={8} />
        <span className={styles.wbCharLabel}>{charText}</span>
      </div>
      <WBGoalBars data={barData} showPercent />
    </section>
  )
}

// ─── 2. Andachtsreihe (accordion body) ─────────────────────────────────────

function AndachtsreiheInner({
  reihe,
  planung,
  zuweisungen,
}: {
  reihe: Andachtsreihe
  planung: Planung
  zuweisungen: Map<string, string[]>
}) {
  const orderProblem = useMemo(() => {
    const firstDates: { index: number; datum: string }[] = []
    for (const einheit of reihe.einheiten) {
      const dates = zuweisungen.get(einheit.id as string)
      if (dates && dates.length > 0) {
        const sorted = [...dates].sort()
        firstDates.push({ index: einheit.index, datum: sorted[0] })
      }
    }
    for (let i = 1; i < firstDates.length; i++) {
      if (firstDates[i].datum < firstDates[i - 1].datum) return true
    }
    return false
  }, [reihe.einheiten, zuweisungen])

  return (
    <>
      {reihe.einheiten
        .slice()
        .sort((a, b) => a.index - b.index)
        .map((einheit) => {
          const dates = zuweisungen.get(einheit.id as string) ?? []
          const payload: KontextDragPayload = {
            kind: 'andacht',
            einheitId: einheit.id,
            label: einheit.titel,
          }
          return (
            <CheckRow
              key={einheit.id}
              label={einheit.titel}
              count={dates.length}
              dates={dates}
              payload={payload}
            />
          )
        })}
      {orderProblem && (
        <div className={styles.orderWarning}>
          <Icon name="warning" size={12} />
          <span>Reihenfolge weicht von Terminabfolge ab</span>
        </div>
      )}
    </>
  )
}

// ─── 3. Abzeichen (accordion body) ─────────────────────────────────────────

function AbzeichenInner({
  abzeichen,
  zuweisungen,
}: {
  abzeichen: Abzeichen
  zuweisungen: Map<string, string[]>
}) {
  return (
    <>
      {abzeichen.anforderungen.map((anf) => {
        const dates = zuweisungen.get(anf.id as string) ?? []
        const payload: KontextDragPayload = {
          kind: 'abzeichen',
          anforderungId: anf.id,
          label: anf.name,
          typ: anf.typ,
          untertyp: anf.untertyp,
          dauerMin: Math.round((anf.zeitMin + anf.zeitMax) / 2),
        }
        return (
          <CheckRow
            key={anf.id}
            label={anf.name}
            count={dates.length}
            dates={dates}
            payload={payload}
          />
        )
      })}
    </>
  )
}

// ─── 4. Stamm-Kontext (accordion body) ─────────────────────────────────────

function StammKontextInner({
  kontext,
  aktivitaeten,
  planung,
}: {
  kontext: StammKontext
  aktivitaeten: Aktivitaet[]
  planung: Planung
}) {
  const usageDates = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of planung.treffen) {
      for (const pp of t.programm) {
        if (pp.kind === 'konkret') {
          const key = pp.aktivitaetId as string
          const existing = map.get(key) ?? []
          existing.push(t.datum)
          map.set(key, existing)
        }
      }
    }
    return map
  }, [planung.treffen])

  return (
    <>
      <div className={styles.stammThema}>{kontext.thema}</div>
      {kontext.themaBeschreibung && (
        <div className={styles.stammBeschreibung}>
          {kontext.themaBeschreibung}
        </div>
      )}
      {aktivitaeten.map((akt) => {
        const dates = usageDates.get(akt.id as string) ?? []
        const payload: KontextDragPayload = {
          kind: 'aktivitaet',
          aktivitaetId: akt.id,
          label: akt.name,
          typ: akt.typ,
          untertyp: akt.untertyp,
          dauerMin: Math.round((akt.zeitMin + akt.zeitMax) / 2),
          wbTags: akt.wbTags,
        }
        return (
          <CheckRow
            key={akt.id}
            label={akt.name}
            count={dates.length}
            dates={dates}
            payload={payload}
          />
        )
      })}
    </>
  )
}

// ─── Shared: CheckRow with native DnD ──────────────────────────────────────

function CheckRow({
  label,
  count,
  dates,
  subtitle,
  payload,
}: {
  label: string
  count: number
  dates: string[]
  subtitle?: string
  payload: KontextDragPayload
}) {
  const done = count > 0
  const sortedDates = useMemo(
    () =>
      [...dates]
        .sort()
        .map((d) => format(parseIso(d), 'd. MMM', { locale: de })),
    [dates],
  )

  const handleDragStart = useCallback(
    (e: DragEvent) => {
      e.dataTransfer.setData(KONTEXT_DRAG_MIME, encodePayload(payload))
      e.dataTransfer.effectAllowed = 'copy'
    },
    [payload],
  )

  return (
    <div
      className={styles.checkRow}
      draggable
      onDragStart={handleDragStart}
      title={
        sortedDates.length > 0
          ? sortedDates.join(', ')
          : subtitle ?? undefined
      }
    >
      <span className={styles.checkIcon}>
        {done ? (
          <Icon name="check" size={14} className={styles.checkDone} />
        ) : (
          <span className={styles.checkCircle} />
        )}
      </span>
      <span className={styles.checkLabel}>{label}</span>
      <span className={styles.checkCount}>
        {count > 0 ? `${count}×` : ''}
      </span>
      <Icon name="drag-handle" size={10} className={styles.dragGrip} />
    </div>
  )
}

// ─── Data helpers ───────────────────────────────────────────────────────────

function countAndachtsZuweisungen(
  reihe: Andachtsreihe,
  planung: Planung,
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const t of planung.treffen) {
    for (const pp of t.programm) {
      if (pp.andachtsEinheitId) {
        const key = pp.andachtsEinheitId as string
        const existing = map.get(key) ?? []
        existing.push(t.datum)
        map.set(key, existing)
      }
    }
  }
  return map
}

function countAbzeichenZuweisungen(
  abz: Abzeichen,
  planung: Planung,
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const t of planung.treffen) {
    for (const pp of t.programm) {
      if (pp.kind === 'wegezeit') continue
      for (const anf of abz.anforderungen) {
        if (
          pp.typ === anf.typ &&
          (anf.untertyp == null || pp.untertyp === anf.untertyp)
        ) {
          const key = anf.id as string
          const existing = map.get(key) ?? []
          existing.push(t.datum)
          map.set(key, existing)
        }
      }
    }
  }
  return map
}

