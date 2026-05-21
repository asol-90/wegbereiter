/**
 * Von / Bis date pickers + the "Bis-Vorschläge" preset dropdown.
 */
import { type Dispatch, type RefObject, type SetStateAction } from 'react'
import { Star } from '@phosphor-icons/react'
import { Input } from '@/ui/primitives'
import type { IsoDate } from '@/domain/types'
import { formatDateShort, type BisPreset } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

export type DateRangeProps = {
  start: IsoDate
  setStart: (s: IsoDate) => void
  ende: IsoDate
  setEnde: (e: IsoDate) => void
  setEndeWasAutoSet: (v: boolean) => void
  startReason: string | null
  endeReason: string | null
  bisPresets: BisPreset[]
  bisPresetOpen: boolean
  setBisPresetOpen: Dispatch<SetStateAction<boolean>>
  bisPresetRef: RefObject<HTMLDivElement | null>
}

export function WizardStep1DateRange({
  start, setStart, ende, setEnde, setEndeWasAutoSet,
  startReason, endeReason, bisPresets, bisPresetOpen, setBisPresetOpen, bisPresetRef,
}: DateRangeProps) {
  function pickPreset(iso: IsoDate) {
    setEnde(iso)
    setEndeWasAutoSet(false)
    setBisPresetOpen(false)
  }
  return (
    <div className={styles.dateRow}>
      <div className={styles.dateField}>
        <Input
          label="Von" type="date" value={start} required noFoot
          onChange={(e) => { setStart(e.target.value as IsoDate); setEndeWasAutoSet(false) }}
        />
        {startReason && <p className={styles.dateReason}>{startReason}</p>}
      </div>
      <div className={styles.dateField}>
        <div className={styles.bisField} ref={bisPresetRef}>
          <Input
            label="Bis" type="date" value={ende} required noFoot
            onChange={(e) => { setEnde(e.target.value as IsoDate); setEndeWasAutoSet(false) }}
          />
          {bisPresets.length > 0 && (
            <button type="button" className={styles.presetBtn}
              onClick={() => setBisPresetOpen((o) => !o)}
              title="Bis-Vorschläge" aria-label="Bis-Vorschläge">
              <Star size={18} weight="duotone" />
            </button>
          )}
          {bisPresetOpen && bisPresets.length > 0 && (
            <div className={styles.presetDropdown}>
              {bisPresets.map((p) => (
                <button key={p.iso} type="button" className={styles.presetOption}
                  onClick={() => pickPreset(p.iso)}>
                  <span>{p.label}</span>
                  <span className={styles.presetDate}>{formatDateShort(p.iso)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {endeReason && <p className={styles.dateReason}>{endeReason}</p>}
      </div>
    </div>
  )
}
