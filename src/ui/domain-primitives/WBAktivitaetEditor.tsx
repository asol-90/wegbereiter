/**
 * WBAktivitaetEditor — shared component for editing WB-Intensitäten.
 *
 * Shows four rows (körperlich / gesellschaftlich / geistig / geistlich),
 * each with four clickable intensity buttons (0 / 0.33 / 0.66 / 1.0).
 * Used in the StammKontext-Editor and (later) in the Repertoire-Ansicht.
 */
import type { WBKey, WBTag } from '@/domain/wb'
import { WB_KEYS, WB_LABELS, WB_CSS_VAR, WB_STEPS } from '@/domain/wb'
import styles from './WBAktivitaetEditor.module.css'

export type WBAktivitaetEditorProps = {
  value: WBTag[]
  onChange: (tags: WBTag[]) => void
  disabled?: boolean
}

export function WBAktivitaetEditor({ value, onChange, disabled }: WBAktivitaetEditorProps) {
  function getIntensity(key: WBKey): number {
    return value.find((t) => t.key === key)?.intensity ?? 0
  }

  function handleClick(key: WBKey, stepValue: number) {
    if (disabled) return
    const current = getIntensity(key)
    const next = stepValue === current ? 0 : stepValue
    const tags = value.filter((t) => t.key !== key)
    if (next > 0) tags.push({ key, intensity: next })
    onChange(tags)
  }

  const hasAny = value.some((t) => t.intensity > 0)

  return (
    <div className={styles.root}>
      {WB_KEYS.map((key) => {
        const intensity = getIntensity(key)
        return (
          <div key={key} className={styles.row}>
            <span className={styles.label}>{WB_LABELS[key]}</span>
            <div className={styles.steps}>
              {WB_STEPS.map((step) => {
                const isZero = step.value === 0
                const isActive = step.value > 0 && step.value <= intensity
                const isSelected = step.value === intensity
                return (
                  <button
                    key={step.value}
                    type="button"
                    title={step.label}
                    disabled={disabled}
                    className={styles.step}
                    data-zero={isZero || undefined}
                    data-active={isActive || undefined}
                    data-selected={(!isZero && isSelected) || undefined}
                    style={{
                      '--wb-color': `var(${WB_CSS_VAR[key]})`,
                    } as React.CSSProperties}
                    onClick={() => handleClick(key, step.value)}
                    aria-label={`${WB_LABELS[key]}: ${step.label}`}
                    aria-pressed={isSelected}
                  >
                    {isZero ? '–' : null}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      {hasAny && !disabled && (
        <button
          type="button"
          className={styles.reset}
          onClick={() => onChange([])}
        >
          Zurücksetzen
        </button>
      )}
    </div>
  )
}
