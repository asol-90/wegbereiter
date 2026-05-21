/**
 * Footer-Leiste des NewKontextWizard mit Schritt-Indikator und den
 * Navigations-Buttons je nach aktuellem Schritt.
 */
import { Button } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import styles from './NewKontextWizard.module.css'

const STEP_LABELS = ['1 · Termine', '2 · Thema']

export function NewKontextFooter({
  step, saving, canProceed1, canFinish,
  onCancel, onNext, onBack, onCreate,
}: {
  step: 0 | 1
  saving: boolean
  canProceed1: boolean | ''
  canFinish: boolean
  onCancel: () => void
  onNext: () => void
  onBack: () => void
  onCreate: () => void
}) {
  return (
    <div className={styles.footer}>
      <div className={styles.footerSteps}>
        {STEP_LABELS.map((label, i) => (
          <span
            key={label}
            className={i === step ? styles.stepActive : styles.stepInactive}
          >
            {label}
          </span>
        ))}
      </div>
      <div className={styles.footerActions}>
        {step === 0 ? (
          <>
            <Button variant="ghost" onClick={onCancel}>Abbrechen</Button>
            <Button variant="primary" onClick={onNext} disabled={!canProceed1}>
              Weiter
              <Icon name="chevron-right" size={13} />
            </Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onBack}>
              <Icon name="chevron-left" size={13} />
              Zurück
            </Button>
            <Button variant="primary" onClick={onCreate} disabled={!canFinish || saving} loading={saving}>
              Anlegen
            </Button>
          </>
        )}
      </div>
    </div>
  )
}
