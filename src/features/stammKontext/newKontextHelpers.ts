/**
 * Hilfsfunktionen + Konstanten für den NewKontextWizard.
 * Liegen separat, damit der Wizard nur Komponenten exportiert
 * (Fast-Refresh) und unter den Längenschwellen bleibt.
 */
import { AKTIVITAET_TYPEN, type AktivitaetTyp } from '@/domain/aktivitaetKatalog'
import { parseIso } from '@/domain/dateUtils'
import { WEEKDAYS, type IsoDate, type Weekday } from '@/domain/types'
import type { SelectOption } from '@/ui/primitives'

export type RhythmusKey = 'weekly' | 'biweekly' | 'monthly'

export type TerminEntry = {
  datum: IsoDate
  aktiv: boolean
  /** Non-null label when it falls in Ferien or on a Feiertag. */
  ferienLabel: string | null
}

export type AktivitaetDraft = {
  _key: string
  name: string
  typ: AktivitaetTyp
}

const WEEKDAY_LABELS: Record<Weekday, string> = {
  montag: 'Montag', dienstag: 'Dienstag', mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag', freitag: 'Freitag', samstag: 'Samstag', sonntag: 'Sonntag',
}

export const WEEKDAY_OPTIONS: SelectOption<Weekday>[] = WEEKDAYS.map((w) => ({
  value: w, label: WEEKDAY_LABELS[w],
}))

export const RHYTHMUS_OPTIONS: SelectOption<RhythmusKey>[] = [
  { value: 'weekly', label: 'wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'monatlich' },
]

export const AKTIVITAET_TYP_OPTIONS: SelectOption<AktivitaetTyp>[] = AKTIVITAET_TYPEN.map((t) => ({
  value: t, label: t,
}))

export function rhythmusToRhythmus(k: RhythmusKey) {
  switch (k) {
    case 'weekly': return { kind: 'weekly' as const }
    case 'biweekly': return { kind: 'biweekly' as const }
    case 'monthly': return { kind: 'monthly' as const }
  }
}

export function isoFromDate(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}` as IsoDate
}

export function defaultStart(weekday: Weekday): IsoDate {
  const today = new Date()
  const targetDow = ({ sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6 })[weekday]
  const diff = (targetDow - today.getDay() + 7) % 7
  return isoFromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff))
}

export function defaultEnde(start: IsoDate): IsoDate {
  const d = parseIso(start)
  d.setMonth(d.getMonth() + 8)
  return isoFromDate(d)
}

export function formatDate(iso: IsoDate): string {
  const d = parseIso(iso)
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]!
  return `${wd} ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`
}
