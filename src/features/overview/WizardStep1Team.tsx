/**
 * WizardStep1Team — orchestrates the first wizard step (Rhythmus / Dauer /
 * date range / team / termin preview). Each block lives in its own file.
 */
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type {
  IsoDate, Mitarbeiter, StammAktion, StammKontext, Weekday,
} from '@/domain/types'
import type { MitarbeiterId } from '@/domain/ids'
import type { BisPreset, PreviewItem, RhythmusKey } from './newPlanungWizardUtils'
import { WizardStep1RhythmusBlock } from './WizardStep1RhythmusBlock'
import { WizardStep1DateRange } from './WizardStep1DateRange'
import { WizardStep1TeamSection } from './WizardStep1TeamSection'
import { WizardStep1TerminPreview } from './WizardStep1TerminPreview'
import styles from './NewPlanungWizard.module.css'

export type WizardStep1TeamProps = {
  weekday: Weekday
  setWeekday: (w: Weekday) => void
  rhythmusK: RhythmusKey
  setRhythmusK: (r: RhythmusKey) => void
  dauer: number
  setDauer: (d: number) => void
  editingRhythmus: boolean
  setEditingRhythmus: (v: boolean) => void
  start: IsoDate
  setStart: (s: IsoDate) => void
  ende: IsoDate
  setEnde: (e: IsoDate) => void
  setEndeWasAutoSet: (v: boolean) => void
  startReason: string | null
  endeReason: string | null
  bisPresets: BisPreset[]
  bisPresetOpen: boolean
  setBisPresetOpen: Dispatch<SetStateAction<boolean>>
  bisPresetRef: RefObject<HTMLDivElement | null>
  team: Mitarbeiter[]
  newTeamName: string
  setNewTeamName: (n: string) => void
  addTeamMember: (name: string) => void
  removeTeamMember: (id: MitarbeiterId) => void
  activeMeetingCount: number
  stammaktionenInRange: StammAktion[]
  mergedItems: PreviewItem[]
  terminListExpanded: boolean
  setTerminListExpanded: (v: boolean) => void
  isOutsideKontext: (iso: IsoDate) => boolean
  isHoliday: (iso: IsoDate) => { ferien?: string; feiertag?: string } | null
  reinstated: Set<IsoDate>
  toggleReinstated: (iso: IsoDate) => void
  activeKontext: StammKontext | undefined
  error: string | null
  teamWarn: boolean
}

function buildTerminHeadline(activeMeetingCount: number, stammCount: number): string {
  const treffenCount = activeMeetingCount - stammCount
  const aktionSuffix = stammCount > 0
    ? ` · ${stammCount} Aktion${stammCount !== 1 ? 'en' : ''}`
    : ''
  return `Termine (${treffenCount} Treffen${aktionSuffix})`
}

export function WizardStep1Team(props: WizardStep1TeamProps) {
  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>Zeitraum</span>
      <WizardStep1RhythmusBlock
        weekday={props.weekday} setWeekday={props.setWeekday}
        rhythmusK={props.rhythmusK} setRhythmusK={props.setRhythmusK}
        dauer={props.dauer} setDauer={props.setDauer}
        editing={props.editingRhythmus} setEditing={props.setEditingRhythmus}
      />
      <WizardStep1DateRange
        start={props.start} setStart={props.setStart}
        ende={props.ende} setEnde={props.setEnde}
        setEndeWasAutoSet={props.setEndeWasAutoSet}
        startReason={props.startReason} endeReason={props.endeReason}
        bisPresets={props.bisPresets}
        bisPresetOpen={props.bisPresetOpen} setBisPresetOpen={props.setBisPresetOpen}
        bisPresetRef={props.bisPresetRef}
      />
      <WizardStep1TeamSection
        team={props.team} newTeamName={props.newTeamName}
        setNewTeamName={props.setNewTeamName}
        addTeamMember={props.addTeamMember} removeTeamMember={props.removeTeamMember}
        teamWarn={props.teamWarn}
      />
      <span className={styles.sectionLabel}>
        {buildTerminHeadline(props.activeMeetingCount, props.stammaktionenInRange.length)}
      </span>
      <WizardStep1TerminPreview
        mergedItems={props.mergedItems}
        terminListExpanded={props.terminListExpanded}
        setTerminListExpanded={props.setTerminListExpanded}
        dauer={props.dauer}
        activeKontext={props.activeKontext}
        isOutsideKontext={props.isOutsideKontext}
        isHoliday={props.isHoliday}
        reinstated={props.reinstated}
        toggleReinstated={props.toggleReinstated}
      />
      {props.error && <p className={styles.error}>{props.error}</p>}
    </div>
  )
}
