/**
 * Stepbar nav for NewPlanungWizard. Renders all four logical steps;
 * skipped ones are shown muted.
 */
import { STEP_META, type LogicalStep } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

const ALL_STEPS: readonly LogicalStep[] = ['teamplanung', 'stammkontext', 'ziele', 'vorschau']

function stepClass(seqIdx: number, currentIdx: number): string {
  if (seqIdx === -1) return styles.stepSkipped
  if (seqIdx === currentIdx) return styles.stepActive
  if (seqIdx < currentIdx) return styles.stepDone
  return styles.step
}

export type WizardStepBarProps = {
  stepSequence: readonly LogicalStep[]
  stepIndex: number
}

export function WizardStepBar({ stepSequence, stepIndex }: WizardStepBarProps) {
  return (
    <nav className={styles.stepbar} aria-label="Fortschritt">
      {ALL_STEPS.map((step) => {
        const seqIdx = stepSequence.indexOf(step)
        const label = seqIdx === -1 ? STEP_META[step] : `${seqIdx + 1} · ${STEP_META[step]}`
        return (
          <span key={step} className={stepClass(seqIdx, stepIndex)}>
            {label}
          </span>
        )
      })}
    </nav>
  )
}
