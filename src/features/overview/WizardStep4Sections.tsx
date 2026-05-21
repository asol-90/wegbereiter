/**
 * Sub-sections of WizardStep4Vorschau — one per visual block.
 *
 * Keeps each section's render logic isolated so the parent step stays a
 * simple compositor under the eslint complexity threshold.
 */
import type { Andachtsreihe, IsoDate, StammAktion, StammKontext, Weekday, WbSchwerpunktModus } from '@/domain/types'
import type { AbzeichenId, AndachtsEinheitId, AndachtsreiheId } from '@/domain/ids'
import { WB_CSS_VAR, WB_LABELS, type WBKey } from '@/domain/wb'
import { ABZEICHEN_KATALOG, ALTERSSTUFE_LABELS } from '@/domain/abzeichenKatalog'
import {
  formatDateShort, WEEKDAY_LABELS, RHYTHMUS_LABELS,
  type AktionBereich, type AndachtMode, type RhythmusKey,
} from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

const WB_MODUS_LABEL: Record<Exclude<WbSchwerpunktModus, 'ausgewogen'>, string> = {
  tendenz: 'Tendenz',
  fokus: 'Fokus',
  'haupt-neben': 'Haupt+Neben',
  dominant: 'Dominant',
}

export type SummaryMetaProps = {
  activeMeetingCount: number
  dauer: number
  start: IsoDate
  ende: IsoDate
  weekday: Weekday
  rhythmusK: RhythmusKey
}

export function SummaryMetaWidget({ activeMeetingCount, dauer, start, ende, weekday, rhythmusK }: SummaryMetaProps) {
  return (
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
  )
}

export type SummaryKontextProps = {
  activeKontext: StammKontext
  alleAktionenInRange: Array<StammAktion & { bereich: AktionBereich }>
}

export function SummaryKontext({ activeKontext, alleAktionenInRange }: SummaryKontextProps) {
  return (
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
  )
}

export function SummaryWBRow({ wbModus, wbBereiche }: { wbModus: WbSchwerpunktModus; wbBereiche: WBKey[] }) {
  return (
    <div className={styles.summaryZielRow}>
      <span className={styles.summaryZielLabel}>Wachstumsbereich</span>
      {wbModus === 'ausgewogen' ? (
        <span className={styles.summaryZielValue}>Ausgewogen</span>
      ) : (
        <span className={styles.summaryZielValue}>
          {WB_MODUS_LABEL[wbModus]}
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
  )
}

export type SummaryAndachtRowProps = {
  andachtMode: AndachtMode
  andachtTitel: string
  andachtEinheiten: { id: AndachtsEinheitId; titel: string }[]
  andachtReiheId: AndachtsreiheId | null
  andachtAusgewaehlt: Set<AndachtsEinheitId>
  availableReihen: readonly Andachtsreihe[]
  selectedSammlung: Andachtsreihe | null
}

export function SummaryAndachtRow(props: SummaryAndachtRowProps) {
  return (
    <div className={styles.summaryZielRow}>
      <span className={styles.summaryZielLabel}>Andachtsreihe</span>
      <AndachtValue {...props} />
    </div>
  )
}

function AndachtValue({
  andachtMode,
  andachtTitel,
  andachtEinheiten,
  andachtReiheId,
  andachtAusgewaehlt,
  availableReihen,
  selectedSammlung,
}: SummaryAndachtRowProps) {
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
    if (!r) return <span className={styles.summaryZielMeta}>—</span>
    return (
      <span className={styles.summaryZielValue}>
        {r.name}
        <span className={styles.summaryZielMeta}>
          {' '}({r.einheiten.length} Einheit{r.einheiten.length !== 1 ? 'en' : ''})
        </span>
      </span>
    )
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
}

export function SummaryAbzeichenRow({ selectedAbzeichenId }: { selectedAbzeichenId: AbzeichenId | null }) {
  if (!selectedAbzeichenId) {
    return (
      <div className={styles.summaryZielRow}>
        <span className={styles.summaryZielLabel}>Abzeichen</span>
        <span className={styles.summaryZielMeta}>Nicht festgelegt</span>
      </div>
    )
  }
  const abz = ABZEICHEN_KATALOG.find((a) => a.id === selectedAbzeichenId)
  return (
    <div className={styles.summaryZielRow}>
      <span className={styles.summaryZielLabel}>Abzeichen</span>
      <span className={styles.summaryZielValue}>
        {abz?.name ?? '—'}
        {abz?.altersstufe && (
          <span className={styles.summaryZielMeta}>
            {' '}({ALTERSSTUFE_LABELS[abz.altersstufe]})
          </span>
        )}
      </span>
    </div>
  )
}
