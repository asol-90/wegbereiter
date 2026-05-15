/**
 * WB distribution + characterization — pure functions used by the donut chart,
 * the meeting card (Ist-WB-Icons), and the Kontext-Panel legend.
 */
import type {Programmpunkt} from './types'
import {WB_KEYS, type WBCharacter, type WBKey, type WBTag} from './wb'

export type WBDistribution = Record<WBKey, number>

/**
 * Sum up WB tag intensities across programmpunkte. The result is not
 * normalized — it represents total "weighted minutes" per Bereich if you
 * weight intensities by dauerMin, or raw tag-intensity sums otherwise.
 */
export function sumWBTags(tags: WBTag[]): WBDistribution {
  const base = emptyDistribution()
  for (const tag of tags) {
    base[tag.key] = (base[tag.key] ?? 0) + tag.intensity
  }
  return base
}

export function emptyDistribution(): WBDistribution {
  return {
    koerperlich: 0,
    gesellschaftlich: 0,
    geistig: 0,
    geistlich: 0,
  }
}

/**
 * WB contribution of a single programmpunkt — intensity × dauer.
 * Wegezeit has empty wbTags so it contributes 0 automatically.
 */
export function contributionOf(pp: Programmpunkt): WBDistribution {
  const out = emptyDistribution()
  for (const tag of pp.wbTags) {
    out[tag.key] = (out[tag.key] ?? 0) + tag.intensity * pp.dauerMin
  }
  return out
}

export function combine(...dists: WBDistribution[]): WBDistribution {
  const out = emptyDistribution()
  for (const d of dists) {
    for (const k of WB_KEYS) out[k] += d[k]
  }
  return out
}

/** Sum of all values. */
export function total(d: WBDistribution): number {
  return WB_KEYS.reduce((acc, k) => acc + d[k], 0)
}

/** Normalize to 0..1 shares. Zero-distribution returns all-zero. */
export function normalize(d: WBDistribution): WBDistribution {
  const t = total(d)
  if (t === 0) return emptyDistribution()
  const out = emptyDistribution()
  for (const k of WB_KEYS) out[k] = d[k] / t
  return out
}

/**
 * Characterize a distribution.
 *
 * Rationale (wertneutral):
 * - ausgewogen: max share ≤ ~0.30 (four bereiche ≈ equal at 0.25)
 * - tendenz: max share ≤ ~0.40 (slight lean)
 * - fokus: max share ≤ ~0.60 (clear emphasis)
 * - dominant: max share > 0.60
 *
 * `keys` contains the bereiche that drive the characterization:
 * all bereiche at or above 0.7 × max.
 */
export function characterize(dist: WBDistribution): WBCharacter {
  const norm = normalize(dist)
  const entries = WB_KEYS.map((k) => ({ k, v: norm[k] }))
  const max = Math.max(...entries.map((e) => e.v))

  if (total(dist) === 0 || max <= 0.3) {
    return { kind: 'ausgewogen' }
  }
  const leaders = entries.filter((e) => e.v >= max * 0.7).map((e) => e.k)
  if (max <= 0.4) return { kind: 'tendenz', keys: leaders }
  if (max <= 0.6) return { kind: 'fokus', keys: leaders }
  return { kind: 'dominant', keys: leaders }
}

/** Human label for UI display. */
export function characterLabel(c: WBCharacter): string {
  if (c.kind === 'ausgewogen') return 'Ausgewogen'
  const label =
    c.kind === 'tendenz'
      ? 'Tendenz'
      : c.kind === 'fokus'
        ? 'Fokus'
        : 'Dominant'
  return label
}

/**
 * Check if a set of programmpunkte meets the WB-Schwerpunkt of the planung.
 *
 * Returns null when no schwerpunkt is set, otherwise a quality score 0..1
 * and whether the goal bereiche are actually emphasized.
 */
export function evaluateAgainstGoal(
  dist: WBDistribution,
  goalKeys: WBKey[],
  goalLevel: 'ausgewogen' | 'tendenz' | 'fokus' | 'dominant',
): { meetsGoal: boolean; actualChar: WBCharacter } {
  const actualChar = characterize(dist)
  if (goalLevel === 'ausgewogen') {
    return { meetsGoal: actualChar.kind === 'ausgewogen', actualChar }
  }
  if (actualChar.kind === 'ausgewogen') return { meetsGoal: false, actualChar }

  const levelOrder = ['tendenz', 'fokus', 'dominant'] as const
  const actualLevelIdx = levelOrder.indexOf(actualChar.kind)
  const goalLevelIdx = levelOrder.indexOf(goalLevel)
  const hasCorrectKeys = goalKeys.every((k) => actualChar.keys.includes(k))

  return {
    meetsGoal: hasCorrectKeys && actualLevelIdx >= goalLevelIdx,
    actualChar,
  }
}
