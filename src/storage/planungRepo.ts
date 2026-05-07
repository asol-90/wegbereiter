/**
 * Repository for Planungen. CRUD only — business rules live in domain/.
 */
import type { Planung } from '../domain/types'
import type { PlanungId } from '../domain/ids'
import { getDB } from './db'

export async function listPlanungen(): Promise<Planung[]> {
  const db = await getDB()
  return db.getAll('planungen')
}

export async function getPlanung(id: PlanungId): Promise<Planung | undefined> {
  const db = await getDB()
  return db.get('planungen', id as string)
}

export async function savePlanung(p: Planung): Promise<void> {
  const db = await getDB()
  const nextTimestamp = new Date().toISOString()
  await db.put('planungen', { ...p, aktualisiertAm: nextTimestamp })
}

/** Put without bumping aktualisiertAm — e.g., for bulk imports. */
export async function savePlanungAsIs(p: Planung): Promise<void> {
  const db = await getDB()
  await db.put('planungen', p)
}

export async function deletePlanung(id: PlanungId): Promise<void> {
  const db = await getDB()
  await db.delete('planungen', id as string)
}
