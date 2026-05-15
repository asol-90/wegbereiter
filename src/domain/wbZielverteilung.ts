/**
 * WB-Zielverteilungen — maps a WBSchwerpunkt to target intervals per WB key.
 *
 * Based on konzept-planungsziele-kontextleiste.md §1.3.
 * All values are shares (0..1), intervals are ±5 pp around the target.
 */
import type {WBSchwerpunkt} from './types'
import {WB_KEYS, type WBKey} from './wb'

export type WBZielIntervall = {
  ziel: number
  min: number
  max: number
}

/**
 * Compute target intervals for each WB key based on the Planung's WBSchwerpunkt.
 * Returns null if no schwerpunkt is set.
 */
export function wbZielverteilung(
  schwerpunkt: WBSchwerpunkt | undefined,
): Record<WBKey, WBZielIntervall> | null {
  if (!schwerpunkt) return null

  const { modus, bereiche } = schwerpunkt
  const result = {} as Record<WBKey, WBZielIntervall>

  switch (modus) {
    case 'ausgewogen':
      for (const k of WB_KEYS) {
        result[k] = { ziel: 0.25, min: 0.20, max: 0.30 }
      }
      break

    case 'tendenz': {
      const betonteSet = new Set(bereiche)
      if (betonteSet.size === 1) {
        for (const k of WB_KEYS) {
          result[k] = betonteSet.has(k)
            ? { ziel: 0.33, min: 0.28, max: 0.38 }
            : { ziel: 0.22, min: 0.17, max: 0.27 }
        }
      } else {
        // 2 betonte WB
        for (const k of WB_KEYS) {
          result[k] = betonteSet.has(k)
            ? { ziel: 0.30, min: 0.25, max: 0.35 }
            : { ziel: 0.20, min: 0.15, max: 0.25 }
        }
      }
      break
    }

    case 'fokus': {
      const betont = bereiche[0]
      for (const k of WB_KEYS) {
        result[k] = k === betont
          ? { ziel: 0.40, min: 0.35, max: 0.45 }
          : { ziel: 0.20, min: 0.15, max: 0.25 }
      }
      break
    }

    case 'haupt-neben': {
      const haupt = bereiche[0]
      const neben = bereiche[1]
      for (const k of WB_KEYS) {
        if (k === haupt) {
          result[k] = { ziel: 0.40, min: 0.35, max: 0.45 }
        } else if (k === neben) {
          result[k] = { ziel: 0.33, min: 0.28, max: 0.38 }
        } else {
          result[k] = { ziel: 0.13, min: 0.08, max: 0.18 }
        }
      }
      break
    }

    case 'dominant': {
      const betont = bereiche[0]
      for (const k of WB_KEYS) {
        result[k] = k === betont
          ? { ziel: 0.50, min: 0.45, max: 0.55 }
          : { ziel: 0.17, min: 0.12, max: 0.22 }
      }
      break
    }
  }

  return result
}
