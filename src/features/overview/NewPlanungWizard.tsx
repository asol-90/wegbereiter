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

type PreviewItem =
  | { kind: 'treffen'; iso: IsoDate; source: 'kontext' | 'generated' }
  | { kind: 'aktion'; aktion: StammAktion }

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
  const [andachtEnabled, setAndachtEnabled] = useState(false)
  const [andachtTitel, setAndachtTitel] = useState('')
  const [andachtEinheiten, setAndachtEinheiten] = useState<{ id: AndachtsEinheitId; titel: string }[]>([])

  // Abzeichen
  const [abzeichenEnabled, setAbzeichenEnabled] = useState(false)
  const [selectedAltersstufe, setSelectedAltersstufe] = useState<Altersstufe | null>(null)
  const [selectedAbzeichenId, setSelectedAbzeichenId] = useState<AbzeichenId | null>(null)

  // Accordion state for Ziele sections
  const [zieleOpen, setZieleOpen] = useState<Set<number>>(new Set([0])) // Start with WB section open

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const generatedForGaps = useMemo(
    () => generated.filter((iso) => !kontextDateSet.has(iso)),
    [generated, kontextDateSet],
  )

  const stammaktionenInRange = useMemo(() => {
    if (!hasKontext || !start || !ende) return []
    return activeKontext.stammaktionen
      .filter((a) => a.beginn <= ende && a.ende >= start)
      .sort((a, b) => a.beginn.localeCompare(b.beginn))
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

  /** A generated date needs Ferien-handling only if outside the Kontext range. */
  function isOutsideKontext(iso: IsoDate): boolean {
    if (!kontextRange) return true
    return iso < kontextRange.von || iso > kontextRange.bis
  }

  // Merged list: treffen + stammaktionen, sorted chronologically
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
      ...stammaktionenInRange.map((a) => ({
        kind: 'aktion' as const,
        aktion: a,
      })),
    ]
    return items.sort((a, b) => previewSortKey(a).localeCompare(previewSortKey(b)))
  }, [kontextTreffenInRange, generatedForGaps, stammaktionenInRange])

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
      // Collect dates that were skipped (holiday + not reinstated + outside Kontext)
      const excludeDates = new Set<IsoDate>()
      for (const item of mergedItems) {
        if (item.kind !== 'treffen' || item.source !== 'generated') continue
        if (!isOutsideKontext(item.iso)) continue
        const hol = isHoliday(item.iso)
        if (hol && !reinstated.has(item.iso)) excludeDates.add(item.iso)
      }

      // Build WB-Schwerpunkt if selected (not ausgewogen)
      const wbSchwerpunkt = wbModus !== 'ausgewogen'
        ? { modus: wbModus, bereiche: wbBereiche }
        : undefined

      // Build abzeichen selection
      const abzeichenAuswahl = selectedAbzeichenId
        ? [{ abzeichenId: selectedAbzeichenId }]
        : []

      // Save Andachtsreihe to IDB if configured
      const andachtsreihenZuordnung: import('@/domain/types').AndachtsreiheZuordnung[] = []
      if (andachtEnabled && andachtTitel.trim() && andachtEinheiten.length > 0) {
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
        <div className={styles.kontextAktivitaetenGrid}>
          {stammAktivitaeten.map((a) => (
            <div key={a.id} className={styles.kontextAktivitaetChip}>
              <span className={styles.kontextAktivitaetName}>{a.name}</span>
              <span className={styles.kontextAktivitaetTyp}>
                {aktivitaetLabel(a.typ, a.untertyp)}
              </span>
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
        return (
          <div key={a.id} className={`${styles.terminRow} ${styles.terminRowAktion}`}>
            <span className={`${styles.terminDate} ${styles.terminDateKontext}`}>
              {isMultiDay ? formatDateRange(a.beginn, a.ende) : formatTerminDate(a.beginn)}
            </span>
            <span className={styles.terminLabel}>
              <strong>{a.titel}</strong>
              {a.ort && <span className={styles.terminOrt}> · {a.ort}</span>}
            </span>
            <span className={styles.terminRight}>
              <Badge tone="neutral">Stamm</Badge>
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
        <div className={styles.terminListHeader}>
          <span>Termine</span>
          <span className={styles.terminListCount}>
            {activeMeetingCount} aktiv
            {stammaktionenInRange.length > 0 && ` · ${stammaktionenInRange.length} Aktion${stammaktionenInRange.length !== 1 ? 'en' : ''}`}
          </span>
        </div>
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
        {stepLabels(stepSequence).map((label, i) => (
          <span
            key={label}
            className={
              i === stepIndex
                ? styles.stepActive
                : i < stepIndex
                  ? styles.stepDone
                  : styles.step
            }
          >
            {label}
          </span>
        ))}
      </nav>

      {/* ── Step: Teamplanung ───────────────────────────────────── */}
      {currentStep === 'teamplanung' && (
        <div className={styles.section}>
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
            <Input
              label="Von"
              type="date"
              value={start}
              onChange={(e) => { setStart(e.target.value); setEndeWasAutoSet(false) }}
              required
            />
            <div className={styles.bisField} ref={bisPresetRef}>
              <Input
                label="Bis"
                type="date"
                value={ende}
                onChange={(e) => { setEnde(e.target.value); setEndeWasAutoSet(false) }}
                required
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
          </div>

          {hasKontext && (
            <p className={styles.kontextHintInline}>
              Zeitraum aus Stammkontext „{activeKontext.thema}" vorgeschlagen.
            </p>
          )}

          {/* Team section */}
          <div className={styles.teamSection}>
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
            </div>
            <div className={styles.teamAddRow}>
              <Input
                placeholder="Name hinzufügen…"
                value={newTeamName}
                onChange={(e) => setNewTeamName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    addTeamMember(newTeamName)
                  }
                }}
              />
              <Button
                variant="secondary"
                onClick={() => addTeamMember(newTeamName)}
                disabled={!newTeamName.trim()}
              >
                +
              </Button>
            </div>
          </div>

          {/* Termin-Vorschau */}
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

          {/* Stammaktionen */}
          {stammaktionenInRange.length > 0 && (
            <div className={styles.kontextAktionen}>
              <span className={styles.kontextSectionLabel}>Stammaktionen</span>
              {stammaktionenInRange.map((a) => (
                <div key={a.id} className={styles.kontextAktionRow}>
                  <span className={styles.kontextAktionDate}>
                    {a.beginn !== a.ende ? formatDateRange(a.beginn, a.ende) : formatTerminDate(a.beginn)}
                  </span>
                  <span className={styles.kontextAktionName}>{a.titel}</span>
                  {a.ort && <span className={styles.kontextAktionOrt}>{a.ort}</span>}
                </div>
              ))}
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
          {/* Section 0: WB-Schwerpunkt */}
          <div className={styles.zieleSection}>
            <button
              type="button"
              className={styles.zieleSectionHeader}
              onClick={() => {
                const next = new Set(zieleOpen)
                if (next.has(0)) next.delete(0)
                else next.add(0)
                setZieleOpen(next)
              }}
            >
              <span>WB-Schwerpunkt</span>
              <span className={`${styles.zieleSectionArrow} ${zieleOpen.has(0) ? styles.arrowOpen : ''}`}>▾</span>
            </button>
            {zieleOpen.has(0) && (
              <div className={styles.zieleSectionBody}>
                {/* Modus buttons */}
                <div className={styles.modusBtnRow}>
                  {(['ausgewogen', 'tendenz', 'fokus', 'haupt-neben', 'dominant'] as WbSchwerpunktModus[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      className={`${styles.modusBtn} ${wbModus === m ? styles.modusBtnActive : ''}`}
                      onClick={() => {
                        setWbModus(m)
                        if (m === 'ausgewogen') setWbBereiche([])
                      }}
                    >
                      {m === 'ausgewogen' && 'Ausgewogen'}
                      {m === 'tendenz' && 'Tendenz'}
                      {m === 'fokus' && 'Fokus'}
                      {m === 'haupt-neben' && 'Haupt+Neben'}
                      {m === 'dominant' && 'Dominant'}
                    </button>
                  ))}
                </div>

                {/* Mode-specific content */}
                {wbModus === 'ausgewogen' && (
                  <p className={styles.wbModeText}>Alle Bereiche gleichgewichtig</p>
                )}

                {(wbModus === 'tendenz' || wbModus === 'fokus' || wbModus === 'haupt-neben' || wbModus === 'dominant') && (
                  <div className={styles.wbChips}>
                    {WB_KEYS.map((key) => {
                      const isSelected = wbBereiche.includes(key)
                      const maxSelectable =
                        wbModus === 'tendenz' ? 2
                        : wbModus === 'fokus' ? 1
                        : wbModus === 'haupt-neben' ? 2
                        : wbModus === 'dominant' ? 1
                        : 0

                      return (
                        <button
                          key={key}
                          type="button"
                          className={`${styles.wbChip} ${isSelected ? styles.wbChipSelected : ''}`}
                          style={{
                            borderLeftColor: isSelected ? `var(${WB_CSS_VAR[key]})` : 'transparent',
                          }}
                          onClick={() => {
                            if (isSelected) {
                              setWbBereiche(wbBereiche.filter((k) => k !== key))
                            } else if (wbBereiche.length < maxSelectable) {
                              setWbBereiche([...wbBereiche, key])
                            }
                          }}
                        >
                          {WB_LABELS[key]}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Section 1: Andachtsreihe */}
          <div className={styles.zieleSection}>
            <button
              type="button"
              className={styles.zieleSectionHeader}
              onClick={() => {
                const next = new Set(zieleOpen)
                if (next.has(1)) next.delete(1)
                else next.add(1)
                setZieleOpen(next)
              }}
            >
              <span>Andachtsreihe</span>
              <span className={`${styles.zieleSectionArrow} ${zieleOpen.has(1) ? styles.arrowOpen : ''}`}>▾</span>
            </button>
            {zieleOpen.has(1) && (
              <div className={styles.zieleSectionBody}>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setAndachtEnabled(!andachtEnabled)}
                >
                  {andachtEnabled ? '✓' : ''} Andachtsreihe festlegen
                </button>

                {andachtEnabled && (
                  <>
                    <Input
                      label="Titel der Reihe"
                      placeholder="z.B. Frühjahrsfreizeit 2026"
                      value={andachtTitel}
                      onChange={(e) => setAndachtTitel(e.target.value)}
                    />

                    <div className={styles.andachtList}>
                      {andachtEinheiten.map((einheit, i) => (
                        <div key={einheit.id} className={styles.andachtRow}>
                          <span className={styles.andachtNumber}>{i + 1}</span>
                          <Input
                            placeholder="Titel der Einheit"
                            value={einheit.titel}
                            onChange={(e) => {
                              const updated = [...andachtEinheiten]
                              updated[i] = { ...einheit, titel: e.target.value }
                              setAndachtEinheiten(updated)
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
                        const newId_ = newId<AndachtsEinheitId>()
                        setAndachtEinheiten([...andachtEinheiten, { id: newId_, titel: '' }])
                      }}
                    >
                      + Einheit hinzufügen
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Section 2: Abzeichen */}
          <div className={styles.zieleSection}>
            <button
              type="button"
              className={styles.zieleSectionHeader}
              onClick={() => {
                const next = new Set(zieleOpen)
                if (next.has(2)) next.delete(2)
                else next.add(2)
                setZieleOpen(next)
              }}
            >
              <span>Abzeichen</span>
              <span className={`${styles.zieleSectionArrow} ${zieleOpen.has(2) ? styles.arrowOpen : ''}`}>▾</span>
            </button>
            {zieleOpen.has(2) && (
              <div className={styles.zieleSectionBody}>
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => {
                    setAbzeichenEnabled(!abzeichenEnabled)
                    if (!abzeichenEnabled) {
                      setSelectedAltersstufe(null)
                      setSelectedAbzeichenId(null)
                    }
                  }}
                >
                  {abzeichenEnabled ? '✓' : ''} Abzeichen wählen
                </button>

                {abzeichenEnabled && (
                  <>
                    {/* Step A: Altersstufe selection */}
                    <div className={styles.abzeichenStufenRow}>
                      {(['kundschafter', 'pfadfinder'] as Altersstufe[]).map((stufe) => (
                        <button
                          key={stufe}
                          type="button"
                          className={`${styles.stufeBtn} ${selectedAltersstufe === stufe ? styles.stufeBtnSelected : ''}`}
                          onClick={() => {
                            setSelectedAltersstufe(stufe)
                            setSelectedAbzeichenId(null)
                          }}
                        >
                          {ALTERSSTUFE_LABELS[stufe]}
                        </button>
                      ))}
                    </div>

                    {/* Step B: Abzeichen selection (if Altersstufe selected) */}
                    {selectedAltersstufe && (
                      <div className={styles.abzeichenCardGrid}>
                        {abzeichenFuerStufe(selectedAltersstufe).map((abz) => (
                          <button
                            key={abz.id}
                            type="button"
                            className={`${styles.abzeichenCard} ${selectedAbzeichenId === abz.id ? styles.abzeichenCardSelected : ''}`}
                            onClick={() => setSelectedAbzeichenId(abz.id)}
                          >
                            <div className={styles.abzeichenCardName}>{abz.name}</div>
                            <div className={styles.abzeichenCardMeta}>
                              {abz.anforderungen.length} Anforderung{abz.anforderungen.length !== 1 ? 'en' : ''}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Confirmation when Abzeichen selected */}
                    {selectedAbzeichenId && selectedAltersstufe && (
                      <div className={styles.abzeichenConfirm}>
                        {(() => {
                          const abz = ABZEICHEN_KATALOG.find((a) => a.id === selectedAbzeichenId)
                          return (
                            <>
                              <strong>{abz?.name}</strong>
                              <span className={styles.abzeichenConfirmMeta}>
                                {abz?.anforderungen.length} Anforderung{abz && abz.anforderungen.length !== 1 ? 'en' : ''}
                              </span>
                            </>
                          )
                        })()}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {error && <p className={styles.error}>{error}</p>}
        </div>
      )}

      {/* ── Step: Vorschau & Zusammenfassung ─────────────────── */}
      {currentStep === 'vorschau' && (
        <div className={styles.section}>
          {/* Name + Metadaten nebeneinander */}
          <div className={styles.summaryHeader}>
            <Input
              label="Name der Planung"
              placeholder={autoName || 'wird aus dem Zeitraum abgeleitet'}
              value={nameOverride}
              onChange={(e) => setNameOverride(e.target.value)}
              hint={autoName && !nameOverride ? `Vorschlag: ${autoName}` : undefined}
            />
            <div className={styles.summaryMeta}>
              <span className={styles.summaryMetaItem}>
                <span className={styles.summaryMetaValue}>{activeMeetingCount}</span> Treffen
              </span>
              <span className={styles.summaryMetaSep}>·</span>
              <span className={styles.summaryMetaItem}>{dauer} min</span>
              <span className={styles.summaryMetaSep}>·</span>
              <span className={styles.summaryMetaItem}>
                {WEEKDAY_LABELS[weekday]}, {RHYTHMUS_LABELS[rhythmusK]}
              </span>
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
              {stammaktionenInRange.length > 0 && (
                <p className={styles.summarySectionText}>
                  {stammaktionenInRange.length} Stammaktion{stammaktionenInRange.length !== 1 ? 'en' : ''}
                </p>
              )}
            </div>
          )}

          {/* Ziele — prominent */}
          <div className={styles.summaryZiele}>
            <span className={styles.summarySectionLabel}>Ziele</span>

            {/* WB-Schwerpunkt */}
            <div className={styles.summaryZielRow}>
              <span className={styles.summaryZielLabel}>WB-Schwerpunkt</span>
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
              {andachtEnabled && andachtTitel ? (
                <span className={styles.summaryZielValue}>
                  {andachtTitel}
                  {andachtEinheiten.length > 0 && (
                    <span className={styles.summaryZielMeta}>
                      {' '}({andachtEinheiten.length} Einheit{andachtEinheiten.length !== 1 ? 'en' : ''})
                    </span>
                  )}
                </span>
              ) : andachtEnabled ? (
                <span className={styles.summaryZielMeta}>Aktiviert, noch ohne Titel</span>
              ) : (
                <span className={styles.summaryZielMeta}>Nicht festgelegt</span>
              )}
            </div>

            {/* Abzeichen */}
            <div className={styles.summaryZielRow}>
              <span className={styles.summaryZielLabel}>Abzeichen</span>
              {selectedAbzeichenId ? (
                <span className={styles.summaryZielValue}>
                  {ABZEICHEN_KATALOG.find((a) => a.id === selectedAbzeichenId)?.name ?? '—'}
                  <span className={styles.summaryZielMeta}>
                    {' '}({selectedAltersstufe ? ALTERSSTUFE_LABELS[selectedAltersstufe] : '—'})
                  </span>
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
