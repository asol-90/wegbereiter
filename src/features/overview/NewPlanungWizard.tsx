/**
 * NewPlanungWizard — vierstufiger Initiierungs-Flow (Concept §7).
 *
 * Schritte:
 *   1. Teamplanung  — Rhythmus+Dauer (oben, Info-Text), Von/Bis mit Preset,
 *                      Termin-Vorschau mit Ferien-Toggle.
 *   2. Stamm-Kontext — Anzeige des geladenen Kontexts oder Hinweis.
 *   3. Unsere Ziele  — Platzhalter.
 *   4. Vorschau      — Name + Zusammenfassung.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import {
  AccordionGroup,
  Badge,
  Button,
  Input,
  Modal,
  Select,
  type SelectOption,
} from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import { useGlobalConfig } from '@/features/globalConfig'
import { usePlanungenActions, usePlanungen } from '@/features/planungen'
import { useStammKontext } from '@/features/stammKontext'
import type {
  Altersstufe,
  Ferien,
  IsoDate,
  Mitarbeiter,
  Planung,
  Rhythmus,
  StammAktion,
  StammKontext,
  Weekday,
  WbSchwerpunktModus,
} from '@/domain/types'
import type { AbzeichenId, AndachtsEinheitId, AndachtsreiheId, MitarbeiterId } from '@/domain/ids'
import { newId } from '@/domain/ids'
import { WEEKDAYS } from '@/domain/types'
import { generateTermine, parseIso } from '@/domain/dateUtils'
import { generatePlanungsName } from '@/domain/planungFactory'
import { stammAbzugFuerTreffen } from '@/domain/zeitbudget'
import { aktivitaetLabel } from '@/domain/aktivitaetKatalog'
import { WB_KEYS, WB_LABELS, WB_CSS_VAR, type WBKey } from '@/domain/wb'
import { ALTERSSTUFE_LABELS, abzeichenFuerStufe, ABZEICHEN_KATALOG } from '@/domain/abzeichenKatalog'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { saveAndachtsreihe } from '@/storage/repertoireRepo'
import { classifyDay } from './monthGrid'
import { useFerienForYear } from './useFerienForYear'
import styles from './NewPlanungWizard.module.css'

// ─── Types & constants ──────────────────────────────────────────────────────

export type NewPlanungWizardProps = {
  open: boolean
  onClose: () => void
  onCreated?: (p: Planung) => void
  /** Pre-filled zeitraum from drag-to-create in JahresplanerSidebar. */
  initialZeitraum?: { start: IsoDate; ende: IsoDate }
}

type RhythmusKey = 'weekly' | 'biweekly' | 'monthly'

/** Logical step identifiers — the visible sequence is built dynamically. */
type LogicalStep = 'teamplanung' | 'stammkontext' | 'ziele' | 'vorschau'

const STEP_META: Record<LogicalStep, string> = {
  teamplanung: 'Teamplanung',
  stammkontext: 'Stamm-Kontext',
  ziele: 'Ziele',
  vorschau: 'Vorschau',
}

function buildStepSequence(hasKontext: boolean): LogicalStep[] {
  const steps: LogicalStep[] = ['teamplanung']
  if (hasKontext) steps.push('stammkontext')
  steps.push('ziele', 'vorschau')
  return steps
}

function stepLabels(steps: LogicalStep[]): string[] {
  return steps.map((s, i) => `${i + 1} · ${STEP_META[s]}`)
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  montag: 'Montag',
  dienstag: 'Dienstag',
  mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag',
  freitag: 'Freitag',
  samstag: 'Samstag',
  sonntag: 'Sonntag',
}

const WEEKDAY_OPTIONS: SelectOption<Weekday>[] = WEEKDAYS.map((w) => ({
  value: w,
  label: WEEKDAY_LABELS[w],
}))

const RHYTHMUS_OPTIONS: SelectOption<RhythmusKey>[] = [
  { value: 'weekly', label: 'wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'monatlich' },
]

const RHYTHMUS_LABELS: Record<RhythmusKey, string> = {
  weekly: 'wöchentlich',
  biweekly: '14-tägig',
  monthly: 'monatlich',
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function weekdayToJsDow(w: Weekday): number {
  const map: Record<Weekday, number> = {
    sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3,
    donnerstag: 4, freitag: 5, samstag: 6,
  }
  return map[w]
}

/** Next occurrence of `weekday`, including today if it matches. */
function defaultStartIsoFor(weekday: Weekday): IsoDate {
  const today = new Date()
  const target = weekdayToJsDow(weekday)
  const diff = (target - today.getDay() + 7) % 7 // 0 if today IS the weekday
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff)
  return isoFromDate(d)
}

function defaultEndIso(start: IsoDate): IsoDate {
  const d = parseIso(start)
  d.setMonth(d.getMonth() + 4)
  return isoFromDate(d)
}

function isoFromDate(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Add N months to an ISO date. */
function isoAddMonths(iso: IsoDate, months: number): IsoDate {
  const d = parseIso(iso)
  d.setMonth(d.getMonth() + months)
  return isoFromDate(d)
}

/** Subtract one calendar day from an ISO date. */
function isoPrevDay(iso: IsoDate): IsoDate {
  const d = parseIso(iso)
  d.setDate(d.getDate() - 1)
  return isoFromDate(d)
}

/** Add one calendar day to an ISO date. */
function isoNextDay(iso: IsoDate): IsoDate {
  const d = parseIso(iso)
  d.setDate(d.getDate() + 1)
  return isoFromDate(d)
}

/**
 * Get the date range (earliest → latest) of a StammKontext.
 */
function kontextDateRange(k: StammKontext): { von: IsoDate; bis: IsoDate } | null {
  const allDates = [
    ...k.treffen.map((t) => t.datum),
    ...k.stammaktionen.map((a) => a.beginn),
    ...k.stammaktionen.map((a) => a.ende),
  ].sort()
  if (allDates.length === 0) return null
  return { von: allDates[0], bis: allDates[allDates.length - 1] }
}

/**
 * Find the StammKontext that overlaps a given zeitraum.
 * Returns the first one found. If two kontexte overlap,
 * returns the one that starts first.
 */
function findKontextForZeitraum(
  kontexte: readonly StammKontext[],
  start: IsoDate,
  ende: IsoDate,
): StammKontext | undefined {
  const candidates = kontexte
    .map((k) => ({ kontext: k, range: kontextDateRange(k) }))
    .filter((x): x is { kontext: StammKontext; range: { von: IsoDate; bis: IsoDate } } =>
      x.range !== null && x.range.von <= ende && x.range.bis >= start,
    )
    .sort((a, b) => a.range.von.localeCompare(b.range.von))
  return candidates[0]?.kontext
}

/**
 * If a second StammKontext starts within [start, ende], return the day
 * before it begins (so the Planung doesn't span two contexts).
 */
function clampEndeBeforeSecondKontext(
  kontexte: readonly StammKontext[],
  primaryKontextId: string,
  start: IsoDate,
  ende: IsoDate,
): IsoDate {
  for (const k of kontexte) {
    if (k.id === primaryKontextId) continue
    const range = kontextDateRange(k)
    if (!range) continue
    // Does this other kontext start within our zeitraum?
    if (range.von > start && range.von <= ende) {
      const clampedEnde = isoPrevDay(range.von)
      if (clampedEnde > start) return clampedEnde
    }
  }
  return ende
}

/**
 * Find the first date in the future that is not covered by any existing Planung.
 * Uses the configured weekday for the default start.
 */
function firstFreeStartDate(
  planungen: readonly Planung[],
  weekday: Weekday,
): IsoDate {
  const candidate = defaultStartIsoFor(weekday)
  // Sort planungen by zeitraum.start
  const sorted = [...planungen]
    .filter((p) => p.zeitraum.ende >= candidate)
    .sort((a, b) => a.zeitraum.start.localeCompare(b.zeitraum.start))

  let result = candidate
  for (const p of sorted) {
    // If result falls within this Planung's zeitraum, jump past it
    if (result >= p.zeitraum.start && result <= p.zeitraum.ende) {
      result = isoNextDay(p.zeitraum.ende)
    }
  }
  return result
}

function rhythmusFromKey(k: RhythmusKey): Rhythmus {
  switch (k) {
    case 'weekly': return { kind: 'weekly' }
    case 'biweekly': return { kind: 'biweekly' }
    case 'monthly': return { kind: 'monthly' }
  }
}

function rhythmusToKey(r: Rhythmus): RhythmusKey {
  switch (r.kind) {
    case 'weekly': return 'weekly'
    case 'biweekly': return 'biweekly'
    case 'monthly': return 'monthly'
    case 'custom': return 'weekly'
  }
}

const WEEKDAY_SHORT_DE = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

function formatTerminDate(iso: IsoDate): string {
  const d = parseIso(iso)
  const wd = WEEKDAY_SHORT_DE[d.getDay()]
  const day = d.getDate().toString().padStart(2, '0')
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  return `${wd} ${day}.${month}.`
}

/** Compact date for multi-day ranges: "27.–28.09." */
function formatDateRange(beginn: IsoDate, ende: IsoDate): string {
  const b = parseIso(beginn)
  const e = parseIso(ende)
  const bDay = b.getDate().toString().padStart(2, '0')
  const eDay = e.getDate().toString().padStart(2, '0')
  const bMon = (b.getMonth() + 1).toString().padStart(2, '0')
  const eMon = (e.getMonth() + 1).toString().padStart(2, '0')
  if (bMon === eMon) {
    return `${bDay}.–${eDay}.${eMon}.`
  }
  return `${bDay}.${bMon}.–${eDay}.${eMon}.`
}

// ─── Inline icons ───────────────────────────────────────────────────────────

function SkipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="5" x2="19" y2="19" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

function CheckSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4 4L19 6" />
    </svg>
  )
}

// ─── Unified preview item type ──────────────────────────────────────────────

type AktionBereich = 'Stamm' | 'Distrikt' | 'Regional'

type PreviewItem =
  | { kind: 'treffen'; iso: IsoDate; source: 'kontext' | 'generated' }
  | { kind: 'aktion'; aktion: StammAktion; bereich: AktionBereich }

function previewSortKey(item: PreviewItem): IsoDate {
  return item.kind === 'treffen' ? item.iso : item.aktion.beginn
}

// ─── Bis-Preset options ─────────────────────────────────────────────────────

type BisPreset = {
  label: string
  iso: IsoDate
}

function buildBisPresets(
  start: IsoDate,
  ferien1: Ferien[] | undefined,
  ferien2: Ferien[] | undefined,
  kontext: StammKontext | undefined,
): BisPreset[] {
  const presets: BisPreset[] = []
  const allFerien = [...(ferien1 ?? []), ...(ferien2 ?? [])]
  // Deduplicate by name+start
  const seen = new Set<string>()
  const uniqueFerien = allFerien.filter((f) => {
    const key = `${f.name}:${f.start}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  // 6-month cutoff from start
  const cutoff = isoAddMonths(start, 6)

  // Only Ferien that start AFTER our start date and within 6 months
  const future = uniqueFerien
    .filter((f) => f.start > start && f.start <= cutoff)
    .sort((a, b) => a.start.localeCompare(b.start))

  for (const f of future) {
    presets.push({
      label: `Bis ${f.name}`,
      iso: isoPrevDay(f.start),
    })
  }

  if (kontext) {
    const allKontextDates = [
      ...kontext.treffen.map((t) => t.datum),
      ...kontext.stammaktionen.map((a) => a.ende),
    ].sort()
    const last = allKontextDates[allKontextDates.length - 1]
    if (last && last > start && last <= cutoff) {
      presets.push({ label: 'Ende Stammkontext', iso: last })
    }
  }

  return presets
}

/** Find a smart default end date based on Ferien: next Ferien start after `start`. */
function smartDefaultEnd(
  start: IsoDate,
  ferien1: Ferien[] | undefined,
  ferien2: Ferien[] | undefined,
): IsoDate | null {
  const allFerien = [...(ferien1 ?? []), ...(ferien2 ?? [])]
  const next = allFerien
    .filter((f) => f.start > start)
    .sort((a, b) => a.start.localeCompare(b.start))[0]
  return next ? isoPrevDay(next.start) : null
}

// ─── Main component ─────────────────────────────────────────────────────────

export function NewPlanungWizard({ open, onClose, onCreated, initialZeitraum }: NewPlanungWizardProps) {
  const { config, loaded } = useGlobalConfig()
  const { create } = usePlanungenActions()
  const { kontexte } = useStammKontext()
  const { planungen } = usePlanungen()
  const repertoireState = useRepertoire()

  const [stepIndex, setStepIndex] = useState(0)
  const [nameOverride, setNameOverride] = useState('')
  const [start, setStart] = useState<IsoDate>('')
  const [ende, setEnde] = useState<IsoDate>('')

  // activeKontext is determined dynamically based on the selected zeitraum,
  // not statically from kontexte[0].
  const activeKontext = useMemo<StammKontext | undefined>(
    () => {
      if (kontexte.length === 0 || !start || !ende) return undefined
      return findKontextForZeitraum(kontexte, start, ende)
    },
    [kontexte, start, ende],
  )
  const hasKontext = !!activeKontext

  const stepSequence = useMemo(() => buildStepSequence(hasKontext), [hasKontext])
  const currentStep: LogicalStep = stepSequence[stepIndex] ?? 'teamplanung'
  const isLastStep = stepIndex === stepSequence.length - 1
  const [weekday, setWeekday] = useState<Weekday>('freitag')
  const [rhythmusK, setRhythmusK] = useState<RhythmusKey>('weekly')
  const [dauer, setDauer] = useState(90)
  const [editingRhythmus, setEditingRhythmus] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [reinstated, setReinstated] = useState<Set<IsoDate>>(new Set())
  const [terminListExpanded, setTerminListExpanded] = useState(false)
  const [bisPresetOpen, setBisPresetOpen] = useState(false)
  const bisPresetRef = useRef<HTMLDivElement>(null)
  const [team, setTeam] = useState<Mitarbeiter[]>([])
  const [newTeamName, setNewTeamName] = useState('')

  // ─── Step 2: Ziele (WB-Schwerpunkt, Andachtsreihe, Abzeichen) ──

  // WB-Schwerpunkt
  const [wbModus, setWbModus] = useState<WbSchwerpunktModus>('ausgewogen')
  const [wbBereiche, setWbBereiche] = useState<WBKey[]>([])

  // Andachtsreihe
  type AndachtMode = 'none' | 'reihe' | 'sammlung' | 'new'
  const [andachtMode, setAndachtMode] = useState<AndachtMode>('none')
  const [andachtReiheId, setAndachtReiheId] = useState<AndachtsreiheId | null>(null)
  const [andachtAusgewaehlt, setAndachtAusgewaehlt] = useState<Set<AndachtsEinheitId>>(new Set())
  const [andachtTitel, setAndachtTitel] = useState('')
  const [andachtEinheiten, setAndachtEinheiten] = useState<{ id: AndachtsEinheitId; titel: string }[]>([])
  const andachtFocusRef = useRef<string | null>(null)

  // Abzeichen
  const [abzeichenEnabled, setAbzeichenEnabled] = useState(false)
  const [selectedAltersstufe, setSelectedAltersstufe] = useState<Altersstufe | null>(null)
  const [selectedAbzeichenId, setSelectedAbzeichenId] = useState<AbzeichenId | null>(null)

  // ─── Ferien data ──────────────────────────────────────────────────────

  const yearStart = useMemo(() => {
    if (!start) return new Date().getFullYear()
    return Number.parseInt(start.slice(0, 4), 10)
  }, [start])
  const yearEnd = useMemo(() => {
    if (!ende) return yearStart
    return Number.parseInt(ende.slice(0, 4), 10)
  }, [ende, yearStart])

  const ferienYear1 = useFerienForYear(yearStart)
  const ferienYear2 = useFerienForYear(yearEnd !== yearStart ? yearEnd : yearStart)

  // ─── Initialise on open ───────────────────────────────────────────────

  useEffect(() => {
    if (!open) return
    setStepIndex(0)
    setNameOverride('')
    setError(null)
    setSaving(false)
    setEditingRhythmus(false)
    setReinstated(new Set())
    setTerminListExpanded(false)
    setBisPresetOpen(false)
    setNewTeamName('')
    setAndachtMode('none')
    setAndachtReiheId(null)
    setAndachtAusgewaehlt(new Set())
    setAndachtTitel('')
    setAndachtEinheiten([])
    setWbModus('ausgewogen')
    setWbBereiche([])
    setAbzeichenEnabled(false)
    setSelectedAltersstufe(null)
    setSelectedAbzeichenId(null)
    const wd = loaded ? config.defaultWeekday : 'freitag'
    const rk = loaded ? rhythmusToKey(config.defaultRhythmus) : 'weekly'
    const d = loaded ? config.defaultDauerMinuten : 90
    setWeekday(wd)
    setRhythmusK(rk)
    setDauer(d)

    if (initialZeitraum) {
      // ── Drag-gesture: smart start ──
      let s = initialZeitraum.start

      // a) If a Planung ends just before this area, start right after it
      const preceding = planungen
        .filter((p) => p.zeitraum.ende < initialZeitraum.ende && p.zeitraum.ende >= isoPrevDay(s))
        .sort((a, b) => b.zeitraum.ende.localeCompare(a.zeitraum.ende))
      if (preceding.length > 0) {
        const afterPrev = isoNextDay(preceding[0].zeitraum.ende)
        if (afterPrev >= s) s = afterPrev
      }

      // b) If a StammKontext begins in this area, sync start to it
      const overlappingKontext = findKontextForZeitraum(kontexte, s, initialZeitraum.ende)
      if (overlappingKontext) {
        const range = kontextDateRange(overlappingKontext)
        if (range && range.von >= s && range.von <= initialZeitraum.ende) {
          // Kontext starts fresh inside the drag area → align
          s = range.von
        }
      }

      setStart(s)

      // ── Smart end ──
      let e = initialZeitraum.ende
      if (overlappingKontext) {
        const range = kontextDateRange(overlappingKontext)
        if (range) {
          // End at StammKontext end
          e = range.bis > s ? range.bis : e
          // Clamp before a second kontext
          e = clampEndeBeforeSecondKontext(kontexte, overlappingKontext.id, s, e)
        }
      }
      setEnde(e)
    } else {
      // ── Plus-button: first free future date ──
      const s = firstFreeStartDate(planungen, wd)
      setStart(s)

      // Smart end: check if a kontext covers from s
      const futureKontext = findKontextForZeitraum(kontexte, s, isoAddMonths(s, 12))
      if (futureKontext) {
        const range = kontextDateRange(futureKontext)
        if (range && range.bis > s) {
          let e = range.bis
          e = clampEndeBeforeSecondKontext(kontexte, futureKontext.id, s, e)
          setEnde(e)
        } else {
          setEnde(defaultEndIso(s))
        }
      } else {
        setEnde(defaultEndIso(s))
      }
    }

    // Pre-populate team from most recent planung if available
    if (planungen && planungen.length > 0) {
      const mostRecent = planungen[0]
      if (mostRecent.team && mostRecent.team.length > 0) {
        setTeam([...mostRecent.team])
      }
    }
  }, [open, loaded, config.defaultWeekday, config.defaultRhythmus, config.defaultDauerMinuten, planungen, kontexte, initialZeitraum])

  // Smart default end date: once Ferien are loaded and user hasn't changed ende manually
  const [endeWasAutoSet, setEndeWasAutoSet] = useState(true)
  useEffect(() => {
    if (!open || !endeWasAutoSet || hasKontext) return
    const smart = smartDefaultEnd(
      start,
      ferienYear1?.ferien,
      ferienYear2?.ferien,
    )
    if (smart && smart > start) {
      setEnde(smart)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ferienYear1, ferienYear2])

  // Close preset dropdown on outside click
  useEffect(() => {
    if (!bisPresetOpen) return
    function handleClick(e: MouseEvent) {
      if (bisPresetRef.current && !bisPresetRef.current.contains(e.target as Node)) {
        setBisPresetOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [bisPresetOpen])

  // ─── Derived state ────────────────────────────────────────────────────

  const rhythmus = useMemo(() => rhythmusFromKey(rhythmusK), [rhythmusK])

  const autoName = useMemo(() => {
    if (!start || !ende || start > ende) return ''
    return generatePlanungsName(start, ende)
  }, [start, ende])

  const effectiveName = nameOverride.trim() || autoName

  const generated = useMemo<IsoDate[]>(() => {
    if (!start || !ende || start >= ende) return []
    return generateTermine(start, ende, weekday, rhythmus)
  }, [start, ende, weekday, rhythmus])

  const kontextTreffenInRange = useMemo(() => {
    if (!hasKontext || !start || !ende) return []
    return activeKontext.treffen
      .filter((t) => t.datum >= start && t.datum <= ende)
      .sort((a, b) => a.datum.localeCompare(b.datum))
  }, [hasKontext, activeKontext, start, ende])

  const kontextDateSet = useMemo(
    () => new Set(kontextTreffenInRange.map((t) => t.datum)),
    [kontextTreffenInRange],
  )

  const stammaktionenInRange = useMemo(() => {
    if (!hasKontext || !start || !ende) return []
    return activeKontext.stammaktionen
      .filter((a) => a.beginn <= ende && a.ende >= start)
      .sort((a, b) => a.beginn.localeCompare(b.beginn))
  }, [hasKontext, activeKontext, start, ende])

  const alleAktionenInRange = useMemo<Array<StammAktion & { bereich: AktionBereich }>>(() => {
    if (!hasKontext || !start || !ende) return []
    const stamm = activeKontext.stammaktionen
      .filter((a) => a.beginn <= ende && a.ende >= start)
      .map((a) => ({ ...a, bereich: 'Stamm' as const }))
    const distrikt = (activeKontext.distriktAktionen ?? [])
      .filter((a) => a.beginn <= ende && a.ende >= start)
      .map((a) => ({ ...a, bereich: 'Distrikt' as const }))
    const regional = (activeKontext.regionalAktionen ?? [])
      .filter((a) => a.beginn <= ende && a.ende >= start)
      .map((a) => ({ ...a, bereich: 'Regional' as const }))
    return [...stamm, ...distrikt, ...regional].sort((a, b) => a.beginn.localeCompare(b.beginn))
  }, [hasKontext, activeKontext, start, ende])

  /** The Kontext's own date range (earliest treffen/aktion to latest). */
  const kontextRange = useMemo<{ von: IsoDate; bis: IsoDate } | null>(() => {
    if (!hasKontext) return null
    const allDates = [
      ...activeKontext.treffen.map((t) => t.datum),
      ...activeKontext.stammaktionen.map((a) => a.beginn),
      ...activeKontext.stammaktionen.map((a) => a.ende),
    ].sort()
    if (allDates.length === 0) return null
    return { von: allDates[0], bis: allDates[allDates.length - 1] }
  }, [hasKontext, activeKontext])

  const generatedForGaps = useMemo(
    () => generated.filter((iso) => {
      if (kontextRange && iso >= kontextRange.von && iso <= kontextRange.bis) return false
      return !kontextDateSet.has(iso)
    }),
    [generated, kontextDateSet, kontextRange],
  )

  /** A generated date needs Ferien-handling only if outside the Kontext range. */
  function isOutsideKontext(iso: IsoDate): boolean {
    if (!kontextRange) return true
    return iso < kontextRange.von || iso > kontextRange.bis
  }

  // Merged list: treffen + alle aktionen, sorted chronologically
  const mergedItems = useMemo<PreviewItem[]>(() => {
    const items: PreviewItem[] = [
      ...kontextTreffenInRange.map((t) => ({
        kind: 'treffen' as const,
        iso: t.datum,
        source: 'kontext' as const,
      })),
      ...generatedForGaps.map((iso) => ({
        kind: 'treffen' as const,
        iso,
        source: 'generated' as const,
      })),
      ...alleAktionenInRange.map((a) => ({
        kind: 'aktion' as const,
        aktion: a,
        bereich: a.bereich,
      })),
    ]
    return items.sort((a, b) => previewSortKey(a).localeCompare(previewSortKey(b)))
  }, [kontextTreffenInRange, generatedForGaps, alleAktionenInRange])

  function classifyDate(iso: IsoDate) {
    const y = Number.parseInt(iso.slice(0, 4), 10)
    const entry = y === yearStart ? ferienYear1 : ferienYear2
    return classifyDay(iso, entry)
  }

  function isHoliday(iso: IsoDate): { ferien?: string; feiertag?: string } | null {
    const cls = classifyDate(iso)
    if (!cls.ferien && !cls.feiertag) return null
    return { ferien: cls.ferien?.name, feiertag: cls.feiertag?.name }
  }

  function toggleReinstated(iso: IsoDate) {
    setReinstated((prev) => {
      const next = new Set(prev)
      if (next.has(iso)) next.delete(iso)
      else next.add(iso)
      return next
    })
  }

  const activeMeetingCount = useMemo(() => {
    return mergedItems.filter((item) => {
      if (item.kind === 'aktion') return true
      if (item.source === 'kontext') return true
      if (!isOutsideKontext(item.iso)) return true // within Kontext = always active
      const hol = isHoliday(item.iso)
      if (!hol) return true
      return reinstated.has(item.iso)
    }).length
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergedItems, reinstated, ferienYear1, ferienYear2, kontextRange])

  // Bis-Presets
  const bisPresets = useMemo(
    () => buildBisPresets(start, ferienYear1?.ferien, ferienYear2?.ferien, activeKontext),
    [start, ferienYear1, ferienYear2, activeKontext],
  )

  // ─── Datum-Begründungen ───────────────────────────────────────────────
  // Reason wird nur gezeigt, wenn das Datum mit einem „smarten" Vorschlag
  // zusammenfällt — nicht bei stumpfen Defaults (nächster Wochentag, +4 Monate).

  const startReason = useMemo<string | null>(() => {
    if (!start) return null
    // Anschluss an vorherige Planung
    const previous = planungen
      .filter((p) => p.zeitraum.ende < start)
      .sort((a, b) => b.zeitraum.ende.localeCompare(a.zeitraum.ende))[0]
    if (previous && isoNextDay(previous.zeitraum.ende) === start) {
      return `Beginnt im Anschluss an „${previous.name}"`
    }
    // Stammkontext-Start
    if (activeKontext) {
      const range = kontextDateRange(activeKontext)
      if (range && range.von === start) {
        return `Beginnt mit Stammkontext „${activeKontext.thema}"`
      }
    }
    return null
  }, [start, planungen, activeKontext])

  const endeReason = useMemo<string | null>(() => {
    if (!ende || !start) return null
    // Stammkontext-Ende
    if (activeKontext) {
      const range = kontextDateRange(activeKontext)
      if (range && range.bis === ende) {
        return `Endet mit Stammkontext „${activeKontext.thema}"`
      }
    }
    // Vor anschließender Planung
    const next = planungen
      .filter((p) => p.zeitraum.start > start)
      .sort((a, b) => a.zeitraum.start.localeCompare(b.zeitraum.start))[0]
    if (next && isoPrevDay(next.zeitraum.start) === ende) {
      return `Endet vor „${next.name}"`
    }
    // Vor nächsten Ferien
    const allFerien = [...(ferienYear1?.ferien ?? []), ...(ferienYear2?.ferien ?? [])]
    const nextFerien = allFerien
      .filter((f) => f.start > start)
      .sort((a, b) => a.start.localeCompare(b.start))[0]
    if (nextFerien && isoPrevDay(nextFerien.start) === ende) {
      return `Endet vor ${nextFerien.name}`
    }
    return null
  }, [ende, start, activeKontext, planungen, ferienYear1, ferienYear2])

  // ─── Andachten: Repertoire-Listen + Stammandachts-Zählung ───────────

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

  /** Zähle Treffen, die bereits eine Stammandacht über den Stamm-Block-Default oder Override haben. */
  const stammandachtenCount = useMemo(() => {
    if (!hasKontext) return 0
    const hasAndacht = (blocks: import('@/domain/types').StammBlock[] | undefined, fallback: import('@/domain/types').StammBlock[]) => {
      const list = blocks ?? fallback
      return list.some((b) => b.untertyp === 'andacht')
    }
    return kontextTreffenInRange.filter((t) =>
      hasAndacht(t.anfangsBlock, activeKontext.defaultAnfangsBlock)
      || hasAndacht(t.endBlock, activeKontext.defaultEndBlock),
    ).length
  }, [hasKontext, activeKontext, kontextTreffenInRange])

  /** Treffen, die noch eine Andacht aus der Reihe brauchen. */
  const teamAndachtsBedarf = useMemo(
    () => Math.max(0, activeMeetingCount - stammandachtenCount),
    [activeMeetingCount, stammandachtenCount],
  )

  // ─── Team management ──────────────────────────────────────────────────

  function generateInitials(name: string): string {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  function generateHueForIndex(index: number): number {
    // Spread hues across the color spectrum: 0°, 60°, 120°, 180°, 240°, 300°, etc.
    return (index * 60) % 360
  }

  function addTeamMember(name: string) {
    if (!name.trim()) return
    const newMember: Mitarbeiter = {
      id: newId<MitarbeiterId>(),
      name: name.trim(),
      initials: generateInitials(name),
      accentHue: generateHueForIndex(team.length),
    }
    setTeam([...team, newMember])
    setNewTeamName('')
  }

  function removeTeamMember(id: MitarbeiterId) {
    setTeam(team.filter((m) => m.id !== id))
  }

  // ─── Navigation & actions ─────────────────────────────────────────────

  function validateBasics(): string | null {
    if (!start || !ende) return 'Bitte Start- und Enddatum angeben.'
    if (start >= ende) return 'Das Enddatum muss nach dem Startdatum liegen.'
    if (!Number.isFinite(dauer) || dauer <= 0) return 'Dauer muss größer als 0 sein.'
    // Check overlap with existing Planungen (real zeitraum, not visual month display)
    for (const p of planungen) {
      if (p.zeitraum.start < ende && p.zeitraum.ende > start) {
        return `Der Zeitraum überschneidet sich mit der Planung „${p.name}" (${formatDateShort(p.zeitraum.start)} – ${formatDateShort(p.zeitraum.ende)}).`
      }
    }
    return null
  }

  function handleNext() {
    if (currentStep === 'teamplanung') {
      const err = validateBasics()
      if (err) { setError(err); return }
    }
    setError(null)
    setStepIndex((s) => Math.min(stepSequence.length - 1, s + 1))
  }

  function handleBack() {
    setError(null)
    setStepIndex((s) => Math.max(0, s - 1))
  }

  async function handleStart() {
    if (saving) return
    const err = validateBasics()
    if (err) { setStepIndex(0); setError(err); return }
    try {
      setSaving(true)
      // Collect dates to exclude from the factory's generateTermine output:
      // 1. Weekday-generated dates within the Stammkontext range are excluded to avoid
      //    double-booking (Stammkontext treffen dates are passed separately as extraDates).
      // 2. Holiday-skipped dates outside the kontext range.
      const excludeDates = new Set<IsoDate>()
      if (kontextRange) {
        for (const iso of generated) {
          if (iso >= kontextRange.von && iso <= kontextRange.bis) {
            excludeDates.add(iso)
          }
        }
      }
      for (const item of mergedItems) {
        if (item.kind !== 'treffen' || item.source !== 'generated') continue
        if (!isOutsideKontext(item.iso)) continue
        const hol = isHoliday(item.iso)
        if (hol && !reinstated.has(item.iso)) excludeDates.add(item.iso)
      }

      // Stammkontext treffen become part of planung.treffen — the team plans
      // content for these dates even though the schedule comes from the Stammkontext.
      const extraDates = kontextTreffenInRange.map((t) => t.datum)

      // Build WB-Schwerpunkt if selected (not ausgewogen)
      const wbSchwerpunkt = wbModus !== 'ausgewogen'
        ? { modus: wbModus, bereiche: wbBereiche }
        : undefined

      // Build abzeichen selection
      const abzeichenAuswahl = selectedAbzeichenId
        ? [{ abzeichenId: selectedAbzeichenId }]
        : []

      // Build Andachtsreihen-Zuordnung based on selected mode
      const andachtsreihenZuordnung: import('@/domain/types').AndachtsreiheZuordnung[] = []
      if (andachtMode === 'new' && andachtTitel.trim() && andachtEinheiten.some((e) => e.titel.trim())) {
        const reiheId = newId<AndachtsreiheId>()
        await saveAndachtsreihe({
          id: reiheId,
          name: andachtTitel.trim(),
          art: 'reihe',
          quelle: 'eigene',
          einheiten: andachtEinheiten
            .filter((e) => e.titel.trim())
            .map((e, i) => ({
              id: e.id,
              index: i,
              titel: e.titel.trim(),
            })),
        })
        andachtsreihenZuordnung.push({ reiheId })
      } else if (andachtMode === 'reihe' && andachtReiheId) {
        andachtsreihenZuordnung.push({ reiheId: andachtReiheId })
      } else if (andachtMode === 'sammlung' && andachtReiheId && andachtAusgewaehlt.size > 0) {
        andachtsreihenZuordnung.push({
          reiheId: andachtReiheId,
          ausgewaehlteEinheiten: Array.from(andachtAusgewaehlt),
        })
      }

      const p = await create({
        zeitraum: { start, ende },
        weekday,
        rhythmus,
        dauerMinuten: dauer,
        team,
        name: nameOverride.trim() || undefined,
        stammKontextId: activeKontext?.id,
        excludeDates: excludeDates.size > 0 ? excludeDates : undefined,
        extraDates: extraDates.length > 0 ? extraDates : undefined,
        wbSchwerpunkt,
        abzeichenAuswahl,
        andachtsreihenZuordnung,
      })
      onCreated?.(p)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
      setSaving(false)
    }
  }

  function formatDateShort(iso: string): string {
    try { return format(parseISO(iso), 'd. MMM yyyy', { locale: de }) }
    catch { return iso }
  }

  // ─── Termin preview rendering ─────────────────────────────────────────

  // ─── Kontext step helpers ──────────────────────────────────────────────

  /** Aktivitäten aus dem Repertoire, die aus dem Stammkontext importiert wurden. */
  const stammAktivitaeten = useMemo(() => {
    if (!hasKontext || !repertoireState.loaded) return []
    return repertoireState.aktivitaeten.filter(
      (a) => a.stammImportId === activeKontext.stammImportId,
    )
  }, [hasKontext, activeKontext, repertoireState])

  function renderKontextAktivitaeten() {
    if (stammAktivitaeten.length === 0) return null
    return (
      <div className={styles.kontextAktivitaetenSection}>
        <span className={styles.kontextSectionLabel}>Vorgeschlagene Aktivitäten</span>
        <div className={styles.kontextAktivitaetenList}>
          {stammAktivitaeten.map((a) => (
            <div key={a.id} className={styles.kontextAktivitaetRow}>
              <span className={styles.kontextAktivitaetTyp}>
                {aktivitaetLabel(a.typ, a.untertyp)}
              </span>
              <span className={styles.kontextAktivitaetName}>{a.name}</span>
              {a.zeitMin > 0 && (
                <span className={styles.kontextAktivitaetDauer}>
                  {a.zeitMin === a.zeitMax
                    ? `${a.zeitMin} Min`
                    : `${a.zeitMin}–${a.zeitMax} Min`}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    )
  }

  /** Kompakte Treffenliste: reguläre Treffen als Datumskette, besondere separat. */
  function renderKontextTreffenCompact() {
    const regulaer = kontextTreffenInRange.filter((t) => {
      // "Besonders" = hat eigenen anfangsBlock oder endBlock (nicht Default)
      return t.anfangsBlock === undefined && t.endBlock === undefined
    })
    const besondere = kontextTreffenInRange.filter((t) => {
      return t.anfangsBlock !== undefined || t.endBlock !== undefined
    })

    return (
      <>
        {regulaer.length > 0 && (
          <p className={styles.kontextTreffenDates}>
            {regulaer.map((t, i) => (
              <span key={t.id}>
                {i > 0 && ' · '}
                {formatTerminDate(t.datum)}
              </span>
            ))}
          </p>
        )}
        {besondere.map((t) => {
          const blocks = [
            ...(t.anfangsBlock ?? []).map((b) => b.name),
            ...(t.endBlock ?? []).map((b) => b.name),
          ]
          return (
            <div key={t.id} className={styles.kontextTreffenBesonders}>
              <span className={styles.kontextAktionDate}>{formatTerminDate(t.datum)}</span>
              <span className={styles.kontextAktionName}>
                Abweichend: {blocks.join(', ')}
              </span>
            </div>
          )
        })}
      </>
    )
  }

  // ─── Termin preview rendering ─────────────────────────────────────────

  const VISIBLE_HEAD = 6
  const VISIBLE_TAIL = 1

  function renderTerminPreview() {
    if (mergedItems.length === 0) {
      return (
        <div className={styles.terminListEmpty}>
          Keine Treffen im gewählten Zeitraum.
        </div>
      )
    }

    const canCollapse = mergedItems.length > VISIBLE_HEAD + VISIBLE_TAIL + 1
    const shouldCollapse = canCollapse && !terminListExpanded
    const hiddenCount = shouldCollapse ? mergedItems.length - VISIBLE_HEAD - VISIBLE_TAIL : 0

    const visibleItems = shouldCollapse
      ? [...mergedItems.slice(0, VISIBLE_HEAD), ...mergedItems.slice(-VISIBLE_TAIL)]
      : mergedItems

    const rows = visibleItems.map((item) => {
      if (item.kind === 'aktion') {
        const a = item.aktion
        const isMultiDay = a.beginn !== a.ende
        const isExtern = item.bereich !== 'Stamm'
        return (
          <div key={a.id} className={`${styles.terminRow} ${styles.terminRowAktion} ${isExtern ? styles.terminRowExtern : ''}`}>
            <span className={`${styles.terminDate} ${styles.terminDateKontext}`}>
              {isMultiDay ? formatDateRange(a.beginn, a.ende) : formatTerminDate(a.beginn)}
            </span>
            <span className={styles.terminLabel}>
              <strong>{a.titel}</strong>
              {a.ort && <span className={styles.terminOrt}> · {a.ort}</span>}
            </span>
            <span className={styles.terminRight}>
              <span className={`${styles.aktionChip} ${isExtern ? styles.aktionChipExtern : styles.aktionChipStamm}`}>
                {item.bereich}
              </span>
            </span>
          </div>
        )
      }

      const { iso, source } = item
      const hol = source === 'generated' && isOutsideKontext(iso) ? isHoliday(iso) : null
      const isSkipped = !!hol && !reinstated.has(iso)
      const isReinstatedRow = !!hol && reinstated.has(iso)
      const isKontext = source === 'kontext'

      const stammTreffen = isKontext && activeKontext
        ? activeKontext.treffen.find((t) => t.datum === iso)
        : undefined
      const abzug = stammTreffen ? stammAbzugFuerTreffen(stammTreffen, activeKontext!) : 0
      const teamMin = (stammTreffen?.dauerMin ?? dauer) - abzug

      const holLabel = hol?.feiertag ?? hol?.ferien

      return (
        <div
          key={iso}
          className={`${styles.terminRow} ${isSkipped ? styles.terminSkipped : ''} ${isReinstatedRow ? styles.terminReinstated : ''}`}
        >
          <span className={`${styles.terminDate} ${isKontext ? styles.terminDateKontext : ''}`}>
            {formatTerminDate(iso)}
          </span>
          <span className={styles.terminLabel}>
            {isKontext
              ? <span className={styles.terminBudgetInfo}>{teamMin} Min Team · {abzug} Min Stamm</span>
              : <span>{dauer} min</span>
            }
          </span>
          <span className={styles.terminRight}>
            {holLabel && (
              <span className={styles.terminBadgeFerien}>{holLabel}</span>
            )}
            {hol && (
              <button
                type="button"
                className={`${styles.terminToggle} ${isSkipped ? styles.terminToggleSkipped : styles.terminToggleActive}`}
                title={isSkipped ? 'Findet statt' : 'Entfällt'}
                onClick={() => toggleReinstated(iso)}
              >
                {isSkipped ? <SkipIcon /> : <CheckSmallIcon />}
              </button>
            )}
            {!hol && (
              <Badge tone="neutral" size="sm">
                {isKontext ? 'Stamm' : 'Regel'}
              </Badge>
            )}
          </span>
        </div>
      )
    })

    // Insert collapse row — check if hidden items contain holiday decisions
    if (shouldCollapse) {
      const hiddenItems = mergedItems.slice(VISIBLE_HEAD, mergedItems.length - VISIBLE_TAIL)
      const hiddenHolidayCount = hiddenItems.filter(
        (it) => it.kind === 'treffen' && it.source === 'generated'
          && isOutsideKontext(it.iso) && isHoliday(it.iso),
      ).length

      rows.splice(VISIBLE_HEAD, 0, (
        <div
          key="__collapsed"
          className={styles.terminRowCollapsed}
          onClick={() => setTerminListExpanded(true)}
        >
          <span className={styles.terminDate}>…</span>
          <span className={styles.terminLabel}>
            {hiddenCount} weitere anzeigen
            {hiddenHolidayCount > 0 && (
              <span className={styles.collapsedWarn}>
                <Icon name="warning" size={12} />
                {hiddenHolidayCount} in Ferien
              </span>
            )}
          </span>
          <span />
        </div>
      ))
    }

    return (
      <div className={styles.terminList}>
        {rows}
      </div>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────

  return (
    <Modal
      open={open}
      onClose={saving ? () => undefined : onClose}
      title="Neue Planung"
      description="In vier Schritten zur fertigen Planung."
      size="lg"
      closeOnBackdropClick={false}
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose} disabled={saving}>
            Abbrechen
          </Button>
          <div className={styles.footerRight}>
            {stepIndex > 0 && (
              <Button variant="secondary" onClick={handleBack} disabled={saving}>
                Zurück
              </Button>
            )}
            {!isLastStep && (
              <Button variant="primary" onClick={handleNext}>
                Weiter
              </Button>
            )}
            {isLastStep && (
              <Button variant="primary" onClick={handleStart} loading={saving}>
                Planung starten
              </Button>
            )}
          </div>
        </div>
      }
    >
      <nav className={styles.stepbar} aria-label="Fortschritt">
        {(['teamplanung', 'stammkontext', 'ziele', 'vorschau'] as LogicalStep[]).map((step) => {
          const seqIdx = stepSequence.indexOf(step)
          const isSkipped = seqIdx === -1
          const isActive = !isSkipped && seqIdx === stepIndex
          const isDone = !isSkipped && seqIdx < stepIndex
          const label = isSkipped
            ? STEP_META[step]
            : `${seqIdx + 1} · ${STEP_META[step]}`
          return (
            <span
              key={step}
              className={
                isSkipped ? styles.stepSkipped :
                isActive ? styles.stepActive :
                isDone ? styles.stepDone :
                styles.step
              }
            >
              {label}
            </span>
          )
        })}
      </nav>

      {/* ── Step: Teamplanung ───────────────────────────────────── */}
      {currentStep === 'teamplanung' && (
        <div className={styles.section}>
          <span className={styles.sectionLabel}>Zeitraum</span>
          {/* Rhythmus + Dauer — info text above Von/Bis */}
          {!editingRhythmus ? (
            <div className={styles.rhythmusInfo}>
              <div className={styles.rhythmusInfoRow}>
                <span>
                  <span className={styles.rhythmusInfoLabel}>Rhythmus</span>
                  {WEEKDAY_LABELS[weekday]}, {RHYTHMUS_LABELS[rhythmusK]}
                </span>
                <span className={styles.rhythmusInfoSep}>·</span>
                <span>
                  <span className={styles.rhythmusInfoLabel}>Dauer</span>
                  {dauer} Min
                </span>
              </div>
              <button
                type="button"
                className={styles.editBtn}
                onClick={() => setEditingRhythmus(true)}
                title="Bearbeiten"
              >
                <Icon name="edit" size={13} />
              </button>
            </div>
          ) : (
            <div className={styles.rhythmusEdit}>
              <div className={styles.rhythmusEditFields}>
                <Select<Weekday>
                  label="Wochentag"
                  options={WEEKDAY_OPTIONS}
                  value={weekday}
                  onValueChange={setWeekday}
                />
                <Select<RhythmusKey>
                  label="Rhythmus"
                  options={RHYTHMUS_OPTIONS}
                  value={rhythmusK}
                  onValueChange={setRhythmusK}
                />
                <Input
                  label="Dauer (Min)"
                  type="number"
                  min={15}
                  step={5}
                  value={dauer}
                  onChange={(e) => setDauer(Number.parseInt(e.target.value, 10) || 0)}
                />
              </div>
              <button
                type="button"
                className={styles.editBtnDone}
                onClick={() => setEditingRhythmus(false)}
                title="Fertig"
              >
                <Icon name="check" size={14} />
              </button>
            </div>
          )}

          {/* Von / Bis */}
          <div className={styles.dateRow}>
            <div className={styles.dateField}>
              <Input
                label="Von"
                type="date"
                value={start}
                onChange={(e) => { setStart(e.target.value); setEndeWasAutoSet(false) }}
                required
                noFoot
              />
              {startReason && (
                <p className={styles.dateReason}>{startReason}</p>
              )}
            </div>
            <div className={styles.dateField}>
              <div className={styles.bisField} ref={bisPresetRef}>
                <Input
                  label="Bis"
                  type="date"
                  value={ende}
                  onChange={(e) => { setEnde(e.target.value); setEndeWasAutoSet(false) }}
                  required
                  noFoot
                />
                {bisPresets.length > 0 && (
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={() => setBisPresetOpen((o) => !o)}
                    title="Bis-Vorschläge"
                  >
                    <Icon name="preset" size={14} />
                  </button>
                )}
                {bisPresetOpen && bisPresets.length > 0 && (
                  <div className={styles.presetDropdown}>
                    {bisPresets.map((p) => (
                      <button
                        key={p.iso}
                        type="button"
                        className={styles.presetOption}
                        onClick={() => {
                          setEnde(p.iso)
                          setEndeWasAutoSet(false)
                          setBisPresetOpen(false)
                        }}
                      >
                        <span>{p.label}</span>
                        <span className={styles.presetDate}>{formatDateShort(p.iso)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {endeReason && (
                <p className={styles.dateReason}>{endeReason}</p>
              )}
            </div>
          </div>

          {/* Team section */}
          <div className={styles.teamSection}>
            <span className={styles.kontextSectionLabel}>Mitarbeiter</span>
            <div className={styles.teamChips}>
              {team.map((member) => (
                <div
                  key={member.id}
                  className={styles.teamChip}
                >
                  <div
                    className={styles.teamAvatar}
                    style={{ backgroundColor: `hsl(${member.accentHue ?? 0}, 70%, 50%)` }}
                  >
                    {member.initials}
                  </div>
                  <span>{member.name}</span>
                  <button
                    type="button"
                    className={styles.teamRemove}
                    onClick={() => removeTeamMember(member.id)}
                    title="Entfernen"
                  >
                    ×
                  </button>
                </div>
              ))}
              <input
                type="text"
                className={styles.teamInlineInput}
                placeholder="Name hinzufügen…"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newTeamName.trim()) {
                    e.preventDefault()
                    addTeamMember(newTeamName)
                  }
                }}
              />
            </div>
          </div>

          {/* Termin-Vorschau */}
          <span className={styles.sectionLabel}>
            Termine ({activeMeetingCount - stammaktionenInRange.length} Treffen{stammaktionenInRange.length > 0 ? ` · ${stammaktionenInRange.length} Aktion${stammaktionenInRange.length !== 1 ? 'en' : ''}` : ''})
          </span>
          {renderTerminPreview()}

          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {/* ── Step: Stamm-Kontext (only shown when hasKontext) ──── */}
      {currentStep === 'stammkontext' && hasKontext && (
        <div className={styles.section}>
          {/* Thema */}
          <h3 className={styles.kontextThema}>{activeKontext.thema}</h3>
          {activeKontext.themaBeschreibung && (
            <p className={styles.kontextBeschreibung}>{activeKontext.themaBeschreibung}</p>
          )}

          {/* Vorgeschlagene Aktivitäten */}
          {renderKontextAktivitaeten()}

          {/* Aktionen (Stamm + Distrikt + Regional) */}
          {alleAktionenInRange.length > 0 && (
            <div className={styles.kontextAktionen}>
              <span className={styles.kontextSectionLabel}>Aktionen</span>
              {alleAktionenInRange.map((a) => {
                const isExtern = a.bereich !== 'Stamm'
                return (
                  <div key={a.id} className={`${styles.kontextAktionRow} ${isExtern ? styles.kontextAktionRowExtern : ''}`}>
                    <span className={styles.kontextAktionDate}>
                      {a.beginn !== a.ende ? formatDateRange(a.beginn, a.ende) : formatTerminDate(a.beginn)}
                    </span>
                    <span className={styles.kontextAktionName}>{a.titel}</span>
                    {a.ort && <span className={styles.kontextAktionOrt}>{a.ort}</span>}
                    <span className={`${styles.aktionChip} ${isExtern ? styles.aktionChipExtern : styles.aktionChipStamm}`}>
                      {a.bereich}
                    </span>
                  </div>
                )
              })}
            </div>
          )}

          {/* Treffen — kompakt */}
          {kontextTreffenInRange.length > 0 && (
            <div className={styles.kontextTreffenCompact}>
              <span className={styles.kontextSectionLabel}>
                Treffen · {kontextTreffenInRange.length}
              </span>
              {renderKontextTreffenCompact()}
            </div>
          )}

          {/* Stamm-Blöcke */}
          {(activeKontext.defaultAnfangsBlock.length > 0 || activeKontext.defaultEndBlock.length > 0) && (
            <div className={styles.kontextBloecke}>
              <span className={styles.kontextBloeckeLabel}>Stammzeit pro Treffen:</span>
              {activeKontext.defaultAnfangsBlock.length > 0 && (
                <span>Anfang: {activeKontext.defaultAnfangsBlock.map((b) => `${b.name} (${b.dauerMin} Min)`).join(', ')}</span>
              )}
              {activeKontext.defaultEndBlock.length > 0 && (
                <span>Ende: {activeKontext.defaultEndBlock.map((b) => `${b.name} (${b.dauerMin} Min)`).join(', ')}</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Step: Unsere Ziele ───────────────────────────────── */}
      {currentStep === 'ziele' && (
        <div className={styles.section}>
          <AccordionGroup
            mode="multi"
            defaultOpen={['wb']}
            items={[
              {
                id: 'wb',
                title: <span className={styles.kontextSectionLabel}>Wachstumsbereich</span>,
                children: (
                  <div className={styles.zieleSectionBody}>
                    {/* Tab-Leiste für Modus */}
                    <div className={styles.wbTabRow}>
                      {(['ausgewogen', 'tendenz', 'fokus', 'haupt-neben', 'dominant'] as WbSchwerpunktModus[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`${styles.wbTab} ${wbModus === m ? styles.wbTabActive : ''}`}
                          onClick={() => { setWbModus(m); if (m === 'ausgewogen') setWbBereiche([]) }}
                        >
                          {m === 'ausgewogen' && 'Ausgewogen'}
                          {m === 'tendenz' && 'Tendenz'}
                          {m === 'fokus' && 'Fokus'}
                          {m === 'haupt-neben' && 'Haupt+Neben'}
                          {m === 'dominant' && 'Dominant'}
                        </button>
                      ))}
                    </div>
                    {/* Beschreibung */}
                    <p className={styles.wbModeDesc}>
                      {wbModus === 'ausgewogen' && 'Alle Wachstumsbereiche werden gleichgewichtig behandelt.'}
                      {wbModus === 'tendenz' && 'Wähle ein bis zwei Bereiche, die tendenziell im Fokus stehen.'}
                      {wbModus === 'fokus' && 'Wähle einen Bereich, der klar im Fokus steht.'}
                      {wbModus === 'haupt-neben' && 'Wähle einen Haupt- und einen Nebenbereich.'}
                      {wbModus === 'dominant' && 'Wähle einen Bereich, der dominant im Vordergrund steht.'}
                    </p>
                    {/* Checkbox-Liste */}
                    <div className={styles.wbCheckList}>
                      {WB_KEYS.map((key) => {
                        const isAusgewogen = wbModus === 'ausgewogen'
                        const selectedIndex = wbBereiche.indexOf(key)
                        const isSelected = isAusgewogen || selectedIndex >= 0
                        const maxSelectable =
                          wbModus === 'tendenz' ? 2
                          : wbModus === 'fokus' ? 1
                          : wbModus === 'haupt-neben' ? 2
                          : wbModus === 'dominant' ? 1
                          : 0
                        const checkLabel = wbModus === 'haupt-neben'
                          ? (selectedIndex === 0 ? 'H' : selectedIndex === 1 ? 'N' : '')
                          : (isSelected ? '✓' : '')
                        return (
                          <button
                            key={key}
                            type="button"
                            role="checkbox"
                            aria-checked={isSelected}
                            disabled={isAusgewogen}
                            className={styles.wbCheckRow}
                            onClick={() => {
                              if (selectedIndex >= 0) {
                                setWbBereiche(wbBereiche.filter((k) => k !== key))
                              } else if (wbBereiche.length < maxSelectable) {
                                setWbBereiche([...wbBereiche, key])
                              }
                            }}
                          >
                            <span
                              className={`${styles.wbCheckIcon} ${isSelected ? styles.wbCheckIconChecked : ''}`}
                              style={isSelected ? { ['--wb-check-color' as string]: `var(${WB_CSS_VAR[key]})` } : undefined}
                            >
                              {checkLabel}
                            </span>
                            <span
                              className={styles.wbColorBar}
                              style={{ backgroundColor: `var(${WB_CSS_VAR[key]})` }}
                            />
                            <span className={styles.wbCheckLabel}>{WB_LABELS[key]}</span>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ),
              },
              {
                id: 'andacht',
                title: <span className={styles.kontextSectionLabel}>Andachtsreihe</span>,
                children: (
                  <div className={styles.zieleSectionBody}>
                    <div className={styles.wbTabRow}>
                      {(['none', 'reihe', 'sammlung', 'new'] as AndachtMode[]).map((m) => (
                        <button
                          key={m}
                          type="button"
                          className={`${styles.wbTab} ${andachtMode === m ? styles.wbTabActive : ''}`}
                          onClick={() => {
                            setAndachtMode(m)
                            setAndachtReiheId(null)
                            setAndachtAusgewaehlt(new Set())
                            if (m !== 'new') {
                              setAndachtTitel('')
                              setAndachtEinheiten([])
                            }
                          }}
                        >
                          {m === 'none' && 'Keine'}
                          {m === 'reihe' && 'Reihe wählen'}
                          {m === 'sammlung' && 'Aus Sammlung'}
                          {m === 'new' && 'Neu anlegen'}
                        </button>
                      ))}
                    </div>
                    {andachtMode === 'reihe' && (
                      availableReihen.length === 0 ? (
                        <p className={styles.andachtHint}>
                          Keine Andachtsreihen im Repertoire. Lege eine im Repertoire-Tab an oder wähle „Neu anlegen".
                        </p>
                      ) : (
                        <div className={styles.andachtRepertoireList}>
                          {availableReihen.map((r) => (
                            <button
                              key={r.id}
                              type="button"
                              className={`${styles.andachtRepertoireItem} ${andachtReiheId === r.id ? styles.andachtRepertoireItemSelected : ''}`}
                              onClick={() => setAndachtReiheId(r.id)}
                            >
                              <div className={styles.andachtRepertoireName}>{r.name}</div>
                              <div className={styles.andachtRepertoireMeta}>
                                {r.einheiten.length} Einheit{r.einheiten.length !== 1 ? 'en' : ''}
                                {r.buchquelle?.titel && ` · ${r.buchquelle.titel}`}
                              </div>
                            </button>
                          ))}
                        </div>
                      )
                    )}
                    {andachtMode === 'sammlung' && (
                      availableSammlungen.length === 0 ? (
                        <p className={styles.andachtHint}>
                          Keine Sammlungen im Repertoire.
                        </p>
                      ) : (
                        <>
                          <Select<AndachtsreiheId | ''>
                            label="Sammlung"
                            options={[
                              { value: '', label: '— wählen —' },
                              ...availableSammlungen.map((s) => ({
                                value: s.id,
                                label: s.buchquelle?.titel ? `${s.name} (${s.buchquelle.titel})` : s.name,
                              })),
                            ]}
                            value={andachtReiheId ?? ''}
                            onValueChange={(v) => {
                              setAndachtReiheId(v === '' ? null : (v as AndachtsreiheId))
                              setAndachtAusgewaehlt(new Set())
                            }}
                          />
                          {selectedSammlung && (
                            <>
                              <div className={styles.andachtCounter}>
                                {andachtAusgewaehlt.size} aktiviert · {teamAndachtsBedarf} Treffen ohne Stammandacht
                                {stammandachtenCount > 0 && (
                                  <span className={styles.andachtCounterMeta}>
                                    {' '}({stammandachtenCount} Stammandacht{stammandachtenCount !== 1 ? 'en' : ''} bereits gedeckt)
                                  </span>
                                )}
                              </div>
                              <div className={styles.andachtSammlungList}>
                                {selectedSammlung.einheiten.map((einheit) => {
                                  const aktiv = andachtAusgewaehlt.has(einheit.id)
                                  return (
                                    <button
                                      key={einheit.id}
                                      type="button"
                                      className={`${styles.andachtSammlungItem} ${aktiv ? styles.andachtSammlungItemActive : ''}`}
                                      onClick={() => {
                                        const next = new Set(andachtAusgewaehlt)
                                        if (aktiv) next.delete(einheit.id)
                                        else next.add(einheit.id)
                                        setAndachtAusgewaehlt(next)
                                      }}
                                    >
                                      <span className={styles.andachtSammlungCheck}>{aktiv ? '✓' : ''}</span>
                                      <span className={styles.andachtSammlungTitle}>{einheit.titel}</span>
                                      {einheit.bibelstelle && (
                                        <span className={styles.andachtSammlungMeta}>{einheit.bibelstelle}</span>
                                      )}
                                    </button>
                                  )
                                })}
                              </div>
                            </>
                          )}
                        </>
                      )
                    )}
                    {andachtMode === 'new' && (
                      <>
                        <Input
                          label="Titel der Reihe"
                          placeholder="z.B. Frühjahrsfreizeit 2026"
                          value={andachtTitel}
                          onChange={(e) => setAndachtTitel(e.target.value)}
                        />
                        {teamAndachtsBedarf > 0 && (
                          <p className={styles.andachtHint}>
                            {teamAndachtsBedarf} Einheit{teamAndachtsBedarf !== 1 ? 'en' : ''} gebraucht ({activeMeetingCount} Treffen
                            {stammandachtenCount > 0 && `, ${stammandachtenCount} mit Stammandacht`}).
                          </p>
                        )}
                        <div className={styles.andachtList}>
                          {andachtEinheiten.map((einheit, i) => (
                            <div key={einheit.id} className={styles.andachtRow}>
                              <span className={styles.andachtNumber}>{i + 1}</span>
                              <Input
                                placeholder="Titel der Einheit"
                                value={einheit.titel}
                                autoFocus={andachtFocusRef.current === (einheit.id as string)}
                                onChange={(e) => {
                                  const updated = [...andachtEinheiten]
                                  updated[i] = { ...einheit, titel: e.target.value }
                                  setAndachtEinheiten(updated)
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault()
                                    const isLast = i === andachtEinheiten.length - 1
                                    if (isLast && einheit.titel.trim()) {
                                      const next = newId<AndachtsEinheitId>()
                                      andachtFocusRef.current = next as string
                                      setAndachtEinheiten([...andachtEinheiten, { id: next, titel: '' }])
                                    }
                                  }
                                }}
                              />
                              <button
                                type="button"
                                className={styles.andachtRemove}
                                onClick={() => setAndachtEinheiten(andachtEinheiten.filter((_, idx) => idx !== i))}
                                title="Entfernen"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                        <button
                          type="button"
                          className={styles.addEinheitBtn}
                          onClick={() => {
                            const next = newId<AndachtsEinheitId>()
                            andachtFocusRef.current = next as string
                            setAndachtEinheiten([...andachtEinheiten, { id: next, titel: '' }])
                          }}
                        >
                          + Einheit hinzufügen
                        </button>
                      </>
                    )}
                  </div>
                ),
              },
              {
                id: 'abzeichen',
                title: <span className={styles.kontextSectionLabel}>Abzeichen</span>,
                children: (
                  <div className={styles.zieleSectionBody}>
                    <div className={styles.wbTabRow}>
                      <button
                        type="button"
                        className={`${styles.wbTab} ${!selectedAltersstufe ? styles.wbTabActive : ''}`}
                        onClick={() => { setSelectedAltersstufe(null); setSelectedAbzeichenId(null) }}
                      >
                        Ohne
                      </button>
                      {(['kundschafter', 'pfadfinder'] as Altersstufe[]).map((stufe) => (
                        <button
                          key={stufe}
                          type="button"
                          className={`${styles.wbTab} ${selectedAltersstufe === stufe ? styles.wbTabActive : ''}`}
                          onClick={() => { setSelectedAltersstufe(stufe); setSelectedAbzeichenId(null) }}
                        >
                          {ALTERSSTUFE_LABELS[stufe]}
                        </button>
                      ))}
                    </div>
                    {selectedAltersstufe && (
                      <div className={styles.andachtRepertoireList}>
                        {abzeichenFuerStufe(selectedAltersstufe).map((abz) => (
                          <button
                            key={abz.id}
                            type="button"
                            className={`${styles.andachtRepertoireItem} ${selectedAbzeichenId === abz.id ? styles.andachtRepertoireItemSelected : ''}`}
                            onClick={() => setSelectedAbzeichenId(abz.id)}
                          >
                            <div className={styles.andachtRepertoireName}>{abz.name}</div>
                            <div className={styles.andachtRepertoireMeta}>
                              {abz.anforderungen.length} Anforderung{abz.anforderungen.length !== 1 ? 'en' : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ),
              },
            ]}
          />
          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {/* ── Step: Vorschau & Zusammenfassung ─────────────────── */}
      {currentStep === 'vorschau' && (
        <div className={styles.section}>
          <Input
            label="Eigener Name (optional)"
            placeholder={autoName || 'z.B. Frühling 2026'}
            value={nameOverride}
            onChange={(e) => setNameOverride(e.target.value)}
            hint={autoName && !nameOverride ? `Sonst: „${autoName}"` : undefined}
            className={styles.summaryNameInput}
          />
          <div className={styles.summaryMetaWidget}>
            <div className={styles.summaryMetaBlock}>
              <span className={styles.summaryMetaBlockValueLg}>{activeMeetingCount}</span>
              <span className={styles.summaryMetaBlockLabel}>Treffen</span>
            </div>
            <span className={styles.summaryMetaConnector}>von je</span>
            <div className={styles.summaryMetaBlock}>
              <span className={styles.summaryMetaBlockValue}>{dauer} min</span>
              <span className={styles.summaryMetaBlockLabel}>Dauer</span>
            </div>
            <span className={styles.summaryMetaConnector}>zwischen</span>
            <div className={styles.summaryMetaBlock}>
              <span className={styles.summaryMetaBlockValue}>
                {formatDateShort(start)} – {formatDateShort(ende)}
              </span>
              <span className={styles.summaryMetaBlockLabel}>Zeitraum</span>
            </div>
            <span className={styles.summaryMetaConnector}>jeweils</span>
            <div className={styles.summaryMetaBlock}>
              <span className={styles.summaryMetaBlockValue}>
                {WEEKDAY_LABELS[weekday]}, {RHYTHMUS_LABELS[rhythmusK]}
              </span>
              <span className={styles.summaryMetaBlockLabel}>Rhythmus</span>
            </div>
          </div>

          {/* Stammkontext — prominent */}
          {hasKontext && (
            <div className={styles.summaryKontext}>
              <span className={styles.summarySectionLabel}>Stammkontext</span>
              <p className={styles.summaryKontextThema}>„{activeKontext.thema}"</p>
              {activeKontext.themaBeschreibung && (
                <p className={styles.summarySectionText}>{activeKontext.themaBeschreibung}</p>
              )}
              {alleAktionenInRange.length > 0 && (
                <p className={styles.summarySectionText}>
                  {alleAktionenInRange.length} Aktion{alleAktionenInRange.length !== 1 ? 'en' : ''}
                </p>
              )}
            </div>
          )}

          {/* Ziele — prominent */}
          <div className={styles.summaryZiele}>
            <span className={styles.summarySectionLabel}>Ziele</span>

            {/* WB-Schwerpunkt */}
            <div className={styles.summaryZielRow}>
              <span className={styles.summaryZielLabel}>Wachstumsbereich</span>
              {wbModus === 'ausgewogen' ? (
                <span className={styles.summaryZielValue}>Ausgewogen</span>
              ) : (
                <span className={styles.summaryZielValue}>
                  {wbModus === 'tendenz' && 'Tendenz'}
                  {wbModus === 'fokus' && 'Fokus'}
                  {wbModus === 'haupt-neben' && 'Haupt+Neben'}
                  {wbModus === 'dominant' && 'Dominant'}
                  {wbBereiche.length > 0 && (
                    <>
                      {' — '}
                      {wbBereiche.map((key, i) => (
                        <span key={key}>
                          {i > 0 && ', '}
                          <span
                            className={styles.summaryWbDot}
                            style={{ backgroundColor: `var(${WB_CSS_VAR[key]})` }}
                          />
                          {WB_LABELS[key]}
                        </span>
                      ))}
                    </>
                  )}
                </span>
              )}
            </div>

            {/* Andachtsreihe */}
            <div className={styles.summaryZielRow}>
              <span className={styles.summaryZielLabel}>Andachtsreihe</span>
              {(() => {
                if (andachtMode === 'new' && andachtTitel) {
                  const validCount = andachtEinheiten.filter((e) => e.titel.trim()).length
                  return (
                    <span className={styles.summaryZielValue}>
                      {andachtTitel}
                      {validCount > 0 && (
                        <span className={styles.summaryZielMeta}>
                          {' '}({validCount} Einheit{validCount !== 1 ? 'en' : ''})
                        </span>
                      )}
                    </span>
                  )
                }
                if (andachtMode === 'reihe' && andachtReiheId) {
                  const r = availableReihen.find((x) => x.id === andachtReiheId)
                  return r ? (
                    <span className={styles.summaryZielValue}>
                      {r.name}
                      <span className={styles.summaryZielMeta}>
                        {' '}({r.einheiten.length} Einheit{r.einheiten.length !== 1 ? 'en' : ''})
                      </span>
                    </span>
                  ) : <span className={styles.summaryZielMeta}>—</span>
                }
                if (andachtMode === 'sammlung' && selectedSammlung) {
                  return (
                    <span className={styles.summaryZielValue}>
                      {selectedSammlung.name}
                      <span className={styles.summaryZielMeta}>
                        {' '}({andachtAusgewaehlt.size} aktiviert)
                      </span>
                    </span>
                  )
                }
                return <span className={styles.summaryZielMeta}>Nicht festgelegt</span>
              })()}
            </div>

            {/* Abzeichen */}
            <div className={styles.summaryZielRow}>
              <span className={styles.summaryZielLabel}>Abzeichen</span>
              {selectedAbzeichenId ? (
                <span className={styles.summaryZielValue}>
                  {(() => {
                    const abz = ABZEICHEN_KATALOG.find((a) => a.id === selectedAbzeichenId)
                    return (
                      <>
                        {abz?.name ?? '—'}
                        {abz?.altersstufe && (
                          <span className={styles.summaryZielMeta}>
                            {' '}({ALTERSSTUFE_LABELS[abz.altersstufe]})
                          </span>
                        )}
                      </>
                    )
                  })()}
                </span>
              ) : (
                <span className={styles.summaryZielMeta}>Nicht festgelegt</span>
              )}
            </div>
          </div>

          {/* Team */}
          {team.length > 0 && (
            <div className={styles.summaryTeam}>
              <span className={styles.summarySectionLabel}>Team</span>
              <div className={styles.summaryTeamChips}>
                {team.map((m) => (
                  <span key={m.id} className={styles.summaryTeamChip}>
                    <span
                      className={styles.summaryTeamDot}
                      style={{ backgroundColor: `hsl(${m.accentHue ?? 0}, 70%, 50%)` }}
                    />
                    {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}
    </Modal>
  )
}
