/**
 * Wachstumsbereich section in WizardStep3Ziele. Lets the user pick a
 * schwerpunkt modus and (depending on modus) zero to two WB-Bereiche.
 */
import { WBToggleItem, WBZielVorschau } from '@/ui/domain'
import type { WbSchwerpunktModus } from '@/domain/types'
import { WB_KEYS, type WBKey } from '@/domain/wb'
import styles from './NewPlanungWizard.module.css'

const MODI: { key: WbSchwerpunktModus; label: string; desc: string; maxSelect: number }[] = [
  { key: 'ausgewogen', label: 'Ausgewogen', desc: 'Alle Wachstumsbereiche werden gleichgewichtig behandelt.', maxSelect: 0 },
  { key: 'tendenz', label: 'Tendenz', desc: 'Wähle ein bis zwei Bereiche, die tendenziell im Fokus stehen.', maxSelect: 2 },
  { key: 'fokus', label: 'Fokus', desc: 'Wähle einen Bereich, der klar im Fokus steht.', maxSelect: 1 },
  { key: 'haupt-neben', label: 'Haupt+Neben', desc: 'Wähle einen Haupt- und einen Nebenbereich.', maxSelect: 2 },
  { key: 'dominant', label: 'Dominant', desc: 'Wähle einen Bereich, der dominant im Vordergrund steht.', maxSelect: 1 },
]

function badgeFor(modus: WbSchwerpunktModus, idx: number): string | undefined {
  if (modus !== 'haupt-neben') return undefined
  return idx === 0 ? 'H' : idx === 1 ? 'N' : undefined
}

export type WizardStep3WBSectionProps = {
  wbModus: WbSchwerpunktModus
  setWbModus: (m: WbSchwerpunktModus) => void
  wbBereiche: WBKey[]
  setWbBereiche: (b: WBKey[]) => void
  error: string | null
}

export function WizardStep3WBSection({
  wbModus, setWbModus, wbBereiche, setWbBereiche, error,
}: WizardStep3WBSectionProps) {
  const current = MODI.find((m) => m.key === wbModus)!

  function toggle(key: WBKey) {
    const idx = wbBereiche.indexOf(key)
    if (idx >= 0) {
      setWbBereiche(wbBereiche.filter((k) => k !== key))
    } else if (wbBereiche.length < current.maxSelect) {
      setWbBereiche([...wbBereiche, key])
    }
  }

  function pickModus(m: WbSchwerpunktModus) {
    setWbModus(m)
    if (m === 'ausgewogen') setWbBereiche([])
  }

  const isAusgewogen = wbModus === 'ausgewogen'
  const showVorschau = isAusgewogen || wbBereiche.length > 0

  return (
    <div className={`${styles.zieleSectionBody} ${error ? styles.zieleSectionBodyError : ''}`}>
      {error && <p className={styles.zieleSectionError}>{error}</p>}
      <div className={styles.wbTabRow}>
        {MODI.map((m) => (
          <button key={m.key} type="button"
            className={`${styles.wbTab} ${wbModus === m.key ? styles.wbTabActive : ''}`}
            onClick={() => pickModus(m.key)}>
            {m.label}
          </button>
        ))}
      </div>
      <p className={styles.wbModeDesc}>{current.desc}</p>
      <div className={styles.wbToggleLayout}>
        <div className={styles.wbToggleGrid}>
          {WB_KEYS.map((key) => {
            const idx = wbBereiche.indexOf(key)
            const selected = isAusgewogen || idx >= 0
            return (
              <WBToggleItem key={key} wb={key} selected={selected}
                disabled={isAusgewogen} badge={badgeFor(wbModus, idx)}
                onClick={() => toggle(key)} />
            )
          })}
        </div>
        <div className={styles.wbToggleVorschau}>
          <div className={styles.wbToggleVorschauLabel}>Zielverteilung</div>
          {showVorschau
            ? <WBZielVorschau schwerpunkt={{ modus: wbModus, bereiche: wbBereiche }} />
            : <p className={styles.wbToggleVorschauHint}>Bereich auswählen, um die Zielverteilung zu sehen.</p>}
        </div>
      </div>
    </div>
  )
}
