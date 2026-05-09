/**
 * StammKontextEditorPanel — rechte Spalte des Stammkontext-Editors.
 *
 * Fünf faltbare Sektionen:
 *   1. Thema (read-only, Bearbeiten via Dialog)
 *   2. Stammzeit (read-only, Bearbeiten via Dialog)
 *   3. Treffen (Mini-Cards mit Stammzeit-Balken)
 *   4. Aktionen (Stamm / Distrikt / Regional, Zwischenüberschriften)
 *   5. Aktivitäten (Cards)
 */
import { useState } from 'react'
import { useId } from 'react'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { parseIso } from '@/domain/dateUtils'
import { newId } from '@/domain/ids'
import type {
  StammBlock,
  StammTreffen,
  StammAktion,
  Aktivitaet,
  AktivitaetTyp,
  IsoDate,
} from '@/domain/types'
import type { StammAktionId, AktivitaetId } from '@/domain/ids'
import {
  AKTIVITAET_TYPEN,
  TYP_LABELS,
  UNTERTYPEN_FUER_TYP,
  UNTERTYP_LABELS,
  type AktivitaetUntertyp,
} from '@/domain/aktivitaetKatalog'
import { Button, Modal } from '@/ui/primitives'
import { AccordionGroup } from '@/ui/primitives/AccordionGroup'
import { IconButton } from '@/ui/primitives/IconButton'
import { Icon } from '@/ui/primitives/Icon'
import { WBAktivitaetEditor } from '@/ui/domain-primitives/WBAktivitaetEditor'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import { repertoireStore } from '@/features/repertoire/repertoireStore'
import type { useStammKontextEditorState } from './useStammKontextEditorState'
import styles from './StammKontextEditorPanel.module.css'

type EditorState = ReturnType<typeof useStammKontextEditorState>

export type AktionGruppe = 'stamm' | 'distrikt' | 'regional'

export type StammKontextEditorPanelProps = {
  state: EditorState
  onAddTreffen: (datum?: IsoDate) => void
  onEditTreffen: (treffen: StammTreffen) => void
  onAddAktion: (gruppe: AktionGruppe, datum?: IsoDate) => void
  onEditAktion: (aktion: StammAktion, gruppe: AktionGruppe) => void
}

// ─── Modal-Zustand ──────────────────────────────────────────────────────────

type ModalZustand =
  | null
  | { modus: 'thema-bearbeiten' }
  | { modus: 'stammzeit-bearbeiten' }
  | { modus: 'aktivitaet-neu' }
  | { modus: 'aktivitaet-bearbeiten'; aktivitaet: Aktivitaet }

// ─── Hilfsfunktionen ────────────────────────────────────────────────────────

function formatDatum(iso: IsoDate): string {
  return format(parseIso(iso), 'dd. MMM yyyy', { locale: de })
}

function sumDauer(blocks: StammBlock[]): number {
  return blocks.reduce((sum, b) => sum + b.dauerMin, 0)
}

// ─── ThemaBearbeitenModal ────────────────────────────────────────────────────

function ThemaBearbeitenModal({
  initialThema,
  initialBeschreibung,
  initialNotiz,
  initialTag,
  onSave,
  onClose,
}: {
  initialThema: string
  initialBeschreibung?: string
  initialNotiz?: string
  initialTag?: string
  onSave: (thema: string, beschreibung?: string, notiz?: string, tag?: string) => void
  onClose: () => void
}) {
  const uid = useId()
  const [thema, setThema] = useState(initialThema)
  const [beschreibung, setBeschreibung] = useState(initialBeschreibung ?? '')
  const [notiz, setNotiz] = useState(initialNotiz ?? '')
  const [tag, setTag] = useState(initialTag ?? '')

  return (
    <Modal
      open
      onClose={onClose}
      title="Thema bearbeiten"
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button
            variant="primary"
            disabled={!thema.trim()}
            onClick={() =>
              onSave(thema, beschreibung || undefined, notiz || undefined, tag || undefined)
            }
          >
            Speichern
          </Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-thema`}>Thema *</label>
          <input
            id={`${uid}-thema`}
            type="text"
            className={styles.fieldInput}
            autoFocus
            value={thema}
            placeholder="Saison-Thema"
            onChange={(e) => setThema(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-beschreibung`}>Beschreibung</label>
          <textarea
            id={`${uid}-beschreibung`}
            className={styles.fieldTextarea}
            value={beschreibung}
            rows={3}
            onChange={(e) => setBeschreibung(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-notiz`}>Bearbeitungsnotiz</label>
          <textarea
            id={`${uid}-notiz`}
            className={styles.fieldTextarea}
            value={notiz}
            placeholder="Änderungshinweis für Gruppenleiter"
            rows={2}
            onChange={(e) => setNotiz(e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor={`${uid}-tag`}>Themen-Tag</label>
          <input
            id={`${uid}-tag`}
            type="text"
            className={styles.fieldInput}
            value={tag}
            placeholder="Wird Aktivitäten beim Import zugewiesen"
            onChange={(e) => setTag(e.target.value)}
          />
        </div>
      </div>
    </Modal>
  )
}

// ─── ThemaDisplay ────────────────────────────────────────────────────────────

function ThemaDisplay({
  thema,
  themaBeschreibung,
  themenTag,
  bearbeitungsNotiz,
  onEdit,
}: {
  thema: string
  themaBeschreibung?: string
  themenTag?: string
  bearbeitungsNotiz?: string
  onEdit: () => void
}) {
  return (
    <div className={styles.displaySection}>
      <div className={styles.displayContent}>
        <span className={styles.displayTitle}>
          {thema || <em className={styles.placeholder}>Kein Thema</em>}
        </span>
        {themaBeschreibung && (
          <span className={styles.displayMeta}>{themaBeschreibung}</span>
        )}
        {themenTag && <span className={styles.displayTag}>#{themenTag}</span>}
        {bearbeitungsNotiz && (
          <span className={styles.displayNotiz}>{bearbeitungsNotiz}</span>
        )}
      </div>
      <IconButton icon="edit" label="Thema bearbeiten" onClick={onEdit} />
    </div>
  )
}

// ─── StammzeitBearbeitenModal ─────────────────────────────────────────────────

function StammzeitBearbeitenModal({
  initialAnfang,
  initialEnde,
  onSave,
  onClose,
}: {
  initialAnfang: StammBlock[]
  initialEnde: StammBlock[]
  onSave: (anfang: StammBlock[], ende: StammBlock[]) => void
  onClose: () => void
}) {
  const [anfang, setAnfang] = useState<StammBlock[]>(initialAnfang)
  const [ende, setEnde] = useState<StammBlock[]>(initialEnde)

  return (
    <Modal
      open
      onClose={onClose}
      title="Stammzeit bearbeiten"
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={() => onSave(anfang, ende)}>Speichern</Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <BlockListEditor label="Anfangsblock" blocks={anfang} onChange={setAnfang} />
        <BlockListEditor label="Endblock" blocks={ende} onChange={setEnde} />
      </div>
    </Modal>
  )
}

// ─── StammzeitDisplay ────────────────────────────────────────────────────────

function StammzeitDisplay({
  anfangsBlock,
  endBlock,
  onEdit,
}: {
  anfangsBlock: StammBlock[]
  endBlock: StammBlock[]
  onEdit: () => void
}) {
  function renderBlocks(blocks: StammBlock[]) {
    if (blocks.length === 0) return <span className={styles.displayMeta}>–</span>
    return (
      <span className={styles.displayMeta}>
        {blocks.map((b, i) => (
          <span key={i}>
            {b.name || '–'} ({b.dauerMin} Min)
            {i < blocks.length - 1 ? ' · ' : ''}
          </span>
        ))}
      </span>
    )
  }

  return (
    <div className={styles.displaySection}>
      <div className={styles.displayContent}>
        <div className={styles.stammzeitDisplayRow}>
          <span className={styles.displayLabel}>Anfang:</span>
          {renderBlocks(anfangsBlock)}
        </div>
        <div className={styles.stammzeitDisplayRow}>
          <span className={styles.displayLabel}>Ende:</span>
          {renderBlocks(endBlock)}
        </div>
      </div>
      <IconButton icon="edit" label="Stammzeit bearbeiten" onClick={onEdit} />
    </div>
  )
}

// ─── BlockRow / BlockListEditor ───────────────────────────────────────────────

function BlockRow({
  block,
  onChange,
  onRemove,
  dragIndex,
  onDragStart,
  onDragOver,
  onDrop,
}: {
  block: StammBlock
  onChange: (b: StammBlock) => void
  onRemove: () => void
  dragIndex: number
  onDragStart: (i: number) => void
  onDragOver: (i: number) => void
  onDrop: () => void
}) {
  return (
    <div
      className={styles.blockRow}
      draggable
      onDragStart={() => onDragStart(dragIndex)}
      onDragOver={(e) => { e.preventDefault(); onDragOver(dragIndex) }}
      onDrop={onDrop}
    >
      <span className={styles.dragHandle} title="Verschieben">
        <Icon name="drag-handle" size={14} />
      </span>
      <input
        type="text"
        className={styles.blockName}
        value={block.name}
        placeholder="Name"
        onChange={(e) => onChange({ ...block, name: e.target.value })}
      />
      <input
        type="number"
        className={styles.blockDauer}
        value={block.dauerMin}
        min={1}
        max={120}
        onChange={(e) => onChange({ ...block, dauerMin: Math.max(1, Number(e.target.value) || 1) })}
        title="Minuten"
      />
      <span className={styles.blockDauerUnit}>Min</span>
      <IconButton icon="trash" label="Entfernen" tone="danger" size={12} onClick={onRemove} />
    </div>
  )
}

function BlockListEditor({
  label,
  blocks,
  onChange,
}: {
  label: string
  blocks: StammBlock[]
  onChange: (b: StammBlock[]) => void
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

  function addBlock() {
    onChange([...blocks, { name: '', typ: 'stammformat' as AktivitaetTyp, dauerMin: 10 }])
  }

  return (
    <div className={styles.blockListSection}>
      <span className={styles.blockListLabel}>{label}</span>
      {blocks.map((b, i) => (
        <BlockRow
          key={i}
          block={b}
          dragIndex={i}
          onChange={(updated) => {
            const next = [...blocks]
            next[i] = updated
            onChange(next)
          }}
          onRemove={() => onChange(blocks.filter((_, j) => j !== i))}
          onDragStart={setDraggingIdx}
          onDragOver={setOverIdx}
          onDrop={handleDrop}
        />
      ))}
      <button type="button" className={styles.addRowBtn} onClick={addBlock}>
        <Icon name="plus" size={12} />
        <span>Programmpunkt hinzufügen</span>
      </button>
    </div>
  )
}

// ─── TreffenCard ─────────────────────────────────────────────────────────────

function TreffenCard({
  treffen,
  defaultAnfangsBlock,
  defaultEndBlock,
  onEdit,
  onRemove,
}: {
  treffen: StammTreffen
  defaultAnfangsBlock: StammBlock[]
  defaultEndBlock: StammBlock[]
  onEdit: () => void
  onRemove: () => void
}) {
  const anfangBlocks = treffen.anfangsBlock ?? defaultAnfangsBlock
  const endeBlocks = treffen.endBlock ?? defaultEndBlock
  const anfangDauer = sumDauer(anfangBlocks)
  const endeDauer = sumDauer(endeBlocks)
  const total = treffen.dauerMin || 1
  const mitteDauer = Math.max(0, total - anfangDauer - endeDauer)

  const anfangPct = (anfangDauer / total) * 100
  const mittePct = (mitteDauer / total) * 100
  const endePct = (endeDauer / total) * 100

  return (
    <div className={styles.treffenCard}>
      <div className={styles.treffenCardTop}>
        <span className={styles.treffenCardDate}>{formatDatum(treffen.datum)}</span>
        <span className={styles.treffenCardDauer}>{treffen.dauerMin} Min</span>
      </div>
      <div className={styles.stammzeitBar}>
        {anfangPct > 0 && (
          <div className={styles.stammzeitBarAnfang} style={{ flexBasis: `${anfangPct}%` }} />
        )}
        {mittePct > 0 && (
          <div className={styles.stammzeitBarMitte} style={{ flexBasis: `${mittePct}%` }} />
        )}
        {endePct > 0 && (
          <div className={styles.stammzeitBarEnde} style={{ flexBasis: `${endePct}%` }} />
        )}
      </div>
      <div className={styles.treffenCardActions}>
        <IconButton icon="edit" label="Bearbeiten" size={12} onClick={onEdit} />
        <IconButton icon="trash" label="Entfernen" tone="danger" size={12} onClick={onRemove} />
      </div>
    </div>
  )
}

// ─── AktionCard ───────────────────────────────────────────────────────────────

function AktionCard({
  aktion,
  onEdit,
  onRemove,
}: {
  aktion: StammAktion
  onEdit: () => void
  onRemove: () => void
}) {
  const dateStr =
    aktion.beginn === aktion.ende
      ? formatDatum(aktion.beginn)
      : `${formatDatum(aktion.beginn)} – ${formatDatum(aktion.ende)}`

  return (
    <div className={styles.aktionCard}>
      <span className={styles.aktionCardTitle}>
        {aktion.titel || <em className={styles.placeholder}>Kein Titel</em>}
      </span>
      <span className={styles.aktionCardDate}>{dateStr}</span>
      <div className={styles.aktionCardActions}>
        <IconButton icon="edit" label="Bearbeiten" size={12} onClick={onEdit} />
        <IconButton icon="trash" label="Entfernen" tone="danger" size={12} onClick={onRemove} />
      </div>
    </div>
  )
}

// ─── AktionenGroup ────────────────────────────────────────────────────────────

function AktionenGroup({
  title,
  addLabel,
  gruppe,
  aktionen,
  onAdd,
  onEdit,
  onRemove,
}: {
  title: string
  addLabel: string
  gruppe: AktionGruppe
  aktionen: StammAktion[]
  onAdd: (gruppe: AktionGruppe) => void
  onEdit: (aktion: StammAktion, gruppe: AktionGruppe) => void
  onRemove: (id: StammAktionId) => void
}) {
  return (
    <div className={styles.aktionenGroup}>
      <span className={styles.aktionenSubheading}>{title}</span>
      {aktionen.length > 0 && (
        <div className={styles.aktionCardList}>
          {aktionen.map((a) => (
            <AktionCard
              key={a.id}
              aktion={a}
              onEdit={() => onEdit(a, gruppe)}
              onRemove={() => onRemove(a.id)}
            />
          ))}
        </div>
      )}
      <button type="button" className={styles.addRowBtn} onClick={() => onAdd(gruppe)}>
        <Icon name="plus" size={12} />
        <span>{addLabel} hinzufügen</span>
      </button>
    </div>
  )
}

// ─── AktivitaetCard ───────────────────────────────────────────────────────────

function AktivitaetCard({
  aktivitaet,
  onEdit,
  onRemove,
}: {
  aktivitaet: Aktivitaet
  onEdit: () => void
  onRemove: (id: AktivitaetId) => void
}) {
  return (
    <div className={styles.aktivitaetCard}>
      <div className={styles.aktivitaetCardHeader}>
        <span className={styles.aktivitaetCardName}>
          {aktivitaet.name || <em className={styles.placeholder}>Kein Name</em>}
        </span>
        <div className={styles.aktivitaetCardActions}>
          <IconButton icon="edit" label="Bearbeiten" size={12} onClick={onEdit} />
          <IconButton
            icon="trash"
            label="Entfernen"
            tone="danger"
            size={12}
            onClick={() => onRemove(aktivitaet.id)}
          />
        </div>
      </div>
      <span className={styles.aktivitaetCardMeta}>
        {TYP_LABELS[aktivitaet.typ]}
        {aktivitaet.untertyp && ` · ${UNTERTYP_LABELS[aktivitaet.untertyp]}`}
        {' · '}{aktivitaet.zeitMin}–{aktivitaet.zeitMax} Min
      </span>
    </div>
  )
}

// ─── AktivitaetBearbeitenModal ────────────────────────────────────────────────

function AktivitaetBearbeitenModal({
  isNew,
  initialAktivitaet,
  stammImportId,
  onSave,
  onClose,
}: {
  isNew: boolean
  initialAktivitaet?: Aktivitaet
  stammImportId: Aktivitaet['stammImportId']
  onSave: (a: Aktivitaet) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState<Aktivitaet>(() =>
    initialAktivitaet ?? {
      id: newId<AktivitaetId>(),
      name: '',
      typ: 'sonstiges' as AktivitaetTyp,
      wbTags: [],
      themenTags: [],
      zeitMin: 15,
      zeitMax: 30,
      quelle: 'stamm-import',
      stammImportId,
    },
  )

  const untertypen = UNTERTYPEN_FUER_TYP[draft.typ]
  const canSave = draft.name.trim().length > 0

  function handleTypChange(newTyp: AktivitaetTyp) {
    setDraft((d) => ({ ...d, typ: newTyp, untertyp: undefined }))
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={isNew ? 'Aktivität hinzufügen' : 'Aktivität bearbeiten'}
      size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" disabled={!canSave} onClick={() => onSave(draft)}>
            {isNew ? 'Hinzufügen' : 'Speichern'}
          </Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <div className={styles.field}>
          <label className={styles.fieldLabel}>Name *</label>
          <input
            type="text"
            className={styles.fieldInput}
            autoFocus
            value={draft.name}
            placeholder="Aktivitätsname"
            onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          />
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Typ</label>
            <select
              className={styles.fieldInput}
              value={draft.typ}
              onChange={(e) => handleTypChange(e.target.value as AktivitaetTyp)}
            >
              {AKTIVITAET_TYPEN.filter((t) => t !== 'wegezeit').map((t) => (
                <option key={t} value={t}>{TYP_LABELS[t]}</option>
              ))}
            </select>
          </div>
          {untertypen && (
            <div className={styles.field}>
              <label className={styles.fieldLabel}>Untertyp</label>
              <select
                className={styles.fieldInput}
                value={draft.untertyp ?? ''}
                onChange={(e) =>
                  setDraft((d) => ({
                    ...d,
                    untertyp: (e.target.value || undefined) as AktivitaetUntertyp | undefined,
                  }))
                }
              >
                <option value="">–</option>
                {untertypen.map((ut) => (
                  <option key={ut} value={ut}>{UNTERTYP_LABELS[ut]}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className={styles.fieldRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Dauer min (Min)</label>
            <input
              type="number"
              className={styles.dauerInput}
              value={draft.zeitMin}
              min={1}
              onChange={(e) =>
                setDraft((d) => ({ ...d, zeitMin: Math.max(1, +e.target.value || 1) }))
              }
            />
          </div>
          <span className={styles.dauerSep}>–</span>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Dauer max (Min)</label>
            <input
              type="number"
              className={styles.dauerInput}
              value={draft.zeitMax}
              min={draft.zeitMin}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  zeitMax: Math.max(d.zeitMin, +e.target.value || d.zeitMin),
                }))
              }
            />
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel}>Wachstumsbereiche</label>
          <WBAktivitaetEditor
            value={draft.wbTags}
            onChange={(tags) => setDraft((d) => ({ ...d, wbTags: tags }))}
          />
        </div>
      </div>
    </Modal>
  )
}

// ─── Hauptkomponente ──────────────────────────────────────────────────────────

export function StammKontextEditorPanel({
  state,
  onAddTreffen,
  onEditTreffen,
  onAddAktion,
  onEditAktion,
}: StammKontextEditorPanelProps) {
  const { draft } = state
  const { aktivitaeten: allAktivitaeten } = useRepertoire()
  const [modalZustand, setModalZustand] = useState<ModalZustand>(null)

  if (!draft) return <div className={styles.loading}>Wird geladen…</div>

  const importedAktivitaeten = allAktivitaeten.filter(
    (a) => draft.importierteAktivitaetIds.includes(a.id),
  )

  async function handleAktivitaetSave(a: Aktivitaet) {
    await repertoireStore.saveAktivitaet(a)
    if (modalZustand?.modus === 'aktivitaet-neu') {
      state.addImportedAktivitaetId(a.id)
    }
    setModalZustand(null)
  }

  async function handleRemoveAktivitaet(id: AktivitaetId) {
    await repertoireStore.remove(id)
    state.removeImportedAktivitaetId(id)
  }

  function handleThemaSave(thema: string, beschreibung?: string, notiz?: string, tag?: string) {
    state.patch({ thema, themaBeschreibung: beschreibung, bearbeitungsNotiz: notiz, themenTag: tag })
    setModalZustand(null)
  }

  function handleStammzeitSave(anfang: StammBlock[], ende: StammBlock[]) {
    state.patch({ defaultAnfangsBlock: anfang, defaultEndBlock: ende })
    setModalZustand(null)
  }

  const accordionItems = [
    {
      id: 'thema',
      title: 'Thema',
      children: (
        <div className={styles.sectionContent}>
          <ThemaDisplay
            thema={draft.thema}
            themaBeschreibung={draft.themaBeschreibung}
            themenTag={draft.themenTag}
            bearbeitungsNotiz={draft.bearbeitungsNotiz}
            onEdit={() => setModalZustand({ modus: 'thema-bearbeiten' })}
          />
        </div>
      ),
    },
    {
      id: 'stammzeit',
      title: 'Stammzeit',
      children: (
        <div className={styles.sectionContent}>
          <StammzeitDisplay
            anfangsBlock={draft.defaultAnfangsBlock}
            endBlock={draft.defaultEndBlock}
            onEdit={() => setModalZustand({ modus: 'stammzeit-bearbeiten' })}
          />
        </div>
      ),
    },
    {
      id: 'treffen',
      title: (
        <span>
          Treffen{' '}
          <span className={styles.sectionCount}>{draft.treffen.length}</span>
        </span>
      ),
      children: (
        <div className={styles.sectionContent}>
          <div className={styles.treffenCardGrid}>
            {draft.treffen.map((t) => (
              <TreffenCard
                key={t.id}
                treffen={t}
                defaultAnfangsBlock={draft.defaultAnfangsBlock}
                defaultEndBlock={draft.defaultEndBlock}
                onEdit={() => onEditTreffen(t)}
                onRemove={() => state.removeTreffen(t.id)}
              />
            ))}
          </div>
          <button type="button" className={styles.addRowBtn} onClick={() => onAddTreffen()}>
            <Icon name="plus" size={12} />
            <span>Termin hinzufügen</span>
          </button>
        </div>
      ),
    },
    {
      id: 'aktionen',
      title: (
        <span>
          Aktionen{' '}
          <span className={styles.sectionCount}>
            {draft.stammaktionen.length + draft.distriktAktionen.length + draft.regionalAktionen.length}
          </span>
        </span>
      ),
      children: (
        <div className={styles.sectionContent}>
          <AktionenGroup
            title="Stamm-Aktionen"
            addLabel="Stamm-Aktion"
            gruppe="stamm"
            aktionen={draft.stammaktionen}
            onAdd={onAddAktion}
            onEdit={onEditAktion}
            onRemove={state.stamm.removeAktion}
          />
          <AktionenGroup
            title="Distrikt-Aktionen"
            addLabel="Distrikt-Aktion"
            gruppe="distrikt"
            aktionen={draft.distriktAktionen}
            onAdd={onAddAktion}
            onEdit={onEditAktion}
            onRemove={state.distrikt.removeAktion}
          />
          <AktionenGroup
            title="Regional-Aktionen"
            addLabel="Regional-Aktion"
            gruppe="regional"
            aktionen={draft.regionalAktionen}
            onAdd={onAddAktion}
            onEdit={onEditAktion}
            onRemove={state.regional.removeAktion}
          />
        </div>
      ),
    },
    {
      id: 'aktivitaeten',
      title: (
        <span>
          Aktivitäten{' '}
          <span className={styles.sectionCount}>{importedAktivitaeten.length}</span>
        </span>
      ),
      children: (
        <div className={styles.sectionContent}>
          {importedAktivitaeten.map((a) => (
            <AktivitaetCard
              key={a.id}
              aktivitaet={a}
              onEdit={() => setModalZustand({ modus: 'aktivitaet-bearbeiten', aktivitaet: a })}
              onRemove={handleRemoveAktivitaet}
            />
          ))}
          <button
            type="button"
            className={styles.addRowBtn}
            onClick={() => setModalZustand({ modus: 'aktivitaet-neu' })}
          >
            <Icon name="plus" size={12} />
            <span>Aktivität hinzufügen</span>
          </button>
        </div>
      ),
    },
  ]

  return (
    <>
      <div className={styles.root}>
        <AccordionGroup
          items={accordionItems}
          mode="multi"
          defaultOpen={['thema', 'treffen']}
        />
      </div>

      {modalZustand?.modus === 'thema-bearbeiten' && (
        <ThemaBearbeitenModal
          initialThema={draft.thema}
          initialBeschreibung={draft.themaBeschreibung}
          initialNotiz={draft.bearbeitungsNotiz}
          initialTag={draft.themenTag}
          onSave={handleThemaSave}
          onClose={() => setModalZustand(null)}
        />
      )}

      {modalZustand?.modus === 'stammzeit-bearbeiten' && (
        <StammzeitBearbeitenModal
          initialAnfang={draft.defaultAnfangsBlock}
          initialEnde={draft.defaultEndBlock}
          onSave={handleStammzeitSave}
          onClose={() => setModalZustand(null)}
        />
      )}

      {(modalZustand?.modus === 'aktivitaet-neu' ||
        modalZustand?.modus === 'aktivitaet-bearbeiten') && (
        <AktivitaetBearbeitenModal
          isNew={modalZustand.modus === 'aktivitaet-neu'}
          initialAktivitaet={
            modalZustand.modus === 'aktivitaet-bearbeiten' ? modalZustand.aktivitaet : undefined
          }
          stammImportId={draft.stammImportId}
          onSave={handleAktivitaetSave}
          onClose={() => setModalZustand(null)}
        />
      )}
    </>
  )
}
