/**
 * useStammImport — shared hook for the Stammkontext file-import flow.
 *
 * Extracts all state and handlers from JahresplanerSidebar so the same
 * import logic can be triggered from both the Sidebar drop-zone and the
 * Kompass-Button in the Topbar.
 *
 * Returns state + handlers. The caller is responsible for rendering the
 * <StammImportDialog> and the hidden <input type="file">.
 */
import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { Aktivitaet, StammKontext } from '@/domain/types'
import { parseStammDatei, StammParseError, detectFileType } from '@/domain/stammParser'
import { checkOverlap, clipKontext } from '@/domain/stammOverlap'
import { repertoireStore } from '@/features/repertoire/repertoireStore'
import { useStammKontext, useStammKontextActions } from './useStammKontext'

export type PendingImport = {
  kontext: StammKontext
  aktivitaeten: Aktivitaet[]
}

export function useStammImport() {
  const { kontexte } = useStammKontext()
  const stammActions = useStammKontextActions()

  const [parseError, setParseError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = useCallback((content: string) => {
    setParseError(null)
    const fileType = detectFileType(content)
    if (fileType === 'stammkontext') {
      try {
        const result = parseStammDatei(content)
        setPendingImport(result)
      } catch (e) {
        setParseError(
          e instanceof StammParseError
            ? e.message
            : 'Die Datei konnte nicht gelesen werden.',
        )
      }
    } else {
      setParseError('Unbekanntes Dateiformat. Erwartet: Stammkontext-JSON.')
    }
  }, [])

  const triggerFileSelect = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileInput = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') handleFileDrop(reader.result)
      }
      reader.readAsText(file)
      e.target.value = ''
    },
    [handleFileDrop],
  )

  const handleConfirmImport = useCallback(async () => {
    if (!pendingImport) return
    const { kontext: incoming, aktivitaeten: incomingAktivitaeten } = pendingImport
    for (const existing of kontexte) {
      const result = checkOverlap(existing, incoming)
      if (result.kind === 'overlap') {
        const clipped = clipKontext(existing, result.overlapStart)
        if (clipped) {
          await stammActions.update(clipped)
        } else {
          await stammActions.remove(existing.id)
        }
      }
    }
    await stammActions.importKontext(incoming)
    for (const a of incomingAktivitaeten) {
      await repertoireStore.saveAktivitaet(a)
    }
    setPendingImport(null)
  }, [pendingImport, kontexte, stammActions])

  return {
    fileInputRef,
    parseError,
    pendingImport,
    handleFileDrop,
    handleFileInput,
    triggerFileSelect,
    handleConfirmImport,
    clearPendingImport: () => setPendingImport(null),
    clearError: () => setParseError(null),
  }
}
