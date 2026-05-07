/**
 * Cascade algorithm for "Planung anpassen".
 *
 * When a Treffen is removed (or a set of new Treffen is inserted), Programmpunkte
 * and Andachts-Einheit-Zuweisungen need to be redistributed. The user can choose:
 *   - 'cascade': shift contents to the next non-fixed Treffen
 *   - 'delete': drop the contents entirely
 *
 * Fixierte Treffen (Treffen.fixiert === true) are skipped by the cascade —
 * their contents stay put. Contents that cannot find a landing spot end up
 * in the Überhang.
 */
import type {
  Planung,
  Programmpunkt,
  Treffen,
  UeberhangEintrag,
} from './types'
import type { TreffenId } from './ids'

export type CascadeInput =
  | { kind: 'remove'; treffenId: TreffenId; mode: 'cascade' | 'delete' }
  | {
      kind: 'insert'
      /** New Treffen (already placed at correct date) to insert before `beforeId`. */
      newTreffen: Treffen[]
      /** Insert just before this id; use null to append at the end. */
      beforeId: TreffenId | null
      /** 'shift' = push existing contents to later; 'empty' = insert empty slots. */
      mode: 'shift' | 'empty'
    }

export type CascadeResult = {
  treffen: Treffen[]
  ueberhang: UeberhangEintrag[]
}

/** Sort treffen by date then id to make indexing deterministic. */
function sortedByDate(t: Treffen[]): Treffen[] {
  return [...t].sort((a, b) =>
    a.datum === b.datum ? a.id.localeCompare(b.id) : a.datum.localeCompare(b.datum),
  )
}

/**
 * Take Programmpunkte that need to be redistributed and drop them into the
 * next free non-fixed treffen. If no slot is available, return them as Überhang.
 *
 * "Free" here means: dropping the Programmpunkte in keeps total duration ≤ verfügbar.
 * For the Kaskaden-Logik we cascade regardless of capacity — the user can then see
 * the over-budget state on the receiving treffen. If you want capacity-aware
 * distribution, use the Auto-verteilen flow, not this one.
 */
export function redistributeProgramm(
  treffen: Treffen[],
  startIdx: number,
  payload: Programmpunkt[],
  sourceTreffenId: TreffenId | null,
): CascadeResult {
  const ueberhang: UeberhangEintrag[] = []
  const out = treffen.map((t) => ({ ...t, programm: [...t.programm] }))

  // Find target: first non-fixed Treffen at or after startIdx.
  let targetIdx = -1
  for (let i = startIdx; i < out.length; i++) {
    if (!out[i].fixiert) {
      targetIdx = i
      break
    }
  }
  if (targetIdx === -1) {
    for (const pp of payload) {
      ueberhang.push({
        kind: 'programmpunkt',
        programmpunkt: pp,
        urspruenglichesTreffenId: sourceTreffenId,
        grund: 'Kein passender Termin verfügbar',
      })
    }
    return { treffen: out, ueberhang }
  }

  // Cascade: append payload → shift current tail onwards, non-fixed only.
  // Simpler semantics: payload appended to target; receiving treffen keeps
  // its content first, then new items come after. Fixed treffen are never
  // modified.
  out[targetIdx] = {
    ...out[targetIdx],
    programm: [...out[targetIdx].programm, ...payload],
  }
  return { treffen: out, ueberhang }
}

/** Remove a treffen, optionally cascading its contents. */
export function removeTreffen(
  planung: Planung,
  treffenId: TreffenId,
  mode: 'cascade' | 'delete',
): CascadeResult {
  const sorted = sortedByDate(planung.treffen)
  const idx = sorted.findIndex((t) => t.id === treffenId)
  if (idx === -1) return { treffen: sorted, ueberhang: [...planung.ueberhang] }

  const victim = sorted[idx]
  const remaining = sorted.filter((t) => t.id !== treffenId)

  if (mode === 'delete') {
    return { treffen: remaining, ueberhang: [...planung.ueberhang] }
  }

  // Cascade mode: push victim.programm onto the next non-fixed treffen.
  const { treffen, ueberhang } = redistributeProgramm(
    remaining,
    idx, // same index in `remaining` because we removed the victim
    victim.programm,
    victim.id,
  )
  return { treffen, ueberhang: [...planung.ueberhang, ...ueberhang] }
}

/**
 * Insert new Treffen. Two modes:
 * - 'shift': for each inserted slot, push the next non-fixed treffen's programm
 *   one step further. In the simplest contract, we leave existing treffen intact
 *   and simply insert empty new ones; the "shift" is only observable if the user
 *   manually moves contents. Future: implement actual content shifting.
 * - 'empty': just add empty slots.
 *
 * For the v0.3 scope, both modes currently behave the same (insert empty).
 * The cascade mode is provided for API symmetry and future extension.
 */
export function insertTreffen(
  planung: Planung,
  newOnes: Treffen[],
  beforeId: TreffenId | null,
  _mode: 'shift' | 'empty',
): CascadeResult {
  const sorted = sortedByDate(planung.treffen)
  if (beforeId === null) {
    return { treffen: sortedByDate([...sorted, ...newOnes]), ueberhang: [...planung.ueberhang] }
  }
  const idx = sorted.findIndex((t) => t.id === beforeId)
  if (idx === -1) {
    return { treffen: sortedByDate([...sorted, ...newOnes]), ueberhang: [...planung.ueberhang] }
  }
  const result = [...sorted.slice(0, idx), ...newOnes, ...sorted.slice(idx)]
  return { treffen: sortedByDate(result), ueberhang: [...planung.ueberhang] }
}
