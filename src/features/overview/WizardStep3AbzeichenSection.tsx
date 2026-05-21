/**
 * Abzeichen section in WizardStep3Ziele. Two tabs for the two Altersstufen
 * plus an "Ohne" option, then a list of Abzeichen for the active stufe.
 */
import type { Altersstufe } from '@/domain/types'
import type { AbzeichenId } from '@/domain/ids'
import { ALTERSSTUFE_LABELS, abzeichenFuerStufe } from '@/domain/abzeichenKatalog'
import styles from './NewPlanungWizard.module.css'

export type WizardStep3AbzeichenSectionProps = {
  selectedAltersstufe: Altersstufe | null
  setSelectedAltersstufe: (s: Altersstufe | null) => void
  selectedAbzeichenId: AbzeichenId | null
  setSelectedAbzeichenId: (id: AbzeichenId | null) => void
  error: string | null
}

const STUFEN: Altersstufe[] = ['kundschafter', 'pfadfinder']

export function WizardStep3AbzeichenSection({
  selectedAltersstufe, setSelectedAltersstufe,
  selectedAbzeichenId, setSelectedAbzeichenId, error,
}: WizardStep3AbzeichenSectionProps) {
  function pickStufe(s: Altersstufe | null) {
    setSelectedAltersstufe(s)
    setSelectedAbzeichenId(null)
  }
  return (
    <div className={`${styles.zieleSectionBody} ${error ? styles.zieleSectionBodyError : ''}`}>
      {error && <p className={styles.zieleSectionError}>{error}</p>}
      <div className={styles.wbTabRow}>
        <button type="button"
          className={`${styles.wbTab} ${!selectedAltersstufe ? styles.wbTabActive : ''}`}
          onClick={() => pickStufe(null)}>Ohne</button>
        {STUFEN.map((stufe) => (
          <button key={stufe} type="button"
            className={`${styles.wbTab} ${selectedAltersstufe === stufe ? styles.wbTabActive : ''}`}
            onClick={() => pickStufe(stufe)}>
            {ALTERSSTUFE_LABELS[stufe]}
          </button>
        ))}
      </div>
      {selectedAltersstufe && (
        <div className={styles.andachtRepertoireList}>
          {abzeichenFuerStufe(selectedAltersstufe).map((abz) => (
            <button key={abz.id} type="button"
              className={`${styles.andachtRepertoireItem} ${selectedAbzeichenId === abz.id ? styles.andachtRepertoireItemSelected : ''}`}
              onClick={() => setSelectedAbzeichenId(abz.id)}>
              <div className={styles.andachtRepertoireName}>{abz.name}</div>
              <div className={styles.andachtRepertoireMeta}>
                {abz.anforderungen.length} Anforderung{abz.anforderungen.length !== 1 ? 'en' : ''}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
