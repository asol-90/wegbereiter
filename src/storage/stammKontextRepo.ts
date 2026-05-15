/**
 * Repository for StammKontexte. CRUD only — business rules live in domain/.
 */
import type {StammKontextId} from '../domain/ids'
import type {StammKontext} from '../domain/types'
import {getDB} from './db'

export async function listStammKontexte(): Promise<StammKontext[]> {
  const db = await getDB()
  return db.getAll('stammKontexte')
}

export async function getStammKontext(id: StammKontextId): Promise<StammKontext | undefined> {
  const db = await getDB()
  return db.get('stammKontexte', id as string)
}

export async function saveStammKontext(k: StammKontext): Promise<void> {
  const db = await getDB()
  await db.put('stammKontexte', k)
}

export async function deleteStammKontext(id: StammKontextId): Promise<void> {
  const db = await getDB()
  await db.delete('stammKontexte', id as string)
}
