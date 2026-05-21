/**
 * StammKontextEditorLayout — the edit screen for a single Stammkontext.
 *
 * Lives at /stammkontext/:id and shows the Jahreskalender + Editor side-by-side,
 * with modals for adding/editing Treffen and Aktionen.
 */
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { StammKontextId } from '@/domain/ids'
import type { IsoDate, StammAktion, StammTreffen } from '@/domain/types'
import { Panel, Panels } from '@/features/appShell'
import { Jahreskalender } from '@/features/overview/Jahreskalender'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { Button } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import { AktionBearbeitenModal } from './AktionBearbeitenModal'
import { DayActionPicker } from './DayActionPicker'
import {
  type AktionGruppe, StammKontextEditorPanel,
} from './StammKontextEditorPanel'
import { downloadStammKontext } from './stammKontextExport'
import { TreffenBearbeitenModal } from './TreffenBearbeitenModal'
import { useStammKontextEditorState } from './useStammKontextEditorState'
import styles from './StammKontextPage.module.css'

const GRUPPE_TO_FIELD = {
  stamm: 'stammaktionen',
  distrikt: 'distriktAktionen',
  regional: 'regionalAktionen',
} as const

function computeKontextRange(draft: {
  treffen: StammTreffen[]
  stammaktionen: StammAktion[]
  distriktAktionen: StammAktion[]
  regionalAktionen: StammAktion[]
}): { start: IsoDate; ende: IsoDate } | undefined {
  const dates: IsoDate[] = []
  for (const t of draft.treffen) dates.push(t.datum)
  for (const a of [...draft.stammaktionen, ...draft.distriktAktionen, ...draft.regionalAktionen]) {
    dates.push(a.beginn, a.ende)
  }
  if (dates.length === 0) return undefined
  dates.sort()
  return { start: dates[0]!, ende: dates[dates.length - 1]! }
}

type TreffenModalState = null | { treffen?: StammTreffen; datum?: IsoDate }
type AktionModalState = null | { aktion?: StammAktion; gruppe: AktionGruppe; datum?: IsoDate }

function EditorHeader({
  thema, importedAktivitaeten, draft, onBack,
}: {
  thema: string
  importedAktivitaeten: ReturnType<typeof useRepertoire>['aktivitaeten']
  draft: Parameters<typeof downloadStammKontext>[0]
  onBack: () => void
}) {
  return (
    <div className={styles.editorHeader}>
      <button type="button" className={styles.backBtn} onClick={onBack}>
        <Icon name="chevron-left" size={14} />
        Kontext
      </button>
      <div className={styles.editorTitle}>
        <Icon name="compass" size={15} />
        <span>{thema || 'Kein Thema'}</span>
      </div>
      <Button variant="ghost" icon="download" size="sm"
        onClick={() => downloadStammKontext(draft, importedAktivitaeten)}>
        JSON
      </Button>
    </div>
  )
}

type ModalProps = {
  dayPickerDate: IsoDate | null
  setDayPickerDate: (v: IsoDate | null) => void
  treffenModal: TreffenModalState
  setTreffenModal: (v: TreffenModalState) => void
  aktionModal: AktionModalState
  setAktionModal: (v: AktionModalState) => void
  defaultAnfangsBlock: StammTreffen['anfangsBlock'] extends infer T ? T : never
  defaultEndBlock: StammTreffen['endBlock'] extends infer T ? T : never
  stammAktivitaeten: ReturnType<typeof useRepertoire>['aktivitaeten']
  onTreffenSave: (t: StammTreffen) => void
  onAktionSave: (a: StammAktion, gruppe: AktionGruppe) => void
  onAddTreffen: (datum?: IsoDate) => void
  onAddAktion: (gruppe: AktionGruppe, datum?: IsoDate) => void
}

function EditorModals({
  dayPickerDate, setDayPickerDate,
  treffenModal, setTreffenModal,
  aktionModal, setAktionModal,
  defaultAnfangsBlock, defaultEndBlock, stammAktivitaeten,
  onTreffenSave, onAktionSave, onAddTreffen, onAddAktion,
}: ModalProps) {
  return (
    <>
      {dayPickerDate && (
        <DayActionPicker
          datum={dayPickerDate}
          onAddTreffen={() => onAddTreffen(dayPickerDate)}
          onAddAktion={(gruppe) => onAddAktion(gruppe, dayPickerDate)}
          onClose={() => setDayPickerDate(null)}
        />
      )}
      {treffenModal !== null && (
        <TreffenBearbeitenModal
          treffen={treffenModal.treffen}
          defaultAnfangsBlock={defaultAnfangsBlock ?? []}
          defaultEndBlock={defaultEndBlock ?? []}
          stammAktivitaeten={stammAktivitaeten}
          onSave={onTreffenSave}
          onClose={() => setTreffenModal(null)}
        />
      )}
      {aktionModal !== null && (
        <AktionBearbeitenModal
          aktion={aktionModal.aktion}
          gruppe={aktionModal.gruppe}
          initialDatum={aktionModal.datum}
          onSave={onAktionSave}
          onClose={() => setAktionModal(null)}
        />
      )}
    </>
  )
}

export function StammKontextEditorLayout({ id }: { id: StammKontextId }) {
  const navigate = useNavigate()
  const { aktivitaeten: allAktivitaeten } = useRepertoire()
  const editorState = useStammKontextEditorState(id)
  const { draft } = editorState

  const [dayPickerDate, setDayPickerDate] = useState<IsoDate | null>(null)
  const [treffenModal, setTreffenModal] = useState<TreffenModalState>(null)
  const [aktionModal, setAktionModal] = useState<AktionModalState>(null)
  const currentYear = new Date().getFullYear()
  const [year, setYear] = useState(currentYear)

  const stammAktivitaeten = useMemo(
    () => allAktivitaeten.filter((a) => a.typ === 'stammformat'),
    [allAktivitaeten],
  )
  const importedAktivitaeten = useMemo(
    () => (draft ? allAktivitaeten.filter((a) => draft.importierteAktivitaetIds.includes(a.id)) : []),
    [draft, allAktivitaeten],
  )
  const kontextRange = useMemo(() => (draft ? computeKontextRange(draft) : undefined), [draft])

  const modalHandlers = {
    onDayClick: useCallback((datum: IsoDate) => setDayPickerDate(datum), []),
    onAddTreffen: (datum?: IsoDate) => setTreffenModal({ datum }),
    onEditTreffen: (treffen: StammTreffen) => setTreffenModal({ treffen }),
    onTreffenSave: (t: StammTreffen) => { editorState.saveTreffen(t); setTreffenModal(null) },
    onAddAktion: (gruppe: AktionGruppe, datum?: IsoDate) => setAktionModal({ gruppe, datum }),
    onEditAktion: (aktion: StammAktion, gruppe: AktionGruppe) => setAktionModal({ aktion, gruppe }),
    onAktionSave: (a: StammAktion, gruppe: AktionGruppe) => {
      editorState.saveAktion(a, GRUPPE_TO_FIELD[gruppe])
      setAktionModal(null)
    },
  }

  if (!draft) {
    return (
      <div className={styles.notFound}>
        <p>Stammkontext nicht gefunden.</p>
        <Button variant="ghost" onClick={() => navigate('/stammkontext')}>Zur Übersicht</Button>
      </div>
    )
  }

  const minYear = Math.min(currentYear, ...(kontextRange ? [Number(kontextRange.start.slice(0, 4))] : []))
  const maxYear = Math.max(currentYear + 1, ...(kontextRange ? [Number(kontextRange.ende.slice(0, 4))] : []))

  return (
    <>
      <Panels split="main-side">
        <Panel role="main">
          <Jahreskalender
            year={year} planungen={[]} highlightedPlanungId={null} onPlanungHover={() => {}}
            canGoBack={year > minYear} canGoForward={year < maxYear} isCurrentYear={year === currentYear}
            onGoBack={() => setYear((y) => Math.max(minYear, y - 1))}
            onGoForward={() => setYear((y) => Math.min(maxYear, y + 1))}
            onGoToday={() => setYear(currentYear)}
            kontextRange={kontextRange}
            onDayClick={modalHandlers.onDayClick}
          />
        </Panel>
        <Panel role="side">
          <div className={styles.editorView}>
            <EditorHeader
              thema={draft.thema} importedAktivitaeten={importedAktivitaeten}
              draft={draft} onBack={() => navigate('/stammkontext')}
            />
            <div className={styles.editorContent}>
              <StammKontextEditorPanel
                state={editorState}
                onAddTreffen={modalHandlers.onAddTreffen} onEditTreffen={modalHandlers.onEditTreffen}
                onAddAktion={modalHandlers.onAddAktion} onEditAktion={modalHandlers.onEditAktion}
              />
            </div>
          </div>
        </Panel>
      </Panels>
      <EditorModals
        dayPickerDate={dayPickerDate} setDayPickerDate={setDayPickerDate}
        treffenModal={treffenModal} setTreffenModal={setTreffenModal}
        aktionModal={aktionModal} setAktionModal={setAktionModal}
        defaultAnfangsBlock={draft.defaultAnfangsBlock}
        defaultEndBlock={draft.defaultEndBlock}
        stammAktivitaeten={stammAktivitaeten}
        onTreffenSave={modalHandlers.onTreffenSave}
        onAktionSave={modalHandlers.onAktionSave}
        onAddTreffen={modalHandlers.onAddTreffen}
        onAddAktion={modalHandlers.onAddAktion}
      />
    </>
  )
}
