/**
 * State + Generator für Schritt 1 des NewKontextWizard.
 *
 * Beobachtet Zeitraum/Rhythmus/Wochentag, generiert die Termin-Liste
 * inkl. Ferien-/Feiertags-Annotation und schaltet Ferien-Termine per
 * Default deaktiviert.
 */
import { generateTermine } from '@/domain/dateUtils'
import type { IsoDate, Weekday } from '@/domain/types'
import { classifyDay } from '@/features/overview/monthGrid'
import { useFerienForYear } from '@/features/overview/useFerienForYear'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { rhythmusToRhythmus, type RhythmusKey, type TerminEntry } from './newKontextHelpers'

export function useNewKontextTermine({
  start, ende, weekday, rhythmusK,
}: {
  start: IsoDate
  ende: IsoDate
  weekday: Weekday
  rhythmusK: RhythmusKey
}) {
  const [termine, setTermine] = useState<TerminEntry[]>([])

  const yearStart = start ? Number.parseInt(start.slice(0, 4), 10) : new Date().getFullYear()
  const yearEnde = ende ? Number.parseInt(ende.slice(0, 4), 10) : yearStart
  const ferienYear1 = useFerienForYear(yearStart)
  const ferienYear2 = useFerienForYear(yearEnde !== yearStart ? yearEnde : yearStart)

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!start || !ende || start >= ende) {
      setTermine([])
      return
    }
    const dates = generateTermine(start, ende, weekday, rhythmusToRhythmus(rhythmusK))
    const entries: TerminEntry[] = dates.map((datum) => {
      const year = Number.parseInt(datum.slice(0, 4), 10)
      const ferienEntry = year === yearStart ? ferienYear1 : ferienYear2
      const cls = classifyDay(datum, ferienEntry)
      const ferienLabel = cls.ferien?.name ?? cls.feiertag?.name ?? null
      return { datum, aktiv: ferienLabel === null, ferienLabel }
    })
    setTermine(entries)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, ende, weekday, rhythmusK, ferienYear1, ferienYear2])
  /* eslint-enable react-hooks/set-state-in-effect */

  const activeCount = useMemo(() => termine.filter((t) => t.aktiv).length, [termine])

  const toggleTermin = useCallback((datum: IsoDate) => {
    setTermine((prev) =>
      prev.map((t) => t.datum === datum ? { ...t, aktiv: !t.aktiv } : t),
    )
  }, [])

  return { termine, activeCount, toggleTermin }
}
