/**
 * Import-Flow für Stammkontext-JSON in der Startseite-Liste.
 *
 * Hält Parse-Fehler + Pending-Import als State und liefert Handler für
 * Datei-Drop, Datei-Input und den Confirm-Schritt. Sorgt beim Confirm
 * dafür, dass überlappende Kontexte korrekt zurückgeschnitten oder
 * entfernt werden.
 */
import { useCallback, useState } from 'react'
import { checkOverlap, clipKontext } from '@/domain/stammOverlap'
import { detectFileType, parseStammDatei, StammParseError } from '@/domain/stammParser'
import type { Aktivitaet, StammKontext } from '@/domain/types'
import { repertoireStore } from '@/features/repertoire/repertoireStore'
import { useStammKontext, useStammKontextActions } from '@/features/stammKontext'

type PendingImport = {
  kontext: StammKontext
  aktivitaeten: Aktivitaet[]
}

export function useStammKontextImport() {
  const { kontexte } = useStammKontext()
  const stammActions = useStammKontextActions()
  const [parseError, setParseError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null)

  const handleFileDrop = useCallback((content: string, _fileName: string) => {
    setParseError(null)
    const fileType = detectFileType(content)
    if (fileType !== 'stammkontext') {
      setParseError('Unbekanntes Dateiformat. Erwartet: Stammkontext-JSON.')
      return
    }
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
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleFileDrop(reader.result, file.name)
        }
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
    parseError,
    setParseError,
    pendingImport,
    setPendingImport,
    handleFileDrop,
    handleFileInput,
    handleConfirmImport,
  }
}
