/**
 * Rhythmus + Dauer line in WizardStep1Team. Shows compact info text with an
 * "edit" toggle that swaps in three Select/Input fields.
 */
import { Input, Select, type SelectOption } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import { WEEKDAYS, type Weekday } from '@/domain/types'
import { RHYTHMUS_LABELS, WEEKDAY_LABELS, type RhythmusKey } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

const WEEKDAY_OPTIONS: SelectOption<Weekday>[] = WEEKDAYS.map((w) => ({ value: w, label: WEEKDAY_LABELS[w] }))
const RHYTHMUS_OPTIONS: SelectOption<RhythmusKey>[] = [
  { value: 'weekly', label: 'wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'monatlich' },
]

export type RhythmusBlockProps = {
  weekday: Weekday
  setWeekday: (w: Weekday) => void
  rhythmusK: RhythmusKey
  setRhythmusK: (r: RhythmusKey) => void
  dauer: number
  setDauer: (d: number) => void
  editing: boolean
  setEditing: (v: boolean) => void
}

export function WizardStep1RhythmusBlock({
  weekday, setWeekday, rhythmusK, setRhythmusK, dauer, setDauer, editing, setEditing,
}: RhythmusBlockProps) {
  if (!editing) {
    return (
      <div className={styles.rhythmusInfo}>
        <div className={styles.rhythmusInfoRow}>
          <span>
            <span className={styles.rhythmusInfoLabel}>Rhythmus</span>
            {WEEKDAY_LABELS[weekday]}, {RHYTHMUS_LABELS[rhythmusK]}
          </span>
          <span className={styles.rhythmusInfoSep}>·</span>
          <span>
            <span className={styles.rhythmusInfoLabel}>Dauer</span>
            {dauer} Min
          </span>
        </div>
        <button type="button" className={styles.editBtn} onClick={() => setEditing(true)} title="Bearbeiten">
          <Icon name="edit" size={13} />
        </button>
      </div>
    )
  }
  return (
    <div className={styles.rhythmusEdit}>
      <div className={styles.rhythmusEditFields}>
        <Select<Weekday> label="Wochentag" options={WEEKDAY_OPTIONS} value={weekday} onValueChange={setWeekday} />
        <Select<RhythmusKey> label="Rhythmus" options={RHYTHMUS_OPTIONS} value={rhythmusK} onValueChange={setRhythmusK} />
        <Input
          label="Dauer (Min)" type="number" min={15} step={5}
          value={dauer}
          onChange={(e) => setDauer(Number.parseInt(e.target.value, 10) || 0)}
        />
      </div>
      <button type="button" className={styles.editBtnDone} onClick={() => setEditing(false)} title="Fertig">
        <Icon name="check" size={14} />
      </button>
    </div>
  )
}
