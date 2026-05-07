/**
 * Test utilities for the IndexedDB layer.
 * Avoids deleteDatabase() (which blocks while connections stay open)
 * by clearing each store instead.
 */
import { getDB } from '../storage/db'

export async function clearAllStores(): Promise<void> {
  const db = await getDB()
  const names = [
    'planungen',
    'aktivitaeten',
    'andachtsreihen',
    'abzeichen',
    'globalConfig',
    'ferienCache',
    'stammKontexte',
  ] as const
  await Promise.all(names.map((n) => db.clear(n)))
}
