/**
 * useKontextDaten — resolves Andachtsreihen + Abzeichen for the Kontextleiste.
 *
 * Abzeichen: looked up from the in-memory ABZEICHEN_KATALOG first, then IDB.
 * Andachtsreihen: loaded from IndexedDB by ID.
 */
import {ABZEICHEN_KATALOG} from '@/domain/abzeichenKatalog'
import type {AbzeichenId} from '@/domain/ids'
import type {Abzeichen, Andachtsreihe, AndachtsreiheZuordnung} from '@/domain/types'
import {getAndachtsreihe} from '@/storage/repertoireRepo'
import {useEffect, useMemo, useState} from 'react'

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
  const safeZuordnungen = useMemo(() => zuordnungen ?? [], [zuordnungen])
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

  /* eslint-disable react-hooks/set-state-in-effect */
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
  /* eslint-enable react-hooks/set-state-in-effect */

  return { loaded, andachtsreihen: reihen, abzeichen }
}
