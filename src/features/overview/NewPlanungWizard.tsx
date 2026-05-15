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
import {
  Button,
  Modal,
} from '@/ui/primitives'
import { useGlobalConfig } from '@/features/globalConfig'
import { usePlanungenActions, usePlanungen } from '@/features/planungen'
import { useStammKontext } from '@/features/stammKontext'
import type {
  Altersstufe,
  IsoDate,
  Mitarbeiter,
  Planung,
  StammAktion,
  StammKontext,
  Weekday,
  WbSchwerpunktModus,
} from '@/domain/types'
import { newId, type AbzeichenId, type AndachtsEinheitId, type AndachtsreiheId, type MitarbeiterId } from '@/domain/ids'
import { generateTermine } from '@/domain/dateUtils'
import { generatePlanungsName } from '@/domain/planungFactory'
import { type WBKey } from '@/domain/wb'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { saveAndachtsreihe } from '@/storage/repertoireRepo'
import { classifyDay } from './monthGrid'
import { useFerienForYear } from './useFerienForYear'
import {
  buildBisPresets,
  buildStepSequence,
  clampEndeBeforeSecondKontext,
  defaultEndIso,
  findKontextForZeitraum,
  firstFreeStartDate,
  formatDateShort,
  isoAddMonths,
  isoNextDay,
  isoPrevDay,
  kontextDateRange,
  previewSortKey,
  rhythmusFromKey,
  rhythmusToKey,
  smartDefaultEnd,
  STEP_META,
  type AndachtMode,
  type AktionBereich,
  type LogicalStep,
  type PreviewItem,
  type RhythmusKey,
} from './newPlanungWizardUtils'
import { WizardStep1Team } from './WizardStep1Team'
import { WizardStep2Kontext } from './WizardStep2Kontext'
import { WizardStep3Ziele } from './WizardStep3Ziele'
import { WizardStep4Vorschau } from './WizardStep4Vorschau'
import styles from './NewPlanungWizard.module.css'

// ─── Types ───────────────────────────────────────────────────────────────────

export type NewPlanungWizardProps = {
  open: boolean
  onClose: () => void
  onCreated?: (p: Planung) => void
  /** Pre-filled zeitraum from drag-to-create in JahresplanerSidebar. */
  initialZeitraum?: { start: IsoDate; ende: IsoDate }
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
  const [andachtMode, setAndachtMode] = useState<AndachtMode>('none')
  const [andachtReiheId, setAndachtReiheId] = useState<AndachtsreiheId | null>(null)
  const [andachtAusgewaehlt, setAndachtAusgewaehlt] = useState<Set<AndachtsEinheitId>>(new Set())
  const [andachtTitel, setAndachtTitel] = useState('')
  const [andachtEinheiten, setAndachtEinheiten] = useState<{ id: AndachtsEinheitId; titel: string }[]>([])

  // Abzeichen
  const [_abzeichenEnabled, setAbzeichenEnabled] = useState(false)
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

  // ─── Kontext step helpers ──────────────────────────────────────────────

  /** Aktivitäten aus dem Repertoire, die aus dem Stammkontext importiert wurden. */
  const stammAktivitaeten = useMemo(() => {
    if (!hasKontext || !repertoireState.loaded) return []
    return repertoireState.aktivitaeten.filter(
      (a) => a.stammImportId === activeKontext.stammImportId,
    )
  }, [hasKontext, activeKontext, repertoireState])

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

      {/* ── Step 1: Teamplanung ─────────────────────────────────── */}
      {currentStep === 'teamplanung' && (
        <WizardStep1Team
          weekday={weekday}
          setWeekday={setWeekday}
          rhythmusK={rhythmusK}
          setRhythmusK={setRhythmusK}
          dauer={dauer}
          setDauer={setDauer}
          editingRhythmus={editingRhythmus}
          setEditingRhythmus={setEditingRhythmus}
          start={start}
          setStart={setStart}
          ende={ende}
          setEnde={setEnde}
          setEndeWasAutoSet={setEndeWasAutoSet}
          startReason={startReason}
          endeReason={endeReason}
          bisPresets={bisPresets}
          bisPresetOpen={bisPresetOpen}
          setBisPresetOpen={setBisPresetOpen}
          bisPresetRef={bisPresetRef}
          team={team}
          newTeamName={newTeamName}
          setNewTeamName={setNewTeamName}
          addTeamMember={addTeamMember}
          removeTeamMember={removeTeamMember}
          activeMeetingCount={activeMeetingCount}
          stammaktionenInRange={stammaktionenInRange}
          mergedItems={mergedItems}
          terminListExpanded={terminListExpanded}
          setTerminListExpanded={setTerminListExpanded}
          isOutsideKontext={isOutsideKontext}
          isHoliday={isHoliday}
          reinstated={reinstated}
          toggleReinstated={toggleReinstated}
          activeKontext={activeKontext}
          error={error}
        />
      )}

      {/* ── Step 2: Stamm-Kontext (only shown when hasKontext) ──── */}
      {currentStep === 'stammkontext' && hasKontext && (
        <WizardStep2Kontext
          activeKontext={activeKontext!}
          stammAktivitaeten={stammAktivitaeten}
          alleAktionenInRange={alleAktionenInRange}
          kontextTreffenInRange={kontextTreffenInRange}
        />
      )}

      {/* ── Step 3: Unsere Ziele ─────────────────────────────────── */}
      {currentStep === 'ziele' && (
        <WizardStep3Ziele
          wbModus={wbModus}
          setWbModus={setWbModus}
          wbBereiche={wbBereiche}
          setWbBereiche={setWbBereiche}
          andachtMode={andachtMode}
          setAndachtMode={setAndachtMode}
          andachtReiheId={andachtReiheId}
          setAndachtReiheId={setAndachtReiheId}
          andachtAusgewaehlt={andachtAusgewaehlt}
          setAndachtAusgewaehlt={setAndachtAusgewaehlt}
          andachtTitel={andachtTitel}
          setAndachtTitel={setAndachtTitel}
          andachtEinheiten={andachtEinheiten}
          setAndachtEinheiten={setAndachtEinheiten}
          selectedAltersstufe={selectedAltersstufe}
          setSelectedAltersstufe={setSelectedAltersstufe}
          selectedAbzeichenId={selectedAbzeichenId}
          setSelectedAbzeichenId={setSelectedAbzeichenId}
          availableReihen={availableReihen}
          availableSammlungen={availableSammlungen}
          selectedSammlung={selectedSammlung}
          teamAndachtsBedarf={teamAndachtsBedarf}
          stammandachtenCount={stammandachtenCount}
          activeMeetingCount={activeMeetingCount}
          error={error}
        />
      )}

      {/* ── Step 4: Vorschau & Zusammenfassung ───────────────────── */}
      {currentStep === 'vorschau' && (
        <WizardStep4Vorschau
          nameOverride={nameOverride}
          setNameOverride={setNameOverride}
          autoName={autoName}
          dauer={dauer}
          start={start}
          ende={ende}
          weekday={weekday}
          rhythmusK={rhythmusK}
          activeMeetingCount={activeMeetingCount}
          hasKontext={hasKontext}
          activeKontext={activeKontext}
          alleAktionenInRange={alleAktionenInRange}
          wbModus={wbModus}
          wbBereiche={wbBereiche}
          andachtMode={andachtMode}
          andachtTitel={andachtTitel}
          andachtEinheiten={andachtEinheiten}
          andachtReiheId={andachtReiheId}
          andachtAusgewaehlt={andachtAusgewaehlt}
          availableReihen={availableReihen}
          selectedSammlung={selectedSammlung}
          selectedAbzeichenId={selectedAbzeichenId}
          error={error}
        />
      )}
    </Modal>
  )
}
