import { Input } from '@/ui/primitives'
import type { Andachtsreihe, IsoDate, StammAktion, StammKontext, Weekday, WbSchwerpunktModus } from '@/domain/types'
import type { AbzeichenId, AndachtsEinheitId, AndachtsreiheId } from '@/domain/ids'
import { type WBKey } from '@/domain/wb'
import { type AktionBereich, type AndachtMode, type RhythmusKey } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'
import {
  SummaryAbzeichenRow,
  SummaryAndachtRow,
  SummaryKontext,
  SummaryMetaWidget,
  SummaryWBRow,
} from './WizardStep4Sections'

export type WizardStep4VorschauProps = {
  nameOverride: string
  setNameOverride: (n: string) => void
  autoName: string
  dauer: number
  start: IsoDate
  ende: IsoDate
  weekday: Weekday
  rhythmusK: RhythmusKey
  activeMeetingCount: number
  hasKontext: boolean
  activeKontext: StammKontext | undefined
  alleAktionenInRange: Array<StammAktion & { bereich: AktionBereich }>
  wbModus: WbSchwerpunktModus
  wbBereiche: WBKey[]
  andachtMode: AndachtMode
  andachtTitel: string
  andachtEinheiten: { id: AndachtsEinheitId; titel: string }[]
  andachtReiheId: AndachtsreiheId | null
  andachtAusgewaehlt: Set<AndachtsEinheitId>
  availableReihen: readonly Andachtsreihe[]
  selectedSammlung: Andachtsreihe | null
  selectedAbzeichenId: AbzeichenId | null
  error: string | null
}

export function WizardStep4Vorschau(props: WizardStep4VorschauProps) {
  const {
    nameOverride, setNameOverride, autoName,
    dauer, start, ende, weekday, rhythmusK, activeMeetingCount,
    hasKontext, activeKontext, alleAktionenInRange,
    wbModus, wbBereiche,
    andachtMode, andachtTitel, andachtEinheiten, andachtReiheId,
    andachtAusgewaehlt, availableReihen, selectedSammlung,
    selectedAbzeichenId,
    error,
  } = props
  return (
    <div className={styles.section}>
      <Input
        label="Eigener Name (optional)"
        placeholder={autoName || 'z.B. Frühling 2026'}
        value={nameOverride}
        onChange={(e) => setNameOverride(e.target.value)}
        hint={autoName && !nameOverride ? `Sonst: „${autoName}"` : undefined}
        className={styles.summaryNameInput}
      />
      <SummaryMetaWidget
        activeMeetingCount={activeMeetingCount}
        dauer={dauer}
        start={start}
        ende={ende}
        weekday={weekday}
        rhythmusK={rhythmusK}
      />
      {hasKontext && activeKontext && (
        <SummaryKontext activeKontext={activeKontext} alleAktionenInRange={alleAktionenInRange} />
      )}
      <div className={styles.summaryZiele}>
        <span className={styles.summarySectionLabel}>Ziele</span>
        <SummaryWBRow wbModus={wbModus} wbBereiche={wbBereiche} />
        <SummaryAndachtRow
          andachtMode={andachtMode}
          andachtTitel={andachtTitel}
          andachtEinheiten={andachtEinheiten}
          andachtReiheId={andachtReiheId}
          andachtAusgewaehlt={andachtAusgewaehlt}
          availableReihen={availableReihen}
          selectedSammlung={selectedSammlung}
        />
        <SummaryAbzeichenRow selectedAbzeichenId={selectedAbzeichenId} />
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
