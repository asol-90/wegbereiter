/**
 * Stamm-Kontext-Auswertung für die Kalenderansicht.
 *
 * Filtert Stammaktionen/Distrikt-/Regional-Aktionen und Stamm-Treffen auf
 * den Zeitraum der Planung und stellt die Opt-Outs als Set bereit.
 */
import { useMemo } from 'react'
import type { Planung, StammAktion, StammKontext, StammTreffen } from '@/domain/types'

export function useCalendarStammData(
  planung: Planung | undefined,
  kontexte: StammKontext[],
) {
  const stammAktionen = useMemo<StammAktion[]>(() => {
    if (!planung) return []
    const all: StammAktion[] = []
    for (const k of kontexte) {
      for (const a of k.stammaktionen) {
        if (a.beginn <= planung.zeitraum.ende && a.ende >= planung.zeitraum.start) {
          all.push(a)
        }
      }
    }
    return all
  }, [kontexte, planung])

  const externAktionen = useMemo<StammAktion[]>(() => {
    if (!planung) return []
    const all: StammAktion[] = []
    for (const k of kontexte) {
      for (const a of [...(k.distriktAktionen ?? []), ...(k.regionalAktionen ?? [])]) {
        if (a.beginn <= planung.zeitraum.ende && a.ende >= planung.zeitraum.start) {
          all.push(a)
        }
      }
    }
    return all
  }, [kontexte, planung])

  const stammTreffen = useMemo<StammTreffen[]>(() => {
    if (!planung) return []
    const result: StammTreffen[] = []
    for (const k of kontexte) {
      for (const t of k.treffen) {
        if (t.datum >= planung.zeitraum.start && t.datum <= planung.zeitraum.ende) {
          result.push(t)
        }
      }
    }
    return result
  }, [kontexte, planung])

  const optedOutStammIds = useMemo(
    () => new Set(planung?.stammOptOuts ?? []),
    [planung],
  )

  return { stammAktionen, externAktionen, stammTreffen, optedOutStammIds }
}
