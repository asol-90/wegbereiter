/**
 * Pure helpers for Kontextleiste.
 */
import type { Abzeichen, Planung } from '@/domain/types'

export function countAndachtsZuweisungen(planung: Planung): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const t of planung.treffen) {
    for (const pp of t.programm) {
      if (!pp.andachtsEinheitId) continue
      const key = pp.andachtsEinheitId as string
      const list = map.get(key) ?? []
      list.push(t.datum)
      map.set(key, list)
    }
  }
  return map
}

export function countAbzeichenZuweisungen(
  abz: Abzeichen, planung: Planung,
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const t of planung.treffen) {
    for (const pp of t.programm) {
      if (pp.kind === 'wegezeit') continue
      for (const anf of abz.anforderungen) {
        if (pp.typ !== anf.typ) continue
        if (anf.untertyp != null && pp.untertyp !== anf.untertyp) continue
        const key = anf.id as string
        const list = map.get(key) ?? []
        list.push(t.datum)
        map.set(key, list)
      }
    }
  }
  return map
}
