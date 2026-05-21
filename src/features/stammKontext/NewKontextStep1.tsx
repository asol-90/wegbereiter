/**
 * Schritt 1 des NewKontextWizard — Zeitraum, Wochentag, Rhythmus und
 * die daraus generierte Termin-Liste mit Ferien-Annotation.
 */
import type { IsoDate, Weekday } from '@/domain/types'
import { Select } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import {
  formatDate, RHYTHMUS_OPTIONS, WEEKDAY_OPTIONS,
  type RhythmusKey, type TerminEntry,
} from './newKontextHelpers'
import styles from './NewKontextWizard.module.css'

export function NewKontextStep1({
  start, setStart, ende, setEnde,
  weekday, setWeekday, rhythmusK, setRhythmusK,
  termine, activeCount, toggleTermin,
}: {
  start: IsoDate
  setStart: (s: IsoDate) => void
  ende: IsoDate
  setEnde: (e: IsoDate) => void
  weekday: Weekday
  setWeekday: (w: Weekday) => void
  rhythmusK: RhythmusKey
  setRhythmusK: (r: RhythmusKey) => void
  termine: TerminEntry[]
  activeCount: number
  toggleTermin: (datum: IsoDate) => void
}) {
  return (
    <div className={styles.stepContent}>
      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Von</label>
          <input
            type="date"
            className={styles.dateInput}
            value={start}
            onChange={(e) => setStart(e.target.value as IsoDate)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Bis</label>
          <input
            type="date"
            className={styles.dateInput}
            value={ende}
            onChange={(e) => setEnde(e.target.value as IsoDate)}
          />
        </div>
      </div>

      <div className={styles.row}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Wochentag</label>
          <Select
            value={weekday}
            options={WEEKDAY_OPTIONS}
            onValueChange={(v) => setWeekday(v as Weekday)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Rhythmus</label>
          <Select
            value={rhythmusK}
            options={RHYTHMUS_OPTIONS}
            onValueChange={(v) => setRhythmusK(v as RhythmusKey)}
          />
        </div>
      </div>

      <div className={styles.terminHeader}>
        <span className={styles.terminLabel}>Treffen</span>
        <span className={styles.terminCount}>{activeCount} aktiv</span>
      </div>

      <div className={styles.terminList}>
        {termine.length === 0 && (
          <p className={styles.emptyHint}>Zeitraum wählen um Termine zu generieren</p>
        )}
        {termine.map((t) => (
          <div
            key={t.datum}
            className={t.aktiv ? styles.terminRow : styles.terminRowDisabled}
          >
            <button
              type="button"
              className={t.aktiv ? styles.toggleOn : styles.toggleOff}
              onClick={() => toggleTermin(t.datum)}
              aria-label={t.aktiv ? 'Deaktivieren' : 'Aktivieren'}
            >
              {t.aktiv
                ? <Icon name="check" size={11} />
                : <Icon name="x" size={11} />
              }
            </button>
            <span className={styles.terminDate}>{formatDate(t.datum)}</span>
            {t.ferienLabel && (
              <span className={styles.ferienBadge}>{t.ferienLabel}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
