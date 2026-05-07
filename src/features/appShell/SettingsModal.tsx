/**
 * SettingsModal — globale Einstellungen (Concept §3, „Einstellungen").
 *
 * Phase 4f scope: Bundesland-Auswahl, Standard-Wochentag, Standard-Rhythmus
 * und Standard-Zeitbudget. Stamm-Datei-Upload und permanente Repertoire-
 * Bibliothek folgen in späteren Phasen; die Bereiche sind als gesperrte
 * Platzhalter sichtbar, damit Aaron sieht, wo sie landen.
 *
 * Änderungen werden sofort persistiert (`globalConfigStore.patch`). Der
 * Bundesland-Wechsel propagiert über `useFerienForYear` reaktiv in den
 * Jahreskalender.
 */
import { Modal, Select, type SelectOption } from '@/ui/primitives'
import {
  BUNDESLAND_KEYS,
  BUNDESLAND_LABELS,
  WEEKDAYS,
  type BundeslandKey,
  type Rhythmus,
  type Weekday,
} from '@/domain/types'
import { useGlobalConfig } from '@/features/globalConfig'
import { clearFerienCache } from '@/storage/ferienRepo'
import styles from './SettingsModal.module.css'

export type SettingsModalProps = {
  open: boolean
  onClose: () => void
}

type RhythmusKey = 'weekly' | 'biweekly' | 'monthly'

const BUNDESLAND_OPTIONS: SelectOption<BundeslandKey | ''>[] = [
  { value: '', label: '— Bundesland wählen —' },
  ...BUNDESLAND_KEYS.map((k) => ({ value: k, label: BUNDESLAND_LABELS[k] })),
]

const WEEKDAY_OPTIONS: SelectOption<Weekday>[] = WEEKDAYS.map((d) => ({
  value: d,
  label: capitalize(d),
}))

const RHYTHMUS_OPTIONS: SelectOption<RhythmusKey>[] = [
  { value: 'weekly', label: 'wöchentlich' },
  { value: 'biweekly', label: '14-täglich' },
  { value: 'monthly', label: 'monatlich' },
]

const DAUER_OPTIONS: SelectOption<string>[] = [
  { value: '60', label: '60 Minuten' },
  { value: '75', label: '75 Minuten' },
  { value: '90', label: '90 Minuten' },
  { value: '105', label: '105 Minuten' },
  { value: '120', label: '120 Minuten' },
]

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function rhythmusKey(r: Rhythmus): RhythmusKey {
  switch (r.kind) {
    case 'weekly':
      return 'weekly'
    case 'biweekly':
      return 'biweekly'
    case 'monthly':
      return 'monthly'
    case 'custom':
      // Fall back to weekly label — custom rhythms are not yet editable here.
      return 'weekly'
  }
}

function rhythmusFromKey(k: RhythmusKey): Rhythmus {
  switch (k) {
    case 'weekly':
      return { kind: 'weekly' }
    case 'biweekly':
      return { kind: 'biweekly' }
    case 'monthly':
      return { kind: 'monthly' }
  }
}

export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const { config, loaded, patch } = useGlobalConfig()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Einstellungen"
      description="Globale Vorgaben für neue Planungen."
      size="md"
    >
      <div className={styles.grid} aria-disabled={!loaded}>
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Kontext</h3>
          <Select<BundeslandKey | ''>
            label="Bundesland"
            hint="Bestimmt, welche Ferien und Feiertage im Jahreskalender angezeigt werden."
            options={BUNDESLAND_OPTIONS}
            value={config.bundesland ?? ''}
            onValueChange={(v) => {
              void clearFerienCache().then(() =>
                patch({ bundesland: v === '' ? null : v }),
              )
            }}
          />
        </section>

        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Standardwerte für neue Planungen</h3>
          <div className={styles.row}>
            <Select<Weekday>
              label="Wochentag"
              options={WEEKDAY_OPTIONS}
              value={config.defaultWeekday}
              onValueChange={(v) => {
                void patch({ defaultWeekday: v })
              }}
            />
            <Select<RhythmusKey>
              label="Rhythmus"
              options={RHYTHMUS_OPTIONS}
              value={rhythmusKey(config.defaultRhythmus)}
              onValueChange={(v) => {
                void patch({ defaultRhythmus: rhythmusFromKey(v) })
              }}
            />
            <Select<string>
              label="Dauer"
              options={DAUER_OPTIONS}
              value={String(config.defaultDauerMinuten)}
              onValueChange={(v) => {
                const n = Number.parseInt(v, 10)
                if (!Number.isNaN(n)) {
                  void patch({ defaultDauerMinuten: n })
                }
              }}
            />
          </div>
        </section>

        <section className={styles.sectionMuted}>
          <h3 className={styles.sectionTitle}>Stamm-Datei &amp; Repertoire</h3>
          <p className={styles.mutedNote}>
            Upload und permanente Bibliothek folgen in einer späteren Phase.
          </p>
        </section>
      </div>
    </Modal>
  )
}
