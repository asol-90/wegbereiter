/**
 * StammKontextPage — Stammkontext overview + editor.
 *
 * /stammkontext        → Overview (Jahreskalender + KontextSidebar)
 * /stammkontext/:id    → Editor (Jahreskalender + EditorPanel + Modals)
 */
import {parseIso} from '@/domain/dateUtils'
import {newId, type PlanungId, type StammAktionId, type StammKontextId, type StammTreffenId} from '@/domain/ids'
import type {Aktivitaet, IsoDate, StammAktion, StammBlock, StammTreffen} from '@/domain/types'
import {Panel, Panels} from '@/features/appShell'
import {Jahreskalender} from '@/features/overview/Jahreskalender'
import {useRepertoire} from '@/features/repertoire/useRepertoire'
import {useStammKontext} from '@/features/stammKontext'
import {Button, Modal} from '@/ui/primitives'
import {Icon} from '@/ui/primitives/Icon'
import {IconButton} from '@/ui/primitives/IconButton'
import {format} from 'date-fns'
import {de} from 'date-fns/locale'
import {useCallback, useMemo, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {KontextSidebar} from './KontextSidebar'
import {NewKontextWizard} from './NewKontextWizard'
import {type AktionGruppe, StammKontextEditorPanel} from './StammKontextEditorPanel'
import {downloadStammKontext} from './stammKontextExport'
import styles from './StammKontextPage.module.css'
import {useStammKontextEditorState} from './useStammKontextEditorState'

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function formatDatum(iso: IsoDate): string {
  return format(parseIso(iso), 'dd. MMM yyyy', { locale: de })
}

function computeKontextRange(
  draft: {
    treffen: StammTreffen[]
    stammaktionen: StammAktion[]
    distriktAktionen: StammAktion[]
    regionalAktionen: StammAktion[]
  },
): { start: IsoDate; ende: IsoDate } | undefined {
  const dates: IsoDate[] = []
  for (const t of draft.treffen) dates.push(t.datum)
  for (const a of [...draft.stammaktionen, ...draft.distriktAktionen, ...draft.regionalAktionen]) {
    dates.push(a.beginn, a.ende)
  }
  if (dates.length === 0) return undefined
  dates.sort()
  return { start: dates[0]!, ende: dates[dates.length - 1]! }
}

function aktivitaetToBlock(a: Aktivitaet): StammBlock {
  return { name: a.name, typ: a.typ, untertyp: a.untertyp, dauerMin: a.zeitMin }
}

const GRUPPE_LABELS: Record<AktionGruppe, string> = {
  stamm: 'Stamm-Aktion',
  distrikt: 'Distrikt-Aktion',
  regional: 'Regional-Aktion',
}

const GRUPPE_TO_FIELD = {
  stamm: 'stammaktionen',
  distrikt: 'distriktAktionen',
  regional: 'regionalAktionen',
} as const

// ─── DayActionPicker ─────────────────────────────────────────────────────────

function DayActionPicker({
  datum,
  onAddTreffen,
  onAddAktion,
  onClose,
}: {
  datum: IsoDate
  onAddTreffen: () => void
  onAddAktion: (gruppe: AktionGruppe) => void
  onClose: () => void
}) {
  return (
    <Modal
      open
      onClose={onClose}
      title={formatDatum(datum)}
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        </div>
      }
    >
      <div className={styles.dayPickerBody}>
        <p className={styles.dayPickerHint}>Was soll an diesem Tag hinzugefügt werden?</p>
        <button
          type="button"
          className={styles.dayPickerOption}
          onClick={() => { onAddTreffen(); onClose() }}
        >
          <Icon name="calendar" size={16} />
          <div>
            <span className={styles.dayPickerOptionTitle}>Treffen</span>
            <span className={styles.dayPickerOptionDesc}>Regulärer Stammtermin</span>
          </div>
        </button>
        <button
          type="button"
          className={styles.dayPickerOption}
          onClick={() => { onAddAktion('stamm'); onClose() }}
        >
          <Icon name="map" size={16} />
          <div>
            <span className={styles.dayPickerOptionTitle}>Stamm-Aktion</span>
            <span className={styles.dayPickerOptionDesc}>Lager, Stammversammlung o. Ä.</span>
          </div>
        </button>
        <button
          type="button"
          className={styles.dayPickerOption}
          onClick={() => { onAddAktion('distrikt'); onClose() }}
        >
          <Icon name="map" size={16} />
          <div>
            <span className={styles.dayPickerOptionTitle}>Distrikt-Aktion</span>
            <span className={styles.dayPickerOptionDesc}>Veranstaltung auf Distrikt-Ebene</span>
          </div>
        </button>
      </div>
    </Modal>
  )
}

// ─── TreffenBearbeitenModal ───────────────────────────────────────────────────

function StammBlockPicker({
  blocks,
  availableBlocks,
  onChange,
}: {
  blocks: StammBlock[]
  availableBlocks: StammBlock[]
  onChange: (blocks: StammBlock[]) => void
}) {
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)

  function handleDrop() {
    if (draggingIdx === null || overIdx === null || draggingIdx === overIdx) {
      setDraggingIdx(null)
      setOverIdx(null)
      return
    }
    const next = [...blocks]
    const [item] = next.splice(draggingIdx, 1)
    next.splice(overIdx, 0, item!)
    onChange(next)
    setDraggingIdx(null)
    setOverIdx(null)
  }

  const addedNames = new Set(blocks.map((b) => b.name))

  return (
    <div className={styles.blockPicker}>
      {blocks.length === 0 && (
        <p className={styles.blockPickerEmpty}>Keine Blöcke ausgewählt</p>
      )}
      {blocks.map((b, i) => (
        <div
          key={i}
          className={styles.blockPickerRow}
          draggable
          onDragStart={() => setDraggingIdx(i)}
          onDragOver={(e) => { e.preventDefault(); setOverIdx(i) }}
          onDrop={handleDrop}
        >
          <span className={styles.dragHandle}><Icon name="drag-handle" size={12} /></span>
          <span className={styles.blockPickerName}>{b.name}</span>
          <span className={styles.blockPickerMeta}>{b.dauerMin} Min</span>
          <IconButton
            icon="trash"
            label="Entfernen"
            tone="danger"
            size={11}
            onClick={() => onChange(blocks.filter((_, j) => j !== i))}
          />
        </div>
      ))}
      {availableBlocks.length > 0 && (
        <div className={styles.blockPickerAvailable}>
          {availableBlocks.filter((a) => !addedNames.has(a.name)).map((a, i) => (
            <button
              key={i}
              type="button"
              className={styles.blockPickerAdd}
              onClick={() => onChange([...blocks, a])}
            >
              <Icon name="plus" size={10} />
              {a.name}
            </button>
          ))}
        </div>
      )}
      {availableBlocks.length === 0 && blocks.length === 0 && (
        <p className={styles.blockPickerHint}>
          Keine Stammformat-Aktivitäten verfügbar. Aktivitäten zuerst im Abschnitt „Aktivitäten" anlegen.
        </p>
      )}
    </div>
  )
}

function TreffenBearbeitenModal({
  treffen,
  defaultAnfangsBlock,
  defaultEndBlock,
  stammAktivitaeten,
  onSave,
  onClose,
}: {
  treffen?: StammTreffen
  defaultAnfangsBlock: StammBlock[]
  defaultEndBlock: StammBlock[]
  stammAktivitaeten: Aktivitaet[]
  onSave: (t: StammTreffen) => void
  onClose: () => void
}) {
  const isNew = !treffen
  const today = new Date().toISOString().slice(0, 10) as IsoDate

  const [draft, setDraft] = useState<StammTreffen>(() =>
    treffen ?? { id: newId<StammTreffenId>(), datum: today, dauerMin: 90 },
  )
  const [showAnfangOverride, setShowAnfangOverride] = useState(draft.anfangsBlock !== undefined)
  const [showEndeOverride, setShowEndeOverride] = useState(draft.endBlock !== undefined)

  const stammBlocks = stammAktivitaeten.map(aktivitaetToBlock)
  const anfangOptions = [
    ...defaultAnfangsBlock,
    ...stammBlocks.filter((b) => !defaultAnfangsBlock.some((d) => d.name === b.name)),
  ]
  const endeOptions = [
    ...defaultEndBlock,
    ...stammBlocks.filter((b) => !defaultEndBlock.some((d) => d.name === b.name)),
  ]

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Treffen hinzufügen' : 'Treffen bearbeiten'}
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={() => onSave(draft)}>
            {isNew ? 'Hinzufügen' : 'Speichern'}
          </Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <div className={styles.treffenModalRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Datum</label>
            <input
              type="date"
              className={styles.fieldInput}
              autoFocus
              value={draft.datum}
              onChange={(e) => setDraft((d) => ({ ...d, datum: e.target.value as IsoDate }))}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Dauer (Min)</label>
            <input
              type="number"
              className={styles.fieldInputSm}
              value={draft.dauerMin}
              min={15}
              max={480}
              onChange={(e) =>
                setDraft((d) => ({ ...d, dauerMin: Math.max(15, +e.target.value || 90) }))
              }
            />
          </div>
        </div>

        <div className={styles.overrideSection}>
          <div className={styles.overrideSectionHeader}>
            <span className={styles.fieldLabel}>Anfangsblock</span>
            <div className={styles.overrideToggleGroup}>
              <button
                type="button"
                className={`${styles.overrideToggle} ${!showAnfangOverride ? styles.overrideToggleActive : ''}`}
                onClick={() => {
                  setShowAnfangOverride(false)
                  setDraft((d) => ({ ...d, anfangsBlock: undefined }))
                }}
              >
                Standard
              </button>
              <button
                type="button"
                className={`${styles.overrideToggle} ${showAnfangOverride ? styles.overrideToggleActive : ''}`}
                onClick={() => {
                  setShowAnfangOverride(true)
                  if (!draft.anfangsBlock) {
                    setDraft((d) => ({ ...d, anfangsBlock: [...defaultAnfangsBlock] }))
                  }
                }}
              >
                Überschreiben
              </button>
            </div>
          </div>
          {showAnfangOverride && (
            <StammBlockPicker
              blocks={draft.anfangsBlock ?? []}
              availableBlocks={anfangOptions}
              onChange={(b) => setDraft((d) => ({ ...d, anfangsBlock: b }))}
            />
          )}
        </div>

        <div className={styles.overrideSection}>
          <div className={styles.overrideSectionHeader}>
            <span className={styles.fieldLabel}>Endblock</span>
            <div className={styles.overrideToggleGroup}>
              <button
                type="button"
                className={`${styles.overrideToggle} ${!showEndeOverride ? styles.overrideToggleActive : ''}`}
                onClick={() => {
                  setShowEndeOverride(false)
                  setDraft((d) => ({ ...d, endBlock: undefined }))
                }}
              >
                Standard
              </button>
              <button
                type="button"
                className={`${styles.overrideToggle} ${showEndeOverride ? styles.overrideToggleActive : ''}`}
                onClick={() => {
                  setShowEndeOverride(true)
                  if (!draft.endBlock) {
                    setDraft((d) => ({ ...d, endBlock: [...defaultEndBlock] }))
                  }
                }}
              >
                Überschreiben
              </button>
            </div>
          </div>
          {showEndeOverride && (
            <StammBlockPicker
              blocks={draft.endBlock ?? []}
              availableBlocks={endeOptions}
              onChange={(b) => setDraft((d) => ({ ...d, endBlock: b }))}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}

// ─── AktionBearbeitenModal ────────────────────────────────────────────────────

export function AktionBearbeitenModal({
  aktion,
  gruppe,
  initialDatum,
  onSave,
  onClose,
}: {
  aktion?: StammAktion
  gruppe: AktionGruppe
  initialDatum?: IsoDate
  onSave: (a: StammAktion, gruppe: AktionGruppe) => void
  onClose: () => void
}) {
  const isNew = !aktion
  const today = (initialDatum ?? new Date().toISOString().slice(0, 10)) as IsoDate

  const [draft, setDraft] = useState<StammAktion>(() =>
    aktion ?? { id: newId<StammAktionId>(), titel: '', beginn: today, ende: today },
  )

  const canSave = draft.titel.trim().length > 0

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? `${GRUPPE_LABELS[gruppe]} hinzufügen` : `${GRUPPE_LABELS[gruppe]} bearbeiten`}
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={!canSave} onClick={() => onSave(draft, gruppe)}>
            {isNew ? 'Hinzufügen' : 'Speichern'}
          </Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Titel *</label>
          <input
            type="text"
            className={styles.fieldInput}
            autoFocus
            value={draft.titel}
            placeholder="z.B. Sommerlager, Stammversammlung"
            onChange={(e) => setDraft((d) => ({ ...d, titel: e.target.value }))}
          />
        </div>
        <div className={styles.treffenModalRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Von</label>
            <input
              type="date"
              className={styles.fieldInput}
              value={draft.beginn}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  beginn: e.target.value as IsoDate,
                  ende: e.target.value > d.ende ? (e.target.value as IsoDate) : d.ende,
                }))
              }
            />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Bis</label>
            <input
              type="date"
              className={styles.fieldInput}
              value={draft.ende}
              min={draft.beginn}
              onChange={(e) => setDraft((d) => ({ ...d, ende: e.target.value as IsoDate }))}
            />
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Ort</label>
          <input
            type="text"
            className={styles.fieldInput}
            value={draft.ort ?? ''}
            placeholder="Optional"
            onChange={(e) => setDraft((d) => ({ ...d, ort: e.target.value || undefined }))}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Beschreibung</label>
          <textarea
            className={styles.fieldTextarea}
            value={draft.beschreibung ?? ''}
            rows={2}
            onChange={(e) => setDraft((d) => ({ ...d, beschreibung: e.target.value || undefined }))}
          />
        </div>
      </div>
    </Modal>
  )
}

// ─── StammKontextEditorLayout ────────────────────────────────────────────────

type TreffenModalState = null | { treffen?: StammTreffen; datum?: IsoDate }
type AktionModalState = null | { aktion?: StammAktion; gruppe: AktionGruppe; datum?: IsoDate }

function StammKontextEditorLayout({ id }: { id: StammKontextId }) {
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

  const handleDayClick = useCallback(
    (datum: IsoDate) => setDayPickerDate(datum),
    [],
  )

  function handleAddTreffen(datum?: IsoDate) {
    setTreffenModal({ datum })
  }

  function handleEditTreffen(treffen: StammTreffen) {
    setTreffenModal({ treffen })
  }

  function handleTreffenSave(t: StammTreffen) {
    editorState.saveTreffen(t)
    setTreffenModal(null)
  }

  function handleAddAktion(gruppe: AktionGruppe, datum?: IsoDate) {
    setAktionModal({ gruppe, datum })
  }

  function handleEditAktion(aktion: StammAktion, gruppe: AktionGruppe) {
    setAktionModal({ aktion, gruppe })
  }

  function handleAktionSave(a: StammAktion, gruppe: AktionGruppe) {
    editorState.saveAktion(a, GRUPPE_TO_FIELD[gruppe])
    setAktionModal(null)
  }

  if (!draft) {
    return (
      <div className={styles.notFound}>
        <p>Stammkontext nicht gefunden.</p>
        <Button variant="ghost" onClick={() => navigate('/stammkontext')}>Zur Übersicht</Button>
      </div>
    )
  }

  const minYear = Math.min(
    currentYear,
    ...(kontextRange ? [Number(kontextRange.start.slice(0, 4))] : []),
  )
  const maxYear = Math.max(
    currentYear + 1,
    ...(kontextRange ? [Number(kontextRange.ende.slice(0, 4))] : []),
  )

  return (
    <>
      <Panels split="main-side">
        <Panel role="main">
          <Jahreskalender
            year={year}
            planungen={[]}
            highlightedPlanungId={null}
            onPlanungHover={() => {}}
            canGoBack={year > minYear}
            canGoForward={year < maxYear}
            isCurrentYear={year === currentYear}
            onGoBack={() => setYear((y) => Math.max(minYear, y - 1))}
            onGoForward={() => setYear((y) => Math.min(maxYear, y + 1))}
            onGoToday={() => setYear(currentYear)}
            kontextRange={kontextRange}
            onDayClick={handleDayClick}
          />
        </Panel>
        <Panel role="side">
          <div className={styles.editorView}>
            <div className={styles.editorHeader}>
              <button
                type="button"
                className={styles.backBtn}
                onClick={() => navigate('/stammkontext')}
              >
                <Icon name="chevron-left" size={14} />
                Kontext
              </button>
              <div className={styles.editorTitle}>
                <Icon name="compass" size={15} />
                <span>{draft.thema || 'Kein Thema'}</span>
              </div>
              <Button
                variant="ghost"
                icon="download"
                size="sm"
                onClick={() => downloadStammKontext(draft, importedAktivitaeten)}
              >
                JSON
              </Button>
            </div>
            <div className={styles.editorContent}>
              <StammKontextEditorPanel
                state={editorState}
                onAddTreffen={handleAddTreffen}
                onEditTreffen={handleEditTreffen}
                onAddAktion={handleAddAktion}
                onEditAktion={handleEditAktion}
              />
            </div>
          </div>
        </Panel>
      </Panels>

      {dayPickerDate && (
        <DayActionPicker
          datum={dayPickerDate}
          onAddTreffen={() => handleAddTreffen(dayPickerDate)}
          onAddAktion={(gruppe) => handleAddAktion(gruppe, dayPickerDate)}
          onClose={() => setDayPickerDate(null)}
        />
      )}

      {treffenModal !== null && (
        <TreffenBearbeitenModal
          treffen={treffenModal.treffen}
          defaultAnfangsBlock={draft.defaultAnfangsBlock}
          defaultEndBlock={draft.defaultEndBlock}
          stammAktivitaeten={stammAktivitaeten}
          onSave={handleTreffenSave}
          onClose={() => setTreffenModal(null)}
        />
      )}

      {aktionModal !== null && (
        <AktionBearbeitenModal
          aktion={aktionModal.aktion}
          gruppe={aktionModal.gruppe}
          initialDatum={aktionModal.datum}
          onSave={handleAktionSave}
          onClose={() => setAktionModal(null)}
        />
      )}
    </>
  )
}

// ─── StammKontextOverviewLayout ───────────────────────────────────────────────

function StammKontextOverviewLayout() {
  const { kontexte } = useStammKontext()

  const currentYear = new Date().getFullYear()
  const [highlightedPlanungId, setHighlightedPlanungId] = useState<PlanungId | null>(null)
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardZeitraum, setWizardZeitraum] = useState<
    { start: IsoDate; ende: IsoDate } | undefined
  >()
  const [year, setYear] = useState(currentYear)

  const dataYears = useMemo(() => {
    const years = new Set<number>([currentYear, currentYear + 1])
    for (const k of kontexte) {
      for (const t of k.treffen) years.add(Number(t.datum.slice(0, 4)))
      for (const a of k.stammaktionen) years.add(Number(a.beginn.slice(0, 4)))
    }
    return years
  }, [kontexte, currentYear])

  const minYear = Math.min(currentYear, ...dataYears)
  const maxYear = currentYear + 1

  const handleDragComplete = useCallback((start: string, ende: string) => {
    setWizardZeitraum({ start: start as IsoDate, ende: ende as IsoDate })
    setWizardOpen(true)
  }, [])

  return (
    <>
      <Panels split="main-side">
        <Panel role="main">
          <Jahreskalender
            year={year}
            planungen={[]}
            highlightedPlanungId={highlightedPlanungId}
            onPlanungHover={setHighlightedPlanungId}
            canGoBack={year > minYear}
            canGoForward={year < maxYear}
            isCurrentYear={year === currentYear}
            onGoBack={() => setYear((y) => Math.max(minYear, y - 1))}
            onGoForward={() => setYear((y) => Math.min(maxYear, y + 1))}
            onGoToday={() => setYear(currentYear)}
          />
        </Panel>
        <Panel role="side">
          <KontextSidebar
            displayYear={year}
            activeKontextId={null}
            onDragComplete={handleDragComplete}
          />
        </Panel>
      </Panels>

      <NewKontextWizard
        open={wizardOpen}
        onClose={() => {
          setWizardOpen(false)
          setWizardZeitraum(undefined)
        }}
        initialZeitraum={wizardZeitraum}
      />
    </>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function StammKontextPage() {
  const { id } = useParams<{ id: string }>()
  if (id) return <StammKontextEditorLayout id={id as StammKontextId} />
  return <StammKontextOverviewLayout />
}
