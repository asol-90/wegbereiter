/**
 * NewKontextWizard — 2-step modal for creating a new StammKontext.
 *
 * Step 1 "Termine": Zeitraum + Rhythmus, generates date list with
 *   ferien-aware defaults (holiday dates start deactivated).
 * Step 2 "Thema": Name, Beschreibung, optionale Aktivitäten.
 *
 * On completion: creates StammKontext + Aktivitäten, navigates to editor.
 */
import {newId, type AktivitaetId, type StammImportId, type StammTreffenId} from '@/domain/ids'
import {type Aktivitaet, type IsoDate, type StammKontext, type StammTreffen, type Weekday} from '@/domain/types'
import {useGlobalConfig} from '@/features/globalConfig'
import {repertoireStore} from '@/features/repertoire/repertoireStore'
import {Modal} from '@/ui/primitives'
import {useCallback, useEffect, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {NewKontextFooter} from './NewKontextFooter'
import {NewKontextStep1} from './NewKontextStep1'
import {NewKontextStep2} from './NewKontextStep2'
import {defaultEnde, defaultStart, type AktivitaetDraft, type RhythmusKey} from './newKontextHelpers'
import {useNewKontextTermine} from './useNewKontextTermine'
import {useStammKontextActions} from './useStammKontext'

export type NewKontextWizardProps = {
  open: boolean
  onClose: () => void
  /** Pre-filled time range from drag gesture on KontextSidebar. */
  initialZeitraum?: { start: IsoDate; ende: IsoDate }
}

export function NewKontextWizard({ open, onClose, initialZeitraum }: NewKontextWizardProps) {
  const { config, loaded } = useGlobalConfig()
  const { create, update } = useStammKontextActions()
  const navigate = useNavigate()

  const [step, setStep] = useState<0 | 1>(0)
  const [saving, setSaving] = useState(false)
  const [start, setStart] = useState<IsoDate>('' as IsoDate)
  const [ende, setEnde] = useState<IsoDate>('' as IsoDate)
  const [weekday, setWeekday] = useState<Weekday>('freitag')
  const [rhythmusK, setRhythmusK] = useState<RhythmusKey>('biweekly')
  const [thema, setThema] = useState('')
  const [beschreibung, setBeschreibung] = useState('')
  const [aktivitaeten, setAktivitaeten] = useState<AktivitaetDraft[]>([])

  const { termine, activeCount, toggleTermin } = useNewKontextTermine({
    start, ende, weekday, rhythmusK,
  })

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

  const addAktivitaet = useCallback(() => {
    const key = `${Date.now()}-${Math.random()}`
    setAktivitaeten((prev) => [...prev, { _key: key, name: '', typ: 'spiel' }])
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Neuen Kontext anlegen"
      size="md"
      footer={
        <NewKontextFooter
          step={step}
          saving={saving}
          canProceed1={canProceed1}
          canFinish={canFinish}
          onCancel={onClose}
          onNext={() => setStep(1)}
          onBack={() => setStep(0)}
          onCreate={handleCreate}
        />
      }
    >
      {step === 0 && (
        <NewKontextStep1
          start={start} setStart={setStart}
          ende={ende} setEnde={setEnde}
          weekday={weekday} setWeekday={setWeekday}
          rhythmusK={rhythmusK} setRhythmusK={setRhythmusK}
          termine={termine}
          activeCount={activeCount}
          toggleTermin={toggleTermin}
        />
      )}

      {step === 1 && (
        <NewKontextStep2
          thema={thema} setThema={setThema}
          beschreibung={beschreibung} setBeschreibung={setBeschreibung}
          aktivitaeten={aktivitaeten}
          onAdd={addAktivitaet}
          onUpdate={updateAktivitaet}
          onRemove={removeAktivitaet}
        />
      )}
    </Modal>
  )
}
