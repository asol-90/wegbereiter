/**
 * WB-Zielverteilungen — maps a WBSchwerpunkt to target intervals per WB key.
 *
 * Based on konzept-planungsziele-kontextleiste.md §1.3.
 * All values are shares (0..1), intervals are ±5 pp around the target.
 */
import type {WbSchwerpunktModus, WBSchwerpunkt} from './types'
import {WB_KEYS, type WBKey} from './wb'

export type WBZielIntervall = {
  ziel: number
  min: number
  max: number
}

type Rolle = 'haupt' | 'neben' | 'rest'

/** Intervalle pro (Modus × Rolle). Lookup-Tabelle hält die Logik datengetrieben. */
const INTERVALLE: Record<WbSchwerpunktModus, Record<'einfach' | 'doppel', Record<Rolle, WBZielIntervall>>> = {
  ausgewogen: {
    einfach: {
      haupt: { ziel: 0.25, min: 0.20, max: 0.30 },
      neben: { ziel: 0.25, min: 0.20, max: 0.30 },
      rest:  { ziel: 0.25, min: 0.20, max: 0.30 },
    },
    doppel: {
      haupt: { ziel: 0.25, min: 0.20, max: 0.30 },
      neben: { ziel: 0.25, min: 0.20, max: 0.30 },
      rest:  { ziel: 0.25, min: 0.20, max: 0.30 },
    },
  },
  tendenz: {
    einfach: {
      haupt: { ziel: 0.33, min: 0.28, max: 0.38 },
      neben: { ziel: 0.33, min: 0.28, max: 0.38 },
      rest:  { ziel: 0.22, min: 0.17, max: 0.27 },
    },
    doppel: {
      haupt: { ziel: 0.30, min: 0.25, max: 0.35 },
      neben: { ziel: 0.30, min: 0.25, max: 0.35 },
      rest:  { ziel: 0.20, min: 0.15, max: 0.25 },
    },
  },
  fokus: {
    einfach: {
      haupt: { ziel: 0.40, min: 0.35, max: 0.45 },
      neben: { ziel: 0.40, min: 0.35, max: 0.45 },
      rest:  { ziel: 0.20, min: 0.15, max: 0.25 },
    },
    doppel: {
      haupt: { ziel: 0.40, min: 0.35, max: 0.45 },
      neben: { ziel: 0.40, min: 0.35, max: 0.45 },
      rest:  { ziel: 0.20, min: 0.15, max: 0.25 },
    },
  },
  'haupt-neben': {
    einfach: {
      haupt: { ziel: 0.40, min: 0.35, max: 0.45 },
      neben: { ziel: 0.33, min: 0.28, max: 0.38 },
      rest:  { ziel: 0.13, min: 0.08, max: 0.18 },
    },
    doppel: {
      haupt: { ziel: 0.40, min: 0.35, max: 0.45 },
      neben: { ziel: 0.33, min: 0.28, max: 0.38 },
      rest:  { ziel: 0.13, min: 0.08, max: 0.18 },
    },
  },
  dominant: {
    einfach: {
      haupt: { ziel: 0.50, min: 0.45, max: 0.55 },
      neben: { ziel: 0.50, min: 0.45, max: 0.55 },
      rest:  { ziel: 0.17, min: 0.12, max: 0.22 },
    },
    doppel: {
      haupt: { ziel: 0.50, min: 0.45, max: 0.55 },
      neben: { ziel: 0.50, min: 0.45, max: 0.55 },
      rest:  { ziel: 0.17, min: 0.12, max: 0.22 },
    },
  },
}

function rolleOf(modus: WbSchwerpunktModus, bereiche: WBKey[], k: WBKey): Rolle {
  if (modus === 'ausgewogen') return 'haupt'
  if (modus === 'haupt-neben') {
    if (k === bereiche[0]) return 'haupt'
    if (k === bereiche[1]) return 'neben'
    return 'rest'
  }
  return bereiche.includes(k) ? 'haupt' : 'rest'
}

/**
 * Compute target intervals for each WB key based on the Planung's WBSchwerpunkt.
 * Returns null if no schwerpunkt is set.
 */
export function wbZielverteilung(
  schwerpunkt: WBSchwerpunkt | undefined,
): Record<WBKey, WBZielIntervall> | null {
  if (!schwerpunkt) return null

  const variante = schwerpunkt.bereiche.length === 1 ? 'einfach' : 'doppel'
  const intervalle = INTERVALLE[schwerpunkt.modus][variante]
  const result = {} as Record<WBKey, WBZielIntervall>
  for (const k of WB_KEYS) {
    result[k] = intervalle[rolleOf(schwerpunkt.modus, schwerpunkt.bereiche, k)]
  }
  return result
}
