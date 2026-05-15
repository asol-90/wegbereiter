/**
 * IndexedDB schema + singleton connection.
 *
 * Stores:
 * - planungen:      key = id (string)
 * - aktivitaeten:   key = id
 * - andachtsreihen: key = id
 * - abzeichen:      key = id
 * - globalConfig:   key = 'singleton'
 * - ferienCache:    key = `${bundesland}-${jahr}`
 */
import {type DBSchema, type IDBPDatabase, openDB} from 'idb'
import type {
    Abzeichen,
    Aktivitaet,
    Andachtsreihe,
    BundeslandKey,
    FerienCacheEntry,
    GlobalConfig,
    Planung,
    StammKontext,
} from '../domain/types'

export const DB_NAME = 'stammtreff-planer'
export const DB_VERSION = 2

export interface StammtreffDB extends DBSchema {
  stammKontexte: {
    key: string
    value: StammKontext
  }
  planungen: {
    key: string
    value: Planung
    indexes: { 'by-status': string }
  }
  aktivitaeten: {
    key: string
    value: Aktivitaet
    indexes: { 'by-quelle': string; 'by-typ': string }
  }
  andachtsreihen: {
    key: string
    value: Andachtsreihe
    indexes: { 'by-quelle': string }
  }
  abzeichen: {
    key: string
    value: Abzeichen
    indexes: { 'by-quelle': string }
  }
  globalConfig: {
    key: string
    value: GlobalConfig
  }
  ferienCache: {
    key: string
    value: FerienCacheEntry
  }
}

let dbPromise: Promise<IDBPDatabase<StammtreffDB>> | null = null

export function getDB(): Promise<IDBPDatabase<StammtreffDB>> {
  if (!dbPromise) {
    dbPromise = openDB<StammtreffDB>(DB_NAME, DB_VERSION, {
      upgrade(db, oldVersion) {
        if (oldVersion < 1) {
          const planStore = db.createObjectStore('planungen', { keyPath: 'id' })
          planStore.createIndex('by-status', 'status')

          const aktStore = db.createObjectStore('aktivitaeten', { keyPath: 'id' })
          aktStore.createIndex('by-quelle', 'quelle')
          aktStore.createIndex('by-typ', 'typ')

          const reiheStore = db.createObjectStore('andachtsreihen', { keyPath: 'id' })
          reiheStore.createIndex('by-quelle', 'quelle')

          const abzStore = db.createObjectStore('abzeichen', { keyPath: 'id' })
          abzStore.createIndex('by-quelle', 'quelle')

          db.createObjectStore('globalConfig')
          db.createObjectStore('ferienCache')
        }
        if (oldVersion < 2) {
          db.createObjectStore('stammKontexte', { keyPath: 'id' })
        }
      },
    })
  }
  return dbPromise
}

/** Test helper — resets the singleton so tests see a fresh DB per run. */
export function __resetDB() {
  dbPromise = null
}

/** Helper to build the deterministic ferienCache key. */
export function ferienCacheKey(bundesland: BundeslandKey, jahr: number): string {
  return `${bundesland}-${jahr}`
}
