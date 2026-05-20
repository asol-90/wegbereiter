/**
 * WBZielVorschau — live-Vorschau der WB-Zielverteilung in einem Wizard.
 *
 * Anders als WBGoalBars im Kontextleisten-Modus (Ist + Ziel-Band) zeigt
 * die Vorschau ausschließlich die geplante Zielverteilung: pro Bereich
 * ein gefüllter Balken in WB-Farbe auf Höhe des Ziel-Anteils.
 */
import { WB_CSS_VAR, WB_KEYS, WB_LABELS } from '@/domain/wb'
import type { WBSchwerpunkt } from '@/domain/types'
import { wbZielverteilung } from '@/domain/wbZielverteilung'
import styles from './WBZielVorschau.module.css'

export type WBZielVorschauProps = {
  schwerpunkt: WBSchwerpunkt
  className?: string
}

export function WBZielVorschau({ schwerpunkt, className }: WBZielVorschauProps) {
  const targets = wbZielverteilung(schwerpunkt)
  if (!targets) return null
  return (
    <div className={`${styles.grid} ${className ?? ''}`}>
      {WB_KEYS.map((wb) => {
        const ziel = targets[wb].ziel
        const pct = Math.round(ziel * 100)
        return (
          <div key={wb} className={styles.row}>
            <div className={styles.label}>{WB_LABELS[wb]}</div>
            <div className={styles.track}>
              <div
                className={styles.fill}
                style={{
                  width: `${ziel * 100}%`,
                  background: `var(${WB_CSS_VAR[wb]})`,
                }}
              />
            </div>
            <div className={styles.percent}>{pct}%</div>
          </div>
        )
      })}
    </div>
  )
}
