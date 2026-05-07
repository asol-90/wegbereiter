/**
 * Repository for the Repertoire: Aktivitäten, Andachtsreihen, Abzeichen.
 */
import type {
  Abzeichen,
  Aktivitaet,
  Andachtsreihe,
} from '../domain/types'
import type {
  AbzeichenId,
  AktivitaetId,
  AndachtsreiheId,
} from '../domain/ids'
import { getDB } from './db'

// ─── Aktivitäten ─────────────────────────────────────────────────────────────

export async function listAktivitaeten(): Promise<Aktivitaet[]> {
  const db = await getDB()
  return db.getAll('aktivitaeten')
}

export async function getAktivitaet(id: AktivitaetId): Promise<Aktivitaet | undefined> {
  const db = await getDB()
  return db.get('aktivitaeten', id as string)
}

export async function saveAktivitaet(a: Aktivitaet): Promise<void> {
  const db = await getDB()
  await db.put('aktivitaeten', a)
}

export async function deleteAktivitaet(id: AktivitaetId): Promise<void> {
  const db = await getDB()
  await db.delete('aktivitaeten', id as string)
}

// ─── Andachtsreihen ──────────────────────────────────────────────────────────

export async function listAndachtsreihen(): Promise<Andachtsreihe[]> {
  const db = await getDB()
  return db.getAll('andachtsreihen')
}

export async function getAndachtsreihe(
  id: AndachtsreiheId,
): Promise<Andachtsreihe | undefined> {
  const db = await getDB()
  return db.get('andachtsreihen', id as string)
}

export async function saveAndachtsreihe(r: Andachtsreihe): Promise<void> {
  const db = await getDB()
  await db.put('andachtsreihen', r)
}

export async function deleteAndachtsreihe(id: AndachtsreiheId): Promise<void> {
  const db = await getDB()
  await db.delete('andachtsreihen', id as string)
}

// ─── Abzeichen ───────────────────────────────────────────────────────────────

export async function listAbzeichen(): Promise<Abzeichen[]> {
  const db = await getDB()
  return db.getAll('abzeichen')
}

export async function saveAbzeichen(a: Abzeichen): Promise<void> {
  const db = await getDB()
  await db.put('abzeichen', a)
}

export async function deleteAbzeichen(id: AbzeichenId): Promise<void> {
  const db = await getDB()
  await db.delete('abzeichen', id as string)
}
