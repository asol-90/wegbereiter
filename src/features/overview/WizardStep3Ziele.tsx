/**
 * WizardStep3Ziele — orchestrates the three ziele sections: WB-Schwerpunkt,
 * Andachtsreihe, Abzeichen. Each section lives in its own file.
 *
 * The component also expands sections automatically when a validation error
 * fires (via a render-phase pattern, not useEffect).
 */
import { useState, type ReactElement } from 'react'
import { AccordionGroup } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import type { Altersstufe, Andachtsreihe, WbSchwerpunktModus } from '@/domain/types'
import type { AbzeichenId, AndachtsEinheitId, AndachtsreiheId } from '@/domain/ids'
import { type WBKey } from '@/domain/wb'
import { type AndachtMode } from './newPlanungWizardUtils'
import { WizardStep3WBSection } from './WizardStep3WBSection'
import { WizardStep3AndachtSection } from './WizardStep3AndachtSection'
import { WizardStep3AbzeichenSection } from './WizardStep3AbzeichenSection'
import styles from './NewPlanungWizard.module.css'

export type WizardStep3ZieleProps = {
  wbModus: WbSchwerpunktModus
  setWbModus: (m: WbSchwerpunktModus) => void
  wbBereiche: WBKey[]
  setWbBereiche: (b: WBKey[]) => void
  andachtMode: AndachtMode
  setAndachtMode: (m: AndachtMode) => void
  andachtReiheId: AndachtsreiheId | null
  setAndachtReiheId: (id: AndachtsreiheId | null) => void
  andachtAusgewaehlt: Set<AndachtsEinheitId>
  setAndachtAusgewaehlt: (s: Set<AndachtsEinheitId>) => void
  andachtTitel: string
  setAndachtTitel: (t: string) => void
  andachtEinheiten: { id: AndachtsEinheitId; titel: string }[]
  setAndachtEinheiten: (e: { id: AndachtsEinheitId; titel: string }[]) => void
  selectedAltersstufe: Altersstufe | null
  setSelectedAltersstufe: (s: Altersstufe | null) => void
  selectedAbzeichenId: AbzeichenId | null
  setSelectedAbzeichenId: (id: AbzeichenId | null) => void
  availableReihen: readonly Andachtsreihe[]
  availableSammlungen: readonly Andachtsreihe[]
  selectedSammlung: Andachtsreihe | null
  teamAndachtsBedarf: number
  stammandachtenCount: number
  activeMeetingCount: number
  wbError: string | null
  andachtError: string | null
  abzeichenError: string | null
}

type ErrorMap = { wb: string | null; andacht: string | null; abzeichen: string | null }

const warnTrailing: ReactElement = (
  <span className={styles.accordionWarn} aria-label="Fehler in dieser Sektion">
    <Icon name="warning" size={12} />
  </span>
)

function useAutoExpandOnError(errors: ErrorMap, openIds: string[], setOpenIds: (ids: string[]) => void) {
  const [prev, setPrev] = useState<ErrorMap>(errors)
  if (prev.wb !== errors.wb || prev.andacht !== errors.andacht || prev.abzeichen !== errors.abzeichen) {
    setPrev(errors)
    const next = new Set(openIds)
    if (errors.wb) next.add('wb')
    if (errors.andacht) next.add('andacht')
    if (errors.abzeichen) next.add('abzeichen')
    if (next.size !== openIds.length) setOpenIds(Array.from(next))
  }
}

function buildItems(props: WizardStep3ZieleProps) {
  const wb = {
    id: 'wb' as const,
    title: <span className={styles.kontextSectionLabel}>Wachstumsbereich</span>,
    trailing: props.wbError ? warnTrailing : undefined,
    children: <WizardStep3WBSection
      wbModus={props.wbModus} setWbModus={props.setWbModus}
      wbBereiche={props.wbBereiche} setWbBereiche={props.setWbBereiche}
      error={props.wbError} />,
  }
  const andacht = {
    id: 'andacht' as const,
    title: <span className={styles.kontextSectionLabel}>Andachtsreihe</span>,
    trailing: props.andachtError ? warnTrailing : undefined,
    children: <WizardStep3AndachtSection {...props} error={props.andachtError} />,
  }
  const abzeichen = {
    id: 'abzeichen' as const,
    title: <span className={styles.kontextSectionLabel}>Abzeichen</span>,
    trailing: props.abzeichenError ? warnTrailing : undefined,
    children: <WizardStep3AbzeichenSection
      selectedAltersstufe={props.selectedAltersstufe} setSelectedAltersstufe={props.setSelectedAltersstufe}
      selectedAbzeichenId={props.selectedAbzeichenId} setSelectedAbzeichenId={props.setSelectedAbzeichenId}
      error={props.abzeichenError} />,
  }
  return [wb, andacht, abzeichen]
}

export function WizardStep3Ziele(props: WizardStep3ZieleProps) {
  const [openIds, setOpenIds] = useState<string[]>(['wb'])
  useAutoExpandOnError(
    { wb: props.wbError, andacht: props.andachtError, abzeichen: props.abzeichenError },
    openIds, setOpenIds,
  )
  return (
    <div className={styles.section}>
      <AccordionGroup mode="multi" openIds={openIds} onOpenChange={setOpenIds} items={buildItems(props)} />
    </div>
  )
}
