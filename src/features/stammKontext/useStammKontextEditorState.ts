/**
 * useStammKontextEditorState — local form state with debounced auto-save.
 *
 * Keeps a draft copy in React state and debounces saves to the store so the
 * UI stays snappy while the DB write happens in the background.
 */
import type { StammKontextId } from '@/domain/ids'
import type { StammBlock, StammKontext } from '@/domain/types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { stammKontextStore } from './stammKontextStore'
import { useStammKontext } from './useStammKontext'
import {
  useAktionActions,
  useImportedAktivitaetActions,
  useSaveAktion,
  useTreffenActions,
} from './useStammKontextEditorActions'

const DEBOUNCE_MS = 500

export function useStammKontextEditorState(kontextId: StammKontextId) {
  const { kontexte } = useStammKontext()
  const stored = kontexte.find((k) => k.id === kontextId) ?? null

  const [draft, setDraftRaw] = useState<StammKontext | null>(stored)
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Keep draft in sync when the store pushes an update from outside
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored && !draft) setDraftRaw(stored)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stored?.id])

  const save = useCallback((next: StammKontext) => {
    const updated: StammKontext = {
      ...next,
      bearbeitetAm: new Date().toISOString(),
    }
    setDraftRaw(updated)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      stammKontextStore.update(updated)
    }, DEBOUNCE_MS)
  }, [])

  const patch = useCallback(
    (partial: Partial<StammKontext>) => {
      if (!draft) return
      save({ ...draft, ...partial })
    },
    [draft, save],
  )

  const setThema = useCallback((thema: string) => patch({ thema }), [patch])
  const setThemaBeschreibung = useCallback(
    (v: string) => patch({ themaBeschreibung: v || undefined }),
    [patch],
  )
  const setBearbeitungsNotiz = useCallback(
    (v: string) => patch({ bearbeitungsNotiz: v || undefined }),
    [patch],
  )
  const setThemenTag = useCallback(
    (v: string) => patch({ themenTag: v || undefined }),
    [patch],
  )

  const setDefaultAnfangsBlock = useCallback(
    (blocks: StammBlock[]) => patch({ defaultAnfangsBlock: blocks }),
    [patch],
  )
  const setDefaultEndBlock = useCallback(
    (blocks: StammBlock[]) => patch({ defaultEndBlock: blocks }),
    [patch],
  )

  const treffenActions = useTreffenActions(draft, save)
  const stammAktionHelpers = useAktionActions(draft, save, 'stammaktionen')
  const distriktAktionHelpers = useAktionActions(draft, save, 'distriktAktionen')
  const regionalAktionHelpers = useAktionActions(draft, save, 'regionalAktionen')
  const saveAktion = useSaveAktion(draft, save)
  const aktivitaetActions = useImportedAktivitaetActions(draft, save)

  return {
    draft,
    patch,
    setThema,
    setThemaBeschreibung,
    setBearbeitungsNotiz,
    setThemenTag,
    setDefaultAnfangsBlock,
    setDefaultEndBlock,
    ...treffenActions,
    stamm: stammAktionHelpers,
    distrikt: distriktAktionHelpers,
    regional: regionalAktionHelpers,
    saveAktion,
    ...aktivitaetActions,
  }
}
