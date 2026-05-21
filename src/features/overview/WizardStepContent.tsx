/**
 * Renders the current wizard step. Per-step renderers live as small helpers
 * so the dispatch function stays tiny.
 */
import { type Dispatch, type RefObject, type SetStateAction } from 'react'
import type {
  Altersstufe,
  IsoDate,
  Mitarbeiter,
  WbSchwerpunktModus,
  Weekday,
} from '@/domain/types'
import type { AbzeichenId, AndachtsEinheitId, AndachtsreiheId, MitarbeiterId } from '@/domain/ids'
import { type WBKey } from '@/domain/wb'
import { WizardStep1Team } from './WizardStep1Team'
import { WizardStep2Kontext } from './WizardStep2Kontext'
import { WizardStep3Ziele } from './WizardStep3Ziele'
import { WizardStep4Vorschau } from './WizardStep4Vorschau'
import type { UseWizardDerivedResult } from './useWizardDerived'
import type { ZieleErrors } from './wizardSubmit'
import type { AndachtMode, LogicalStep, RhythmusKey } from './newPlanungWizardUtils'

type CoreFields = {
  start: IsoDate
  setStart: Dispatch<SetStateAction<IsoDate>>
  ende: IsoDate
  setEnde: Dispatch<SetStateAction<IsoDate>>
  weekday: Weekday
  setWeekday: Dispatch<SetStateAction<Weekday>>
  rhythmusK: RhythmusKey
  setRhythmusK: Dispatch<SetStateAction<RhythmusKey>>
  dauer: number
  setDauer: Dispatch<SetStateAction<number>>
  editingRhythmus: boolean
  setEditingRhythmus: Dispatch<SetStateAction<boolean>>
  setEndeWasAutoSet: Dispatch<SetStateAction<boolean>>
  bisPresetOpen: boolean
  setBisPresetOpen: Dispatch<SetStateAction<boolean>>
  bisPresetRef: RefObject<HTMLDivElement | null>
  team: Mitarbeiter[]
  newTeamName: string
  setNewTeamName: Dispatch<SetStateAction<string>>
  addTeamMember: (name: string) => void
  removeTeamMember: (id: MitarbeiterId) => void
  reinstated: Set<IsoDate>
  toggleReinstated: (iso: IsoDate) => void
  terminListExpanded: boolean
  setTerminListExpanded: Dispatch<SetStateAction<boolean>>
  error: string | null
  teamWarn: boolean
  nameOverride: string
  setNameOverride: Dispatch<SetStateAction<string>>
}

type ZieleFields = {
  wbModus: WbSchwerpunktModus
  wbBereiche: WBKey[]
  andachtMode: AndachtMode
  andachtReiheId: AndachtsreiheId | null
  andachtAusgewaehlt: Set<AndachtsEinheitId>
  andachtTitel: string
  andachtEinheiten: { id: AndachtsEinheitId; titel: string }[]
  selectedAltersstufe: Altersstufe | null
  selectedAbzeichenId: AbzeichenId | null
}

type ZieleSetters = {
  setWbModus: (m: WbSchwerpunktModus) => void
  setWbBereiche: (b: WBKey[]) => void
  setAndachtMode: (m: AndachtMode) => void
  setAndachtReiheId: (id: AndachtsreiheId | null) => void
  setAndachtAusgewaehlt: (s: Set<AndachtsEinheitId>) => void
  setAndachtTitel: (t: string) => void
  setAndachtEinheiten: (e: { id: AndachtsEinheitId; titel: string }[]) => void
  setSelectedAltersstufe: (s: Altersstufe | null) => void
  setSelectedAbzeichenId: (id: AbzeichenId | null) => void
}

export type WizardStepContentProps = {
  currentStep: LogicalStep
  core: CoreFields
  ziele: ZieleFields
  zieleSetters: ZieleSetters
  zieleErrors: ZieleErrors
  derived: UseWizardDerivedResult
}

function renderTeamplanung({ core, derived }: WizardStepContentProps) {
  return (
    <WizardStep1Team
      weekday={core.weekday} setWeekday={core.setWeekday}
      rhythmusK={core.rhythmusK} setRhythmusK={core.setRhythmusK}
      dauer={core.dauer} setDauer={core.setDauer}
      editingRhythmus={core.editingRhythmus} setEditingRhythmus={core.setEditingRhythmus}
      start={core.start} setStart={core.setStart} ende={core.ende} setEnde={core.setEnde}
      setEndeWasAutoSet={core.setEndeWasAutoSet}
      startReason={derived.startReason} endeReason={derived.endeReason}
      bisPresets={derived.bisPresets}
      bisPresetOpen={core.bisPresetOpen} setBisPresetOpen={core.setBisPresetOpen}
      bisPresetRef={core.bisPresetRef}
      team={core.team} newTeamName={core.newTeamName} setNewTeamName={core.setNewTeamName}
      addTeamMember={core.addTeamMember} removeTeamMember={core.removeTeamMember}
      activeMeetingCount={derived.activeMeetingCount}
      stammaktionenInRange={derived.stammaktionenInRange}
      mergedItems={derived.mergedItems}
      terminListExpanded={core.terminListExpanded} setTerminListExpanded={core.setTerminListExpanded}
      isOutsideKontext={derived.isOutsideKontext} isHoliday={derived.isHoliday}
      reinstated={core.reinstated} toggleReinstated={core.toggleReinstated}
      activeKontext={derived.activeKontext}
      error={core.error} teamWarn={core.teamWarn}
    />
  )
}

function renderKontext({ derived }: WizardStepContentProps) {
  if (!derived.activeKontext) return null
  return (
    <WizardStep2Kontext
      activeKontext={derived.activeKontext}
      stammAktivitaeten={derived.stammAktivitaeten}
      alleAktionenInRange={derived.alleAktionenInRange}
      kontextTreffenInRange={derived.kontextTreffenInRange}
    />
  )
}

function renderZiele({ ziele, zieleSetters, zieleErrors, derived }: WizardStepContentProps) {
  return (
    <WizardStep3Ziele
      wbModus={ziele.wbModus} setWbModus={zieleSetters.setWbModus}
      wbBereiche={ziele.wbBereiche} setWbBereiche={zieleSetters.setWbBereiche}
      andachtMode={ziele.andachtMode} setAndachtMode={zieleSetters.setAndachtMode}
      andachtReiheId={ziele.andachtReiheId} setAndachtReiheId={zieleSetters.setAndachtReiheId}
      andachtAusgewaehlt={ziele.andachtAusgewaehlt} setAndachtAusgewaehlt={zieleSetters.setAndachtAusgewaehlt}
      andachtTitel={ziele.andachtTitel} setAndachtTitel={zieleSetters.setAndachtTitel}
      andachtEinheiten={ziele.andachtEinheiten} setAndachtEinheiten={zieleSetters.setAndachtEinheiten}
      selectedAltersstufe={ziele.selectedAltersstufe} setSelectedAltersstufe={zieleSetters.setSelectedAltersstufe}
      selectedAbzeichenId={ziele.selectedAbzeichenId} setSelectedAbzeichenId={zieleSetters.setSelectedAbzeichenId}
      availableReihen={derived.availableReihen} availableSammlungen={derived.availableSammlungen}
      selectedSammlung={derived.selectedSammlung}
      teamAndachtsBedarf={derived.teamAndachtsBedarf}
      stammandachtenCount={derived.stammandachtenCount}
      activeMeetingCount={derived.activeMeetingCount}
      wbError={zieleErrors.wb} andachtError={zieleErrors.andacht} abzeichenError={zieleErrors.abzeichen}
    />
  )
}

function renderVorschau({ core, ziele, derived }: WizardStepContentProps) {
  return (
    <WizardStep4Vorschau
      nameOverride={core.nameOverride} setNameOverride={core.setNameOverride}
      autoName={derived.autoName}
      dauer={core.dauer} start={core.start} ende={core.ende}
      weekday={core.weekday} rhythmusK={core.rhythmusK}
      activeMeetingCount={derived.activeMeetingCount}
      hasKontext={derived.hasKontext} activeKontext={derived.activeKontext}
      alleAktionenInRange={derived.alleAktionenInRange}
      wbModus={ziele.wbModus} wbBereiche={ziele.wbBereiche}
      andachtMode={ziele.andachtMode} andachtTitel={ziele.andachtTitel}
      andachtEinheiten={ziele.andachtEinheiten}
      andachtReiheId={ziele.andachtReiheId} andachtAusgewaehlt={ziele.andachtAusgewaehlt}
      availableReihen={derived.availableReihen} selectedSammlung={derived.selectedSammlung}
      selectedAbzeichenId={ziele.selectedAbzeichenId}
      error={core.error}
    />
  )
}

const RENDERERS: Record<LogicalStep, (props: WizardStepContentProps) => React.ReactElement | null> = {
  teamplanung: renderTeamplanung,
  stammkontext: renderKontext,
  ziele: renderZiele,
  vorschau: renderVorschau,
}

export function WizardStepContent(props: WizardStepContentProps) {
  return RENDERERS[props.currentStep](props)
}
