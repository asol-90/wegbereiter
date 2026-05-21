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
import { useMemo, useRef, useState } from 'react'
import { Button, Modal } from '@/ui/primitives'
import { useGlobalConfig } from '@/features/globalConfig'
import { usePlanungenActions, usePlanungen } from '@/features/planungen'
import { useStammKontext } from '@/features/stammKontext'
import type {
  Altersstufe, IsoDate, Mitarbeiter, Planung, WbSchwerpunktModus,
} from '@/domain/types'
import { newId, type AbzeichenId, type AndachtsEinheitId, type AndachtsreiheId, type MitarbeiterId } from '@/domain/ids'
import { type WBKey } from '@/domain/wb'
import { useOutsideClick } from '@/hooks/useOutsideClick'
import {
  buildStepSequence, type AndachtMode, type LogicalStep, type RhythmusKey,
} from './newPlanungWizardUtils'
import { WizardStepBar } from './WizardStepBar'
import { WizardStepContent } from './WizardStepContent'
import { computeInitialWizardState } from './wizardInitialState'
import { useWizardDerived } from './useWizardDerived'
import { useZieleErrors } from './useZieleErrors'
import { useWizardFerienAutoEnd } from './useWizardFerienAutoEnd'
import { useWizardActions } from './useWizardActions'
import { useZieleSetters } from './useZieleSetters'
import styles from './NewPlanungWizard.module.css'

export type NewPlanungWizardProps = {
  open: boolean
  onClose: () => void
  onCreated?: (p: Planung) => void
  /** Pre-filled zeitraum from drag-to-create in JahresplanerSidebar. */
  initialZeitraum?: { start: IsoDate; ende: IsoDate }
}

/**
 * Thin wrapper that unmounts the wizard body when closed. This lets the body
 * compute all initial state in `useState` initializers on mount instead of via
 * a large reset-`useEffect` that fired ~20 setState calls (cascading renders).
 */
export function NewPlanungWizard(props: NewPlanungWizardProps) {
  if (!props.open) return null
  return <NewPlanungWizardBody {...props} />
}

function generateInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

function NewPlanungWizardBody({ open, onClose, onCreated, initialZeitraum }: NewPlanungWizardProps) {
  const { config, loaded } = useGlobalConfig()
  const { create } = usePlanungenActions()
  const { kontexte } = useStammKontext()
  const { planungen } = usePlanungen()

  const [initial] = useState(() =>
    computeInitialWizardState({ config, loaded, planungen, kontexte, initialZeitraum }),
  )

  const [stepIndex, setStepIndex] = useState(0)
  const [nameOverride, setNameOverride] = useState('')
  const [start, setStart] = useState<IsoDate>(initial.start)
  const [ende, setEnde] = useState<IsoDate>(initial.ende)
  const [weekday, setWeekday] = useState(initial.weekday)
  const [rhythmusK, setRhythmusK] = useState<RhythmusKey>(initial.rhythmusK)
  const [dauer, setDauer] = useState(initial.dauer)
  const [editingRhythmus, setEditingRhythmus] = useState(false)
  const [reinstated, setReinstated] = useState<Set<IsoDate>>(new Set())
  const [terminListExpanded, setTerminListExpanded] = useState(false)
  const [bisPresetOpen, setBisPresetOpen] = useState(false)
  const bisPresetRef = useRef<HTMLDivElement>(null)
  const [team, setTeam] = useState<Mitarbeiter[]>(initial.team)
  const [newTeamName, setNewTeamName] = useState('')
  const [teamWarn, setTeamWarn] = useState(false)
  const [endeWasAutoSet, setEndeWasAutoSet] = useState(true)

  const [wbModus, setWbModus] = useState<WbSchwerpunktModus>('ausgewogen')
  const [wbBereiche, setWbBereiche] = useState<WBKey[]>([])
  const [andachtMode, setAndachtMode] = useState<AndachtMode>('none')
  const [andachtReiheId, setAndachtReiheId] = useState<AndachtsreiheId | null>(null)
  const [andachtAusgewaehlt, setAndachtAusgewaehlt] = useState<Set<AndachtsEinheitId>>(new Set())
  const [andachtTitel, setAndachtTitel] = useState('')
  const [andachtEinheiten, setAndachtEinheiten] = useState<{ id: AndachtsEinheitId; titel: string }[]>([])
  const [selectedAltersstufe, setSelectedAltersstufe] = useState<Altersstufe | null>(null)
  const [selectedAbzeichenId, setSelectedAbzeichenId] = useState<AbzeichenId | null>(null)
  const zieleErrors = useZieleErrors()

  const derived = useWizardDerived({ start, ende, weekday, rhythmusK, planungen, kontexte, reinstated, andachtMode, andachtReiheId })
  const stepSequence = useMemo(() => buildStepSequence(derived.hasKontext), [derived.hasKontext])
  const currentStep: LogicalStep = stepSequence[stepIndex] ?? 'teamplanung'
  const isLastStep = stepIndex === stepSequence.length - 1

  useWizardFerienAutoEnd({ start, hasKontext: derived.hasKontext, ferien1: derived.ferienYear1, ferien2: derived.ferienYear2, endeWasAutoSet, setEnde })
  useOutsideClick(bisPresetRef, bisPresetOpen, () => setBisPresetOpen(false))

  function addTeamMember(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    setTeam((prev) => [...prev, { id: newId<MitarbeiterId>(), name: trimmed, initials: generateInitials(trimmed), accentHue: (prev.length * 60) % 360 }])
    setNewTeamName('')
    setTeamWarn(false)
  }
  function toggleReinstated(iso: IsoDate) {
    setReinstated((prev) => { const next = new Set(prev); if (next.has(iso)) next.delete(iso); else next.add(iso); return next })
  }

  const zieleSetters = useZieleSetters({
    setWbModus, setWbBereiche, setAndachtMode, setAndachtReiheId, setAndachtAusgewaehlt,
    setAndachtTitel, setAndachtEinheiten, setSelectedAltersstufe, setSelectedAbzeichenId,
    zieleErrors,
  })

  const actions = useWizardActions({
    planungen, derived, stepSequence, currentStep, setStepIndex,
    zieleErrors, setTeamWarn, team,
    basicsState: () => ({ start, ende, dauer, team }),
    zieleState: () => ({ wbModus, wbBereiche, andachtMode, andachtReiheId, andachtAusgewaehlt, andachtTitel, andachtEinheiten, selectedAltersstufe, selectedAbzeichenId }),
    submitArgs: { start, ende, weekday, rhythmusK, dauer, team, nameOverride, wbModus, wbBereiche, selectedAbzeichenId, reinstated },
    create, onCreated, onClose,
  })

  return (
    <Modal
      open={open}
      onClose={actions.saving ? () => undefined : onClose}
      title="Neue Planung"
      description="In vier Schritten zur fertigen Planung."
      size="lg"
      closeOnBackdropClick={false}
      footer={
        <div className={styles.footer}>
          <Button variant="ghost" onClick={onClose} disabled={actions.saving}>Abbrechen</Button>
          <div className={styles.footerRight}>
            {stepIndex > 0 && (
              <Button variant="secondary" onClick={actions.handleBack} disabled={actions.saving}>Zurück</Button>
            )}
            {isLastStep
              ? <Button variant="primary" onClick={actions.handleStart} loading={actions.saving}>Planung starten</Button>
              : <Button variant="primary" onClick={actions.handleNext}>Weiter</Button>}
          </div>
        </div>
      }
    >
      <WizardStepBar stepSequence={stepSequence} stepIndex={stepIndex} />
      <WizardStepContent
        currentStep={currentStep}
        derived={derived}
        zieleErrors={zieleErrors.errors}
        core={{
          start, setStart, ende, setEnde, weekday, setWeekday, rhythmusK, setRhythmusK,
          dauer, setDauer, editingRhythmus, setEditingRhythmus, setEndeWasAutoSet,
          bisPresetOpen, setBisPresetOpen, bisPresetRef,
          team, newTeamName, setNewTeamName, addTeamMember,
          removeTeamMember: (id) => setTeam((t) => t.filter((m) => m.id !== id)),
          reinstated, toggleReinstated,
          terminListExpanded, setTerminListExpanded,
          error: actions.error, teamWarn, nameOverride, setNameOverride,
        }}
        ziele={{ wbModus, wbBereiche, andachtMode, andachtReiheId, andachtAusgewaehlt, andachtTitel, andachtEinheiten, selectedAltersstufe, selectedAbzeichenId }}
        zieleSetters={zieleSetters}
      />
    </Modal>
  )
}
