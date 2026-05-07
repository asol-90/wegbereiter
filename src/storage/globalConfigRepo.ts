/**
 * Repository for the single GlobalConfig singleton.
 */
import type { GlobalConfig } from '../domain/types'
import { defaultGlobalConfig } from '../domain/planungFactory'
import { getDB } from './db'

const KEY = 'singleton'

export async function getGlobalConfig(): Promise<GlobalConfig> {
  const db = await getDB()
  const cfg = await db.get('globalConfig', KEY)
  return cfg ?? defaultGlobalConfig()
}

export async function saveGlobalConfig(cfg: GlobalConfig): Promise<void> {
  const db = await getDB()
  await db.put('globalConfig', cfg, KEY)
}
