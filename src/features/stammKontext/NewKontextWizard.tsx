/**
 * NewKontextWizard — 2-step modal for creating a new StammKontext.
 *
 * Step 1 "Termine": Zeitraum + Rhythmus, generates date list with
 *   ferien-aware defaults (holiday dates start deactivated).
 * Step 2 "Thema": Name, Beschreibung, optionale Aktivitäten.
 *
 * On completion: creates StammKontext + Aktivitäten, navigates to editor.
 */
import {AKTIVITAET_TYPEN, type AktivitaetTyp} from '@/domain/aktivitaetKatalog'
import {generateTermine, parseIso} from '@/domain/dateUtils'
import {newId, type AktivitaetId, type StammImportId, type StammTreffenId} from '@/domain/ids'
import {WEEKDAYS, type Aktivitaet, type IsoDate, type StammKontext, type StammTreffen, type Weekday} from '@/domain/types'
import {useGlobalConfig} from '@/features/globalConfig'
import {classifyDay} from '@/features/overview/monthGrid'
import {useFerienForYear} from '@/features/overview/useFerienForYear'
import {repertoireStore} from '@/features/repertoire/repertoireStore'
import {Button, Input, Modal, Select, type SelectOption} from '@/ui/primitives'
import {Icon} from '@/ui/primitives/Icon'
import {useCallback, useEffect, useMemo, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import styles from './NewKontextWizard.module.css'
import {useStammKontextActions} from './useStammKontext'

// ─── Types ───────────────────────────────────────────────────────────────────

type RhythmusKey = 'weekly' | 'biweekly' | 'monthly'

type TerminEntry = {
  datum: IsoDate
  aktiv: boolean
  /** Non-null label when it falls in Ferien or on a Feiertag. */
  ferienLabel: string | null
}

type AktivitaetDraft = {
  _key: string
  name: string
  typ: AktivitaetTyp
}

export type NewKontextWizardProps = {
  open: boolean
  onClose: () => void
  /** Pre-filled time range from drag gesture on KontextSidebar. */
  initialZeitraum?: { start: IsoDate; ende: IsoDate }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAY_LABELS: Record<Weekday, string> = {
  montag: 'Montag', dienstag: 'Dienstag', mittwoch: 'Mittwoch',
  donnerstag: 'Donnerstag', freitag: 'Freitag', samstag: 'Samstag', sonntag: 'Sonntag',
}

const WEEKDAY_OPTIONS: SelectOption<Weekday>[] = WEEKDAYS.map((w) => ({
  value: w, label: WEEKDAY_LABELS[w],
}))

const RHYTHMUS_OPTIONS: SelectOption<RhythmusKey>[] = [
  { value: 'weekly', label: 'wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'monatlich' },
]

const AKTIVITAET_TYP_OPTIONS: SelectOption<AktivitaetTyp>[] = AKTIVITAET_TYPEN.map((t) => ({
  value: t, label: t,
}))

// ─── Helpers ─────────────────────────────────────────────────────────────────

function rhythmusToRhythmus(k: RhythmusKey) {
  switch (k) {
    case 'weekly': return { kind: 'weekly' as const }
    case 'biweekly': return { kind: 'biweekly' as const }
    case 'monthly': return { kind: 'monthly' as const }
  }
}

function isoFromDate(d: Date): IsoDate {
  const y = d.getFullYear()
  const m = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  return `${y}-${m}-${day}` as IsoDate
}

function defaultStart(weekday: Weekday): IsoDate {
  const today = new Date()
  const targetDow = ({ sonntag: 0, montag: 1, dienstag: 2, mittwoch: 3, donnerstag: 4, freitag: 5, samstag: 6 })[weekday]
  const diff = (targetDow - today.getDay() + 7) % 7
  return isoFromDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + diff))
}

function defaultEnde(start: IsoDate): IsoDate {
  const d = parseIso(start)
  d.setMonth(d.getMonth() + 8)
  return isoFromDate(d)
}

function formatDate(iso: IsoDate): string {
  const d = parseIso(iso)
  const wd = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'][d.getDay()]!
  return `${wd} ${d.getDate().toString().padStart(2, '0')}.${(d.getMonth() + 1).toString().padStart(2, '0')}.`
}

// ─── Component ───────────────────────────────────────────────────────────────

export function NewKontextWizard({ open, onClose, initialZeitraum }: NewKontextWizardProps) {
  const { config, loaded } = useGlobalConfig()
  const { create, update } = useStammKontextActions()
  const navigate = useNavigate()

  const [step, setStep] = useState<0 | 1>(0)
  const [saving, setSaving] = useState(false)

  // ── Step 1: Termine ──
  const [start, setStart] = useState<IsoDate>('' as IsoDate)
  const [ende, setEnde] = useState<IsoDate>('' as IsoDate)
  const [weekday, setWeekday] = useState<Weekday>('freitag')
  const [rhythmusK, setRhythmusK] = useState<RhythmusKey>('biweekly')
  const [termine, setTermine] = useState<TerminEntry[]>([])

  // ── Step 2: Thema & Aktivitäten ──
  const [thema, setThema] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [aktivitaeten, setAktivitaeten] = useState<AktivitaetDraft[]>([])

  // ── Ferien ──
  const yearStart = start ? Number.parseInt(start.slice(0, 4), 10) : new Date().getFullYear()
  const yearEnde = ende ? Number.parseInt(ende.slice(0, 4), 10) : yearStart
  const ferienYear1 = useFerienForYear(yearStart)
  const ferienYear2 = useFerienForYear(yearEnde !== yearStart ? yearEnde : yearStart)

  // ── Init on open ──
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return
    setStep(0)
    setSaving(false)
    setThema('')
    setBeschreibung('')
    setAktivitaeten([])
    const wd = loaded ? config.defaultWeekday : 'freitag'
    setWeekday(wd)
    setRhythmusK('biweekly')
    if (initialZeitraum) {
      setStart(initialZeitraum.start)
      setEnde(initialZeitraum.ende)
    } else {
      const s = defaultStart(wd)
      setStart(s)
      setEnde(defaultEnde(s))
    }
  }, [open, loaded, config.defaultWeekday, initialZeitraum])
  /* eslint-enable react-hooks/set-state-in-effect */

  // ── Regenerate termine when inputs change ──
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!start || !ende || start >= ende) {
      setTermine([])
      return
    }
    const dates = generateTermine(start, ende, weekday, rhythmusToRhythmus(rhythmusK))
    const entries: TerminEntry[] = dates.map((datum) => {
      const year = Number.parseInt(datum.slice(0, 4), 10)
      const ferienEntry = year === yearStart ? ferienYear1 : ferienYear2
      const cls = classifyDay(datum, ferienEntry)
      const ferienLabel = cls.ferien?.name ?? cls.feiertag?.name ?? null
      return { datum, aktiv: ferienLabel === null, ferienLabel }
    })
    setTermine(entries)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, ende, weekday, rhythmusK, ferienYear1, ferienYear2])
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeCount = useMemo(() => termine.filter((t) => t.aktiv).length, [termine])

  const toggleTermin = useCallback((datum: IsoDate) => {
    setTermine((prev) =>
      prev.map((t) => t.datum === datum ? { ...t, aktiv: !t.aktiv } : t),
    )
  }, [])

  const addAktivitaet = useCallback(() => {
    const key = `${Date.now()}-${Math.random()}`
    setAktivitaeten((prev) => [...prev, { _key: key, name: '', typ: 'spiel' as AktivitaetTyp }])
  }, [])

  const updateAktivitaet = useCallback((key: string, patch: Partial<AktivitaetDraft>) => {
    setAktivitaeten((prev) => prev.map((a) => a._key === key ? { ...a, ...patch } : a))
  }, [])

  const removeAktivitaet = useCallback((key: string) => {
    setAktivitaeten((prev) => prev.filter((a) => a._key !== key))
  }, [])

  const canProceed1 = start && ende && start < ende
  const canFinish = thema.trim().length > 0

  async function handleCreate() {
    if (!canFinish) return
    setSaving(true)
    try {
      const now = new Date().toISOString()
      const stammImportId = newId<StammImportId>()
      const savedAktivitaetIds: AktivitaetId[] = []
      for (const a of aktivitaeten) {
        if (!a.name.trim()) continue
        const aktivitaet: Aktivitaet = {
          id: newId<AktivitaetId>(),
          name: a.name.trim(),
          typ: a.typ,
          wbTags: [],
          themenTags: [],
          zeitMin: 15,
          zeitMax: 30,
          quelle: 'stamm-import',
          stammImportId,
        }
        await repertoireStore.saveAktivitaet(aktivitaet)
        savedAktivitaetIds.push(aktivitaet.id)
      }

      const treffenList: StammTreffen[] = termine
        .filter((t) => t.aktiv)
        .map((t) => ({
          id: newId<StammTreffenId>(),
          datum: t.datum,
          dauerMin: 90,
        }))

      // create() creates a blank kontext, then we update it immediately
      const kontext = await create()
      const updated: StammKontext = {
        ...kontext,
        stammImportId,
        thema: thema.trim(),
        themaBeschreibung: beschreibung.trim() || undefined,
        treffen: treffenList,
        importierteAktivitaetIds: savedAktivitaetIds,
        bearbeitetAm: now,
      }
      await update(updated)
      onClose()
      navigate(`/stammkontext/${kontext.id}`)
    } finally {
      setSaving(false)
    }
  }

  const stepLabels = ['1 · Termine', '2 · Thema']

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neuen Kontext anlegen"
      size="md"
      footer={
        <div className={styles.footer}>
          <div className={styles.footerSteps}>
            {stepLabels.map((label, i) => (
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
                <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
                <Button variant="primary" onClick={() => setStep(1)} disabled={!canProceed1}>
                  Weiter
                  <Icon name="chevron-right" size={13} />
                </Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setStep(0)}>
                  <Icon name="chevron-left" size={13} />
                  Zurück
                </Button>
                <Button variant="primary" onClick={handleCreate} disabled={!canFinish || saving} loading={saving}>
                  Anlegen
                </Button>
              </>
            )}
          </div>
        </div>
      }
    >
      {step === 0 && (
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
      )}

      {step === 1 && (
        <div className={styles.stepContent}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Thema *</label>
            <Input
              value={thema}
              onChange={(e) => setThema(e.target.value)}
              placeholder="z.B. Auf den Spuren der Entdecker"
              autoFocus
            />
          </div>

          <div className={styles.field}>
            <label className={styles.fieldLabel}>Beschreibung</label>
            <textarea
              className={styles.textarea}
              value={beschreibung}
              onChange={(e) => setBeschreibung(e.target.value)}
              placeholder="Worum geht es in diesem Stammkontext?"
              rows={3}
            />
          </div>

          <div className={styles.aktivitaetenSection}>
            <div className={styles.aktivitaetenHeader}>
              <span className={styles.fieldLabel}>Aktivitäten</span>
              <button type="button" className={styles.addBtn} onClick={addAktivitaet}>
                <Icon name="plus" size={11} />
                Hinzufügen
              </button>
            </div>
            {aktivitaeten.map((a) => (
              <div key={a._key} className={styles.aktivitaetRow}>
                <Input
                  value={a.name}
                  onChange={(e) => updateAktivitaet(a._key, { name: e.target.value })}
                  placeholder="Name der Aktivität"
                />
                <Select
                  value={a.typ}
                  options={AKTIVITAET_TYP_OPTIONS}
                  onValueChange={(v) => updateAktivitaet(a._key, { typ: v as AktivitaetTyp })}
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeAktivitaet(a._key)}
                  aria-label="Entfernen"
                >
                  <Icon name="x" size={12} />
                </button>
              </div>
            ))}
            {aktivitaeten.length === 0 && (
              <p className={styles.emptyHint}>Aktivitäten können auch später im Editor ergänzt werden.</p>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}
