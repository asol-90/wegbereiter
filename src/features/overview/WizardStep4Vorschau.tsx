import { Input } from '@/ui/primitives'
import type { Andachtsreihe, IsoDate, StammAktion, StammKontext, Weekday, WbSchwerpunktModus } from '@/domain/types'
import type { AbzeichenId, AndachtsEinheitId, AndachtsreiheId } from '@/domain/ids'
import { WB_CSS_VAR, WB_LABELS, type WBKey } from '@/domain/wb'
import { ABZEICHEN_KATALOG, ALTERSSTUFE_LABELS } from '@/domain/abzeichenKatalog'
import { formatDateShort, WEEKDAY_LABELS, RHYTHMUS_LABELS, type AktionBereich, type AndachtMode, type RhythmusKey } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

// ─── Props ────────────────────────────────────────────────────────────────────

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
  availableReihen: Andachtsreihe[]
  selectedSammlung: Andachtsreihe | null
  selectedAbzeichenId: AbzeichenId | null
  error: string | null
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardStep4Vorschau({
  nameOverride,
  setNameOverride,
  autoName,
  dauer,
  start,
  ende,
  weekday,
  rhythmusK,
  activeMeetingCount,
  hasKontext,
  activeKontext,
  alleAktionenInRange,
  wbModus,
  wbBereiche,
  andachtMode,
  andachtTitel,
  andachtEinheiten,
  andachtReiheId,
  andachtAusgewaehlt,
  availableReihen,
  selectedSammlung,
  selectedAbzeichenId,
  error,
}: WizardStep4VorschauProps) {
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
      {hasKontext && activeKontext && (
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

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
