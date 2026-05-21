/**
 * Sub-components used by Kontextleiste: WB header section + accordion bodies
 * for Andachtsreihen, Abzeichen, and Stamm-Kontext.
 */
import { parseIso } from '@/domain/dateUtils'
import type {
  Abzeichen, Aktivitaet, Andachtsreihe, Planung, Programmpunkt, StammKontext,
} from '@/domain/types'
import { WB_KEYS, type WBKey } from '@/domain/wb'
import {
  characterize, characterLabel, combine, contributionOf, normalize,
} from '@/domain/wbLogic'
import { wbZielverteilung } from '@/domain/wbZielverteilung'
import { WBDonut } from '@/ui/domain/WBDonut'
import { type WBGoalBarDatum, WBGoalBars } from '@/ui/domain/WBGoalBars'
import { Icon } from '@/ui/primitives'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { type DragEvent, useCallback, useMemo } from 'react'
import { encodePayload, KONTEXT_DRAG_MIME, type KontextDragPayload } from './dragPayload'
import styles from './Kontextleiste.module.css'

// ─── WB-Sektion ──────────────────────────────────────────────────────────────

export function WBSektion({ planung }: { planung: Planung }) {
  const allPP = useMemo(() => {
    const pp: Programmpunkt[] = []
    for (const t of planung.treffen) for (const p of t.programm) pp.push(p)
    return pp
  }, [planung.treffen])

  const dist = useMemo(() => combine(...allPP.map(contributionOf)), [allPP])
  const norm = useMemo(() => normalize(dist), [dist])
  const char = useMemo(() => characterize(dist), [dist])
  const targets = useMemo(() => wbZielverteilung(planung.wbSchwerpunkt), [planung.wbSchwerpunkt])

  const barData = useMemo(() => {
    const result: Partial<Record<WBKey, WBGoalBarDatum>> = {}
    for (const k of WB_KEYS) {
      result[k] = { share: norm[k], target: targets ? [targets[k].min, targets[k].max] : undefined }
    }
    return result
  }, [norm, targets])

  return (
    <section>
      <div className={styles.sectionLabel}>Wachstumsbereiche</div>
      <div className={styles.wbHeader}>
        <WBDonut values={norm} size={48} thickness={8} />
        <span className={styles.wbCharLabel}>{characterLabel(char)}</span>
      </div>
      <WBGoalBars data={barData} showPercent />
    </section>
  )
}

// ─── Shared: CheckRow with native DnD ────────────────────────────────────────

export type CheckRowProps = {
  label: string
  count: number
  dates: string[]
  subtitle?: string
  payload: KontextDragPayload
}

export function CheckRow({ label, count, dates, subtitle, payload }: CheckRowProps) {
  const done = count > 0
  const sortedDates = useMemo(
    () => [...dates].sort().map((d) => format(parseIso(d), 'd. MMM', { locale: de })),
    [dates],
  )

  const handleDragStart = useCallback((e: DragEvent) => {
    e.dataTransfer.setData(KONTEXT_DRAG_MIME, encodePayload(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }, [payload])

  return (
    <div
      className={styles.checkRow}
      draggable
      onDragStart={handleDragStart}
      title={sortedDates.length > 0 ? sortedDates.join(', ') : subtitle ?? undefined}
    >
      <span className={styles.checkIcon}>
        {done
          ? <Icon name="check" size={14} className={styles.checkDone} />
          : <span className={styles.checkCircle} />}
      </span>
      <span className={styles.checkLabel}>{label}</span>
      <span className={styles.checkCount}>{count > 0 ? `${count}×` : ''}</span>
      <Icon name="drag-handle" size={10} className={styles.dragGrip} />
    </div>
  )
}

// ─── Andachtsreihe ───────────────────────────────────────────────────────────

export type AndachtsreiheInnerProps = {
  reihe: Andachtsreihe
  zuweisungen: Map<string, string[]>
}

export function AndachtsreiheInner({ reihe, zuweisungen }: AndachtsreiheInnerProps) {
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
      {reihe.einheiten.slice().sort((a, b) => a.index - b.index).map((einheit) => {
        const dates = zuweisungen.get(einheit.id as string) ?? []
        const payload: KontextDragPayload = {
          kind: 'andacht', einheitId: einheit.id, label: einheit.titel,
        }
        return (
          <CheckRow key={einheit.id} label={einheit.titel}
            count={dates.length} dates={dates} payload={payload} />
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

// ─── Abzeichen ───────────────────────────────────────────────────────────────

export function AbzeichenInner({
  abzeichen, zuweisungen,
}: { abzeichen: Abzeichen; zuweisungen: Map<string, string[]> }) {
  return (
    <>
      {abzeichen.anforderungen.map((anf) => {
        const dates = zuweisungen.get(anf.id as string) ?? []
        const payload: KontextDragPayload = {
          kind: 'abzeichen', anforderungId: anf.id, label: anf.name,
          typ: anf.typ, untertyp: anf.untertyp,
          dauerMin: Math.round((anf.zeitMin + anf.zeitMax) / 2),
        }
        return (
          <CheckRow key={anf.id} label={anf.name}
            count={dates.length} dates={dates} payload={payload} />
        )
      })}
    </>
  )
}

// ─── Stamm-Kontext ───────────────────────────────────────────────────────────

export type StammKontextInnerProps = {
  kontext: StammKontext
  aktivitaeten: readonly Aktivitaet[]
  planung: Planung
}

export function StammKontextInner({ kontext, aktivitaeten, planung }: StammKontextInnerProps) {
  const usageDates = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const t of planung.treffen) {
      for (const pp of t.programm) {
        if (pp.kind !== 'konkret') continue
        const key = pp.aktivitaetId as string
        const list = map.get(key) ?? []
        list.push(t.datum)
        map.set(key, list)
      }
    }
    return map
  }, [planung.treffen])

  return (
    <>
      <div className={styles.stammThema}>{kontext.thema}</div>
      {kontext.themaBeschreibung && (
        <div className={styles.stammBeschreibung}>{kontext.themaBeschreibung}</div>
      )}
      {aktivitaeten.map((akt) => {
        const dates = usageDates.get(akt.id as string) ?? []
        const payload: KontextDragPayload = {
          kind: 'aktivitaet', aktivitaetId: akt.id, label: akt.name,
          typ: akt.typ, untertyp: akt.untertyp,
          dauerMin: Math.round((akt.zeitMin + akt.zeitMax) / 2),
          wbTags: akt.wbTags,
        }
        return (
          <CheckRow key={akt.id} label={akt.name}
            count={dates.length} dates={dates} payload={payload} />
        )
      })}
    </>
  )
}
