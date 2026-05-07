/**
 * Seed the Repertoire with starter activities on first run.
 *
 * Idempotent: checks if any 'vorinstalliert' activities exist.
 * If the user deletes all preinstalled activities, they won't come back.
 */
import { listAktivitaeten, saveAktivitaet } from '@/storage/repertoireRepo'
import { createStarterKatalog } from './starterKatalog'
import { repertoireStore } from '@/features/repertoire/repertoireStore'

let seeded = false

export async function seedRepertoireIfEmpty(): Promise<void> {
  if (seeded) return
  seeded = true

  const existing = await listAktivitaeten()
  const hasVorinstalliert = existing.some((a) => a.quelle === 'vorinstalliert')
  if (hasVorinstalliert || existing.length > 0) return

  const starter = createStarterKatalog()
  for (const a of starter) {
    await saveAktivitaet(a)
  }
  // Notify the in-memory store so UI sees the seeded data
  await repertoireStore.reload()
}
