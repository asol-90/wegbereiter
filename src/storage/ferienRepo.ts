/**
 * Cache store for Ferien/Feiertage per (bundesland, jahr).
 */
import type {BundeslandKey, FerienCacheEntry} from '../domain/types'
import {ferienCacheKey, getDB} from './db'

export async function getFerienCache(
  bundesland: BundeslandKey,
  jahr: number,
): Promise<FerienCacheEntry | undefined> {
  const db = await getDB()
  return db.get('ferienCache', ferienCacheKey(bundesland, jahr))
}

export async function saveFerienCache(entry: FerienCacheEntry): Promise<void> {
  const db = await getDB()
  await db.put('ferienCache', entry, ferienCacheKey(entry.bundesland, entry.jahr))
}

export async function clearFerienCache(): Promise<void> {
  const db = await getDB()
  await db.clear('ferienCache')
}
