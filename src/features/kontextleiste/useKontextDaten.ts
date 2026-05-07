/**
 * useKontextDaten — resolves Andachtsreihen + Abzeichen for the Kontextleiste.
 *
 * Abzeichen: looked up from the in-memory ABZEICHEN_KATALOG first, then IDB.
 * Andachtsreihen: loaded from IndexedDB by ID.
 */
import { useState, useEffect, useMemo } from 'react'
import type { Andachtsreihe, Abzeichen, AndachtsreiheZuordnung } from '@/domain/types'
import type { AbzeichenId } from '@/domain/ids'
import { ABZEICHEN_KATALOG } from '@/domain/abzeichenKatalog'
import {
  getAndachtsreihe,
  listAbzeichen,
} from '@/storage/repertoireRepo'

export type KontextDaten = {
  loaded: boolean
  andachtsreihen: Andachtsreihe[]
  abzeichen: Abzeichen[]
}

/**
 * Resolve Andachtsreihen by Zuordnung (from IDB) and Abzeichen by IDs
 * (from ABZEICHEN_KATALOG first, then IDB as fallback).
 */
export function useKontextDaten(
  zuordnungen: readonly AndachtsreiheZuordnung[] | undefined,
  abzeichenIds: readonly AbzeichenId[],
): KontextDaten {
  // Defensiv: zuordnungen kann bei Legacy-Planungen undefined sein
  const safeZuordnungen = zuordnungen ?? []
  // ── Abzeichen: resolve synchronously from Katalog ──
  const abzeichen = useMemo(() => {
    if (abzeichenIds.length === 0) return []
    const idSet = new Set<string>(abzeichenIds as string[])
    // First: check the built-in catalogue
    const found = ABZEICHEN_KATALOG.filter((a) => idSet.has(a.id as string))
    return found
  }, [abzeichenIds])

  // ── Andachtsreihen: load from IndexedDB ──
  const [reihen, setReihen] = useState<Andachtsreihe[]>([])
  const [loaded, setLoaded] = useState(safeZuordnungen.length === 0)

  useEffect(() => {
    if (safeZuordnungen.length === 0) {
      setReihen([])
      setLoaded(true)
      return
    }

    let cancelled = false

    async function load() {
      const results = await Promise.all(
        safeZuordnungen.map((z) => getAndachtsreihe(z.reiheId)),
      )
      if (cancelled) return
      setReihen(results.filter((r): r is Andachtsreihe => r != null))
      setLoaded(true)
    }

    load()
    return () => { cancelled = true }
  }, [safeZuordnungen])

  return { loaded, andachtsreihen: reihen, abzeichen }
}
