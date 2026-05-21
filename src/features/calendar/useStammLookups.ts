/**
 * Lookup maps for PlanungsKalender's per-cell rendering.
 *
 * Splits opt-outs once, then memoises the per-date Map indices so DayCell
 * rendering stays O(1) per day.
 */
import { useMemo } from 'react'
import type { StammAktion, StammTreffen } from '@/domain/types'

export type StammLookups = {
  activeStammAktionen: StammAktion[]
  activeStammTreffenByDate: Map<string, StammTreffen>
  allStammTreffenByDate: Map<string, StammTreffen>
  optedOutStammTreffenByDate: Map<string, StammTreffen>
}

export function useStammLookups(
  allStammTreffen: readonly StammTreffen[],
  allStammAktionen: readonly StammAktion[],
  optedOutStammIds: ReadonlySet<string>,
): StammLookups {
  const activeStammTreffen = useMemo(
    () => allStammTreffen.filter((t) => !optedOutStammIds.has(t.id)),
    [allStammTreffen, optedOutStammIds],
  )
  const activeStammAktionen = useMemo(
    () => allStammAktionen.filter((a) => !optedOutStammIds.has(a.id)),
    [allStammAktionen, optedOutStammIds],
  )
  const optedOutStammTreffen = useMemo(
    () => allStammTreffen.filter((t) => optedOutStammIds.has(t.id)),
    [allStammTreffen, optedOutStammIds],
  )
  const activeStammTreffenByDate = useMemo(
    () => new Map(activeStammTreffen.map((t) => [t.datum, t])),
    [activeStammTreffen],
  )
  const allStammTreffenByDate = useMemo(
    () => new Map(allStammTreffen.map((t) => [t.datum, t])),
    [allStammTreffen],
  )
  const optedOutStammTreffenByDate = useMemo(
    () => new Map(optedOutStammTreffen.map((t) => [t.datum, t])),
    [optedOutStammTreffen],
  )

  return { activeStammAktionen, activeStammTreffenByDate, allStammTreffenByDate, optedOutStammTreffenByDate }
}
