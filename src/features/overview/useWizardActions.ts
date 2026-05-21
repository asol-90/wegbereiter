/**
 * Wizard navigation + submit actions. Encapsulates handleNext / handleStart
 * with their validation, error dispatch, and step-jump logic.
 */
import { type Dispatch, type SetStateAction, useState } from 'react'
import type { CreatePlanungInput } from '@/domain/planungFactory'
import type { IsoDate, Mitarbeiter, Planung, WbSchwerpunktModus } from '@/domain/types'
import type { AbzeichenId } from '@/domain/ids'
import { type WBKey } from '@/domain/wb'
import type { UseWizardDerivedResult } from './useWizardDerived'
import type { useZieleErrors } from './useZieleErrors'
import {
  assemblePlanungCreateInput,
  buildAndachtsreihenZuordnung,
  collectExcludeDates,
  hasZieleErrors,
  validateBasics,
  validateZiele,
  type BasicsState,
  type ZieleState,
} from './wizardSubmit'
import type { LogicalStep, RhythmusKey } from './newPlanungWizardUtils'

export type WizardActionsInput = {
  planungen: readonly Planung[]
  derived: UseWizardDerivedResult
  basicsState: () => BasicsState
  zieleState: () => ZieleState
  stepSequence: readonly LogicalStep[]
  currentStep: LogicalStep
  setStepIndex: Dispatch<SetStateAction<number>>
  zieleErrors: ReturnType<typeof useZieleErrors>
  setTeamWarn: (v: boolean) => void
  team: Mitarbeiter[]
  submitArgs: {
    start: IsoDate
    ende: IsoDate
    weekday: Parameters<typeof assemblePlanungCreateInput>[0]['weekday']
    rhythmusK: RhythmusKey
    dauer: number
    team: Mitarbeiter[]
    nameOverride: string
    wbModus: WbSchwerpunktModus
    wbBereiche: WBKey[]
    selectedAbzeichenId: AbzeichenId | null
    reinstated: ReadonlySet<IsoDate>
  }
  create: (input: CreatePlanungInput) => Promise<Planung>
  onCreated?: (p: Planung) => void
  onClose: () => void
}

export type WizardActions = {
  handleNext: () => void
  handleBack: () => void
  handleStart: () => Promise<void>
  saving: boolean
  error: string | null
  setError: (e: string | null) => void
}

export function useWizardActions(input: WizardActionsInput): WizardActions {
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const {
    planungen, derived, basicsState, zieleState, stepSequence, currentStep,
    setStepIndex, zieleErrors, setTeamWarn, team,
    submitArgs, create, onCreated, onClose,
  } = input

  function handleNext() {
    if (currentStep === 'teamplanung') {
      const err = validateBasics(basicsState(), planungen)
      if (err) {
        setError(err)
        if (team.length === 0) setTeamWarn(true)
        return
      }
    }
    if (currentStep === 'ziele') {
      const errs = validateZiele(zieleState())
      if (hasZieleErrors(errs)) {
        zieleErrors.setErrors(errs)
        return
      }
    }
    zieleErrors.reset()
    setError(null)
    setStepIndex((s) => Math.min(stepSequence.length - 1, s + 1))
  }

  function handleBack() {
    setError(null)
    setStepIndex((s) => Math.max(0, s - 1))
  }

  async function handleStart() {
    if (saving) return
    const basicsErr = validateBasics(basicsState(), planungen)
    if (basicsErr) {
      setStepIndex(0)
      setError(basicsErr)
      if (team.length === 0) setTeamWarn(true)
      return
    }
    const zErrs = validateZiele(zieleState())
    if (hasZieleErrors(zErrs)) {
      const zieleIdx = stepSequence.indexOf('ziele')
      if (zieleIdx >= 0) setStepIndex(zieleIdx)
      zieleErrors.setErrors(zErrs)
      return
    }
    try {
      setSaving(true)
      const andachtsreihenZuordnung = await buildAndachtsreihenZuordnung(zieleState())
      const excludeDates = collectExcludeDates(
        derived.generated, derived.mergedItems, submitArgs.reinstated,
        derived.kontextRange, (iso) => !!derived.isHoliday(iso),
      )
      const p = await create(assemblePlanungCreateInput({
        ...submitArgs,
        activeKontext: derived.activeKontext,
        excludeDates,
        kontextTreffenDates: derived.kontextTreffenInRange.map((t) => t.datum),
        abzeichenId: submitArgs.selectedAbzeichenId,
        andachtsreihenZuordnung,
      }))
      onCreated?.(p)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Speichern fehlgeschlagen.')
      setSaving(false)
    }
  }

  return { handleNext, handleBack, handleStart, saving, error, setError }
}
