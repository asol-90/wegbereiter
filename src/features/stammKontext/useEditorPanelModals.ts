/**
 * Modal-state + save handlers for StammKontextEditorPanel.
 * Encapsulates the 4-mode modal switching (thema, stammzeit, aktivitaet-neu/-bearbeiten).
 */
import { useState } from 'react'
import type { Aktivitaet, StammBlock } from '@/domain/types'
import type { AktivitaetId } from '@/domain/ids'
import { repertoireStore } from '@/features/repertoire/repertoireStore'
import type { useStammKontextEditorState } from './useStammKontextEditorState'

export type ModalZustand =
  | null
  | { modus: 'thema-bearbeiten' }
  | { modus: 'stammzeit-bearbeiten' }
  | { modus: 'aktivitaet-neu' }
  | { modus: 'aktivitaet-bearbeiten'; aktivitaet: Aktivitaet }

type EditorState = ReturnType<typeof useStammKontextEditorState>

export function useEditorPanelModals(state: EditorState) {
  const [modal, setModal] = useState<ModalZustand>(null)

  async function handleAktivitaetSave(a: Aktivitaet) {
    await repertoireStore.saveAktivitaet(a)
    if (modal?.modus === 'aktivitaet-neu') state.addImportedAktivitaetId(a.id)
    setModal(null)
  }

  async function handleRemoveAktivitaet(id: AktivitaetId) {
    await repertoireStore.remove(id)
    state.removeImportedAktivitaetId(id)
  }

  function handleThemaSave(thema: string, beschreibung?: string, notiz?: string, tag?: string) {
    state.patch({ thema, themaBeschreibung: beschreibung, bearbeitungsNotiz: notiz, themenTag: tag })
    setModal(null)
  }

  function handleStammzeitSave(anfang: StammBlock[], ende: StammBlock[]) {
    state.patch({ defaultAnfangsBlock: anfang, defaultEndBlock: ende })
    setModal(null)
  }

  return {
    modal, setModal,
    handleAktivitaetSave, handleRemoveAktivitaet, handleThemaSave, handleStammzeitSave,
  }
}
