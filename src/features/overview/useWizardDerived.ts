/**
 * Derived data for NewPlanungWizard. All useMemo calculations and helper
 * functions in one place so the body stays focused on state + render.
 *
 * The top-level hook composes smaller sub-hooks that each group cohesive
 * derivations (kontext data, meeting items, reasons, ziele sources).
 */
import { useCallback, useMemo } from 'react'
import type { IsoDate, Planung, StammAktion, StammBlock, StammKontext } from '@/domain/types'
import { generateTermine } from '@/domain/dateUtils'
import { generatePlanungsName } from '@/domain/planungFactory'
import { type AndachtsreiheId } from '@/domain/ids'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { classifyDay } from './monthGrid'
import { useFerienForYear, type FerienState } from './useFerienForYear'
import {
  buildBisPresets,
  findKontextForZeitraum,
  isoNextDay,
  isoPrevDay,
  kontextDateRange,
  previewSortKey,
  rhythmusFromKey,
  type AktionBereich,
  type AndachtMode,
  type BisPreset,
  type PreviewItem,
  type RhythmusKey,
} from './newPlanungWizardUtils'

// ─── Sub-hook results ─────────────────────────────────────────────────────────

type FerienResult = {
  ferienYear1: FerienState
  ferienYear2: FerienState
  isHoliday: (iso: IsoDate) => { ferien?: string; feiertag?: string } | null
}

type KontextResult = {
  activeKontext: StammKontext | undefined
  hasKontext: boolean
  kontextRange: { von: IsoDate; bis: IsoDate } | null
  isOutsideKontext: (iso: IsoDate) => boolean
  kontextTreffenInRange: StammKontext['treffen']
  kontextDateSet: Set<IsoDate>
  stammaktionenInRange: StammAktion[]
  alleAktionenInRange: Array<StammAktion & { bereich: AktionBereich }>
}

type ItemsResult = {
  generated: IsoDate[]
  mergedItems: PreviewItem[]
  activeMeetingCount: number
}

type ReasonsResult = {
  startReason: string | null
  endeReason: string | null
  autoName: string
  bisPresets: BisPreset[]
}

type ZielSourcesResult = {
  availableReihen: ReturnType<typeof useRepertoire>['andachtsreihen']
  availableSammlungen: ReturnType<typeof useRepertoire>['andachtsreihen']
  selectedSammlung: ReturnType<typeof useRepertoire>['andachtsreihen'][number] | null
  stammandachtenCount: number
  teamAndachtsBedarf: number
  stammAktivitaeten: ReturnType<typeof useRepertoire>['aktivitaeten']
}

// ─── Sub-hooks ────────────────────────────────────────────────────────────────

function useFerien(start: IsoDate, ende: IsoDate): FerienResult {
  const yearStart = useMemo(() => Number.parseInt(start.slice(0, 4), 10) || new Date().getFullYear(), [start])
  const yearEnd = useMemo(() => Number.parseInt(ende.slice(0, 4), 10) || yearStart, [ende, yearStart])
  const ferienYear1 = useFerienForYear(yearStart)
  const ferienYear2 = useFerienForYear(yearEnd !== yearStart ? yearEnd : yearStart)

  const isHoliday = useCallback(
    (iso: IsoDate) => {
      const y = Number.parseInt(iso.slice(0, 4), 10)
      const entry = y === yearStart ? ferienYear1 : ferienYear2
      const cls = classifyDay(iso, entry)
      if (!cls.ferien && !cls.feiertag) return null
      return { ferien: cls.ferien?.name, feiertag: cls.feiertag?.name }
    },
    [yearStart, ferienYear1, ferienYear2],
  )
  return { ferienYear1, ferienYear2, isHoliday }
}

function useKontext(kontexte: readonly StammKontext[], start: IsoDate, ende: IsoDate): KontextResult {
  const activeKontext = useMemo(
    () => (kontexte.length === 0 || !start || !ende ? undefined : findKontextForZeitraum(kontexte, start, ende)),
    [kontexte, start, ende],
  )
  const kontextRange = useMemo(() => (activeKontext ? kontextDateRange(activeKontext) : null), [activeKontext])

  const isOutsideKontext = useCallback(
    (iso: IsoDate) => !kontextRange || iso < kontextRange.von || iso > kontextRange.bis,
    [kontextRange],
  )

  const kontextTreffenInRange = useMemo(() => {
    if (!activeKontext || !start || !ende) return []
    return activeKontext.treffen
      .filter((t) => t.datum >= start && t.datum <= ende)
      .sort((a, b) => a.datum.localeCompare(b.datum))
  }, [activeKontext, start, ende])

  const kontextDateSet = useMemo(() => new Set(kontextTreffenInRange.map((t) => t.datum)), [kontextTreffenInRange])

  const stammaktionenInRange = useMemo(
    () => (activeKontext
      ? activeKontext.stammaktionen.filter((a) => a.beginn <= ende && a.ende >= start).sort((a, b) => a.beginn.localeCompare(b.beginn))
      : []),
    [activeKontext, start, ende],
  )

  const alleAktionenInRange = useMemo<Array<StammAktion & { bereich: AktionBereich }>>(() => {
    if (!activeKontext || !start || !ende) return []
    const bereiche: Array<[StammAktion[] | undefined, AktionBereich]> = [
      [activeKontext.stammaktionen, 'Stamm'],
      [activeKontext.distriktAktionen, 'Distrikt'],
      [activeKontext.regionalAktionen, 'Regional'],
    ]
    return bereiche
      .flatMap(([list, bereich]) => (list ?? []).filter((a) => a.beginn <= ende && a.ende >= start).map((a) => ({ ...a, bereich })))
      .sort((a, b) => a.beginn.localeCompare(b.beginn))
  }, [activeKontext, start, ende])

  return {
    activeKontext, hasKontext: !!activeKontext, kontextRange, isOutsideKontext,
    kontextTreffenInRange, kontextDateSet, stammaktionenInRange, alleAktionenInRange,
  }
}

type ItemsInput = {
  start: IsoDate
  ende: IsoDate
  weekday: Parameters<typeof generateTermine>[2]
  rhythmusK: RhythmusKey
  kontext: KontextResult
  ferien: FerienResult
  reinstated: ReadonlySet<IsoDate>
}

function useMeetingItems({ start, ende, weekday, rhythmusK, kontext, ferien, reinstated }: ItemsInput): ItemsResult {
  const rhythmus = useMemo(() => rhythmusFromKey(rhythmusK), [rhythmusK])
  const generated = useMemo<IsoDate[]>(
    () => (!start || !ende || start >= ende ? [] : generateTermine(start, ende, weekday, rhythmus)),
    [start, ende, weekday, rhythmus],
  )
  const { kontextTreffenInRange, kontextDateSet, kontextRange, alleAktionenInRange, isOutsideKontext } = kontext

  const generatedForGaps = useMemo(
    () => generated.filter((iso) => {
      if (kontextRange && iso >= kontextRange.von && iso <= kontextRange.bis) return false
      return !kontextDateSet.has(iso)
    }),
    [generated, kontextDateSet, kontextRange],
  )

  const mergedItems = useMemo<PreviewItem[]>(() => {
    const items: PreviewItem[] = [
      ...kontextTreffenInRange.map((t) => ({ kind: 'treffen' as const, iso: t.datum, source: 'kontext' as const })),
      ...generatedForGaps.map((iso) => ({ kind: 'treffen' as const, iso, source: 'generated' as const })),
      ...alleAktionenInRange.map((a) => ({ kind: 'aktion' as const, aktion: a, bereich: a.bereich })),
    ]
    return items.sort((a, b) => previewSortKey(a).localeCompare(previewSortKey(b)))
  }, [kontextTreffenInRange, generatedForGaps, alleAktionenInRange])

  const activeMeetingCount = useMemo(
    () => mergedItems.filter((item) => {
      if (item.kind === 'aktion' || item.source === 'kontext') return true
      if (!isOutsideKontext(item.iso)) return true
      if (!ferien.isHoliday(item.iso)) return true
      return reinstated.has(item.iso)
    }).length,
    [mergedItems, reinstated, isOutsideKontext, ferien],
  )

  return { generated, mergedItems, activeMeetingCount }
}

type ReasonsInput = {
  start: IsoDate
  ende: IsoDate
  planungen: readonly Planung[]
  activeKontext: StammKontext | undefined
  ferien: FerienResult
}

function buildStartReason(start: IsoDate, planungen: readonly Planung[], activeKontext: StammKontext | undefined): string | null {
  if (!start) return null
  const previous = planungen
    .filter((p) => p.zeitraum.ende < start)
    .sort((a, b) => b.zeitraum.ende.localeCompare(a.zeitraum.ende))[0]
  if (previous && isoNextDay(previous.zeitraum.ende) === start) return `Beginnt im Anschluss an „${previous.name}"`
  if (activeKontext) {
    const range = kontextDateRange(activeKontext)
    if (range && range.von === start) return `Beginnt mit Stammkontext „${activeKontext.thema}"`
  }
  return null
}

function buildEndeReason({ start, ende, activeKontext, planungen, ferien }: ReasonsInput): string | null {
  if (!ende || !start) return null
  if (activeKontext) {
    const range = kontextDateRange(activeKontext)
    if (range && range.bis === ende) return `Endet mit Stammkontext „${activeKontext.thema}"`
  }
  const next = planungen
    .filter((p) => p.zeitraum.start > start)
    .sort((a, b) => a.zeitraum.start.localeCompare(b.zeitraum.start))[0]
  if (next && isoPrevDay(next.zeitraum.start) === ende) return `Endet vor „${next.name}"`
  const allFerien = [...(ferien.ferienYear1?.ferien ?? []), ...(ferien.ferienYear2?.ferien ?? [])]
  const nextFerien = allFerien
    .filter((f) => f.start > start)
    .sort((a, b) => a.start.localeCompare(b.start))[0]
  if (nextFerien && isoPrevDay(nextFerien.start) === ende) return `Endet vor ${nextFerien.name}`
  return null
}

function useReasons(input: ReasonsInput): ReasonsResult {
  const { start, ende, planungen, activeKontext, ferien } = input
  const startReason = useMemo(() => buildStartReason(start, planungen, activeKontext), [start, planungen, activeKontext])
  const endeReason = useMemo(() => buildEndeReason(input), [input])
  const autoName = useMemo(() => (!start || !ende || start > ende ? '' : generatePlanungsName(start, ende)), [start, ende])
  const bisPresets = useMemo(
    () => buildBisPresets(start, ferien.ferienYear1?.ferien, ferien.ferienYear2?.ferien, activeKontext),
    [start, ferien, activeKontext],
  )
  return { startReason, endeReason, autoName, bisPresets }
}

type ZielSourcesInput = {
  andachtMode: AndachtMode
  andachtReiheId: AndachtsreiheId | null
  activeKontext: StammKontext | undefined
  kontextTreffenInRange: StammKontext['treffen']
  activeMeetingCount: number
}

function hasAndacht(blocks: StammBlock[] | undefined, fallback: StammBlock[]) {
  return (blocks ?? fallback).some((b) => b.untertyp === 'andacht')
}

function useZielSources(input: ZielSourcesInput): ZielSourcesResult {
  const repertoireState = useRepertoire()
  const { andachtMode, andachtReiheId, activeKontext, kontextTreffenInRange, activeMeetingCount } = input

  const availableReihen = useMemo(
    () => repertoireState.andachtsreihen.filter((r) => r.art === 'reihe' && !r.deaktiviert),
    [repertoireState.andachtsreihen],
  )
  const availableSammlungen = useMemo(
    () => repertoireState.andachtsreihen.filter((r) => r.art === 'sammlung' && !r.deaktiviert),
    [repertoireState.andachtsreihen],
  )
  const selectedSammlung = useMemo(() => {
    if (andachtMode !== 'sammlung' || !andachtReiheId) return null
    return availableSammlungen.find((s) => s.id === andachtReiheId) ?? null
  }, [andachtMode, andachtReiheId, availableSammlungen])

  const stammandachtenCount = useMemo(() => {
    if (!activeKontext) return 0
    return kontextTreffenInRange.filter((t) =>
      hasAndacht(t.anfangsBlock, activeKontext.defaultAnfangsBlock)
      || hasAndacht(t.endBlock, activeKontext.defaultEndBlock),
    ).length
  }, [activeKontext, kontextTreffenInRange])

  const teamAndachtsBedarf = Math.max(0, activeMeetingCount - stammandachtenCount)

  const stammAktivitaeten = useMemo(() => {
    if (!activeKontext || !repertoireState.loaded) return []
    return repertoireState.aktivitaeten.filter((a) => a.stammImportId === activeKontext.stammImportId)
  }, [activeKontext, repertoireState])

  return { availableReihen, availableSammlungen, selectedSammlung, stammandachtenCount, teamAndachtsBedarf, stammAktivitaeten }
}

// ─── Top-level hook ───────────────────────────────────────────────────────────

export type UseWizardDerivedInput = {
  start: IsoDate
  ende: IsoDate
  weekday: Parameters<typeof generateTermine>[2]
  rhythmusK: RhythmusKey
  planungen: readonly Planung[]
  kontexte: readonly StammKontext[]
  reinstated: ReadonlySet<IsoDate>
  andachtMode: AndachtMode
  andachtReiheId: AndachtsreiheId | null
}

export type UseWizardDerivedResult =
  & FerienResult
  & KontextResult
  & ItemsResult
  & ReasonsResult
  & ZielSourcesResult

export function useWizardDerived(input: UseWizardDerivedInput): UseWizardDerivedResult {
  const ferien = useFerien(input.start, input.ende)
  const kontext = useKontext(input.kontexte, input.start, input.ende)
  const items = useMeetingItems({
    start: input.start, ende: input.ende, weekday: input.weekday, rhythmusK: input.rhythmusK,
    kontext, ferien, reinstated: input.reinstated,
  })
  const reasons = useReasons({
    start: input.start, ende: input.ende, planungen: input.planungen,
    activeKontext: kontext.activeKontext, ferien,
  })
  const zielSources = useZielSources({
    andachtMode: input.andachtMode, andachtReiheId: input.andachtReiheId,
    activeKontext: kontext.activeKontext, kontextTreffenInRange: kontext.kontextTreffenInRange,
    activeMeetingCount: items.activeMeetingCount,
  })
  return { ...ferien, ...kontext, ...items, ...reasons, ...zielSources }
}
