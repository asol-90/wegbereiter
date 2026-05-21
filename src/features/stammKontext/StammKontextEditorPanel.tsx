/**
 * StammKontextEditorPanel — rechte Spalte des Stammkontext-Editors.
 *
 * Fünf faltbare Sektionen: Thema, Stammzeit, Treffen, Aktionen, Aktivitäten.
 * Karten + Display-Komponenten leben in EditorPanelCards, Modal-State in
 * useEditorPanelModals.
 */
import type { ReactNode } from 'react'
import type { IsoDate, StammAktion, StammTreffen } from '@/domain/types'
import { AccordionGroup } from '@/ui/primitives/AccordionGroup'
import { Icon } from '@/ui/primitives/Icon'
import { useRepertoire } from '@/features/repertoire/useRepertoire'
import type { useStammKontextEditorState } from './useStammKontextEditorState'
import { ThemaBearbeitenModal } from './ThemaBearbeitenModal'
import { StammzeitBearbeitenModal } from './StammzeitBearbeitenModal'
import { AktivitaetBearbeitenModal } from './AktivitaetBearbeitenModal'
import {
  AktionenGroup, AktivitaetCard, StammzeitDisplay, ThemaDisplay, TreffenCard,
} from './EditorPanelCards'
import { useEditorPanelModals } from './useEditorPanelModals'
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

type Draft = NonNullable<EditorState['draft']>
type Modals = ReturnType<typeof useEditorPanelModals>

function SectionTitle({ label, count }: { label: string; count: number }) {
  return <span>{label} <span className={styles.sectionCount}>{count}</span></span>
}

function buildThemaItem(draft: Draft, openEdit: () => void) {
  return {
    id: 'thema', title: 'Thema',
    children: (
      <div className={styles.sectionContent}>
        <ThemaDisplay
          thema={draft.thema}
          themaBeschreibung={draft.themaBeschreibung}
          themenTag={draft.themenTag}
          bearbeitungsNotiz={draft.bearbeitungsNotiz}
          onEdit={openEdit}
        />
      </div>
    ),
  }
}

function buildStammzeitItem(draft: Draft, openEdit: () => void) {
  return {
    id: 'stammzeit', title: 'Stammzeit',
    children: (
      <div className={styles.sectionContent}>
        <StammzeitDisplay
          anfangsBlock={draft.defaultAnfangsBlock}
          endBlock={draft.defaultEndBlock}
          onEdit={openEdit}
        />
      </div>
    ),
  }
}

function buildTreffenItem(
  draft: Draft, state: EditorState,
  onEditTreffen: (t: StammTreffen) => void, onAddTreffen: () => void,
) {
  return {
    id: 'treffen', title: <SectionTitle label="Treffen" count={draft.treffen.length} />,
    children: (
      <div className={styles.sectionContent}>
        <div className={styles.treffenCardGrid}>
          {draft.treffen.map((t) => (
            <TreffenCard key={t.id} treffen={t}
              defaultAnfangsBlock={draft.defaultAnfangsBlock}
              defaultEndBlock={draft.defaultEndBlock}
              onEdit={() => onEditTreffen(t)}
              onRemove={() => state.removeTreffen(t.id)} />
          ))}
        </div>
        <button type="button" className={styles.addRowBtn} onClick={onAddTreffen}>
          <Icon name="plus" size={12} />
          <span>Termin hinzufügen</span>
        </button>
      </div>
    ),
  }
}

function buildAktionenItem(
  draft: Draft, state: EditorState,
  onAddAktion: (gruppe: AktionGruppe) => void,
  onEditAktion: (a: StammAktion, gruppe: AktionGruppe) => void,
) {
  const total = draft.stammaktionen.length + draft.distriktAktionen.length + draft.regionalAktionen.length
  const groups: Array<{ title: string; addLabel: string; gruppe: AktionGruppe; list: StammAktion[]; remove: (id: StammAktion['id']) => void }> = [
    { title: 'Stamm-Aktionen', addLabel: 'Stamm-Aktion', gruppe: 'stamm', list: draft.stammaktionen, remove: state.stamm.removeAktion },
    { title: 'Distrikt-Aktionen', addLabel: 'Distrikt-Aktion', gruppe: 'distrikt', list: draft.distriktAktionen, remove: state.distrikt.removeAktion },
    { title: 'Regional-Aktionen', addLabel: 'Regional-Aktion', gruppe: 'regional', list: draft.regionalAktionen, remove: state.regional.removeAktion },
  ]
  return {
    id: 'aktionen', title: <SectionTitle label="Aktionen" count={total} />,
    children: (
      <div className={styles.sectionContent}>
        {groups.map((g) => (
          <AktionenGroup key={g.gruppe}
            title={g.title} addLabel={g.addLabel} gruppe={g.gruppe} aktionen={g.list}
            onAdd={onAddAktion} onEdit={onEditAktion} onRemove={g.remove} />
        ))}
      </div>
    ),
  }
}

function buildAktivitaetenItem(
  importedAktivitaeten: ReturnType<typeof useRepertoire>['aktivitaeten'],
  modals: Modals,
) {
  return {
    id: 'aktivitaeten', title: <SectionTitle label="Aktivitäten" count={importedAktivitaeten.length} />,
    children: (
      <div className={styles.sectionContent}>
        {importedAktivitaeten.map((a) => (
          <AktivitaetCard key={a.id} aktivitaet={a}
            onEdit={() => modals.setModal({ modus: 'aktivitaet-bearbeiten', aktivitaet: a })}
            onRemove={modals.handleRemoveAktivitaet} />
        ))}
        <button type="button" className={styles.addRowBtn}
          onClick={() => modals.setModal({ modus: 'aktivitaet-neu' })}>
          <Icon name="plus" size={12} />
          <span>Aktivität hinzufügen</span>
        </button>
      </div>
    ),
  }
}

function EditorModals({ draft, modals }: { draft: Draft; modals: Modals }) {
  return (
    <>
      {modals.modal?.modus === 'thema-bearbeiten' && (
        <ThemaBearbeitenModal
          initialThema={draft.thema}
          initialBeschreibung={draft.themaBeschreibung}
          initialNotiz={draft.bearbeitungsNotiz}
          initialTag={draft.themenTag}
          onSave={modals.handleThemaSave}
          onClose={() => modals.setModal(null)}
        />
      )}
      {modals.modal?.modus === 'stammzeit-bearbeiten' && (
        <StammzeitBearbeitenModal
          initialAnfang={draft.defaultAnfangsBlock}
          initialEnde={draft.defaultEndBlock}
          onSave={modals.handleStammzeitSave}
          onClose={() => modals.setModal(null)}
        />
      )}
      {(modals.modal?.modus === 'aktivitaet-neu' || modals.modal?.modus === 'aktivitaet-bearbeiten') && (
        <AktivitaetBearbeitenModal
          isNew={modals.modal.modus === 'aktivitaet-neu'}
          initialAktivitaet={modals.modal.modus === 'aktivitaet-bearbeiten' ? modals.modal.aktivitaet : undefined}
          stammImportId={draft.stammImportId}
          onSave={modals.handleAktivitaetSave}
          onClose={() => modals.setModal(null)}
        />
      )}
    </>
  )
}

export function StammKontextEditorPanel({
  state, onAddTreffen, onEditTreffen, onAddAktion, onEditAktion,
}: StammKontextEditorPanelProps) {
  const { draft } = state
  const { aktivitaeten: allAktivitaeten } = useRepertoire()
  const modals = useEditorPanelModals(state)

  if (!draft) return <div className={styles.loading}>Wird geladen…</div>

  const importedAktivitaeten = allAktivitaeten.filter((a) => draft.importierteAktivitaetIds.includes(a.id))
  const accordionItems: Array<{ id: string; title: ReactNode; children: ReactNode }> = [
    buildThemaItem(draft, () => modals.setModal({ modus: 'thema-bearbeiten' })),
    buildStammzeitItem(draft, () => modals.setModal({ modus: 'stammzeit-bearbeiten' })),
    buildTreffenItem(draft, state, onEditTreffen, () => onAddTreffen()),
    buildAktionenItem(draft, state, onAddAktion, onEditAktion),
    buildAktivitaetenItem(importedAktivitaeten, modals),
  ]

  return (
    <>
      <div className={styles.root}>
        <AccordionGroup items={accordionItems} mode="multi" defaultOpen={['thema', 'treffen']} />
      </div>
      <EditorModals draft={draft} modals={modals} />
    </>
  )
}
