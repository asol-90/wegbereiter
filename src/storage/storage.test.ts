import { beforeEach, describe, expect, it } from 'vitest'
import { buildPlanung, defaultGlobalConfig } from '../domain/planungFactory'
import { getGlobalConfig, saveGlobalConfig } from './globalConfigRepo'
import { deletePlanung, getPlanung, listPlanungen, savePlanung } from './planungRepo'
import { listAktivitaeten, saveAktivitaet } from './repertoireRepo'
import type { Aktivitaet } from '../domain/types'
import type { AktivitaetId } from '../domain/ids'
import { getFerienCache, saveFerienCache } from './ferienRepo'
import { clearAllStores } from '../test/dbHelpers'

beforeEach(async () => {
  await clearAllStores()
})

describe('planungRepo', () => {
  it('save + list + get round-trip', async () => {
    const p = buildPlanung({
      zeitraum: { start: '2025-09-05', ende: '2025-09-26' },
      weekday: 'freitag',
      rhythmus: { kind: 'weekly' },
      dauerMinuten: 90,
      team: [],
    })
    await savePlanung(p)
    const all = await listPlanungen()
    expect(all.length).toBe(1)
    expect(all[0].id).toBe(p.id)
    const loaded = await getPlanung(p.id)
    expect(loaded?.treffen.length).toBe(4)
  })

  it('updates aktualisiertAm on save', async () => {
    const p = buildPlanung({
      zeitraum: { start: '2025-09-05', ende: '2025-09-12' },
      weekday: 'freitag',
      rhythmus: { kind: 'weekly' },
      dauerMinuten: 90,
      team: [],
    })
    const original = p.aktualisiertAm
    await new Promise((r) => setTimeout(r, 2))
    await savePlanung(p)
    const loaded = await getPlanung(p.id)
    expect(loaded?.aktualisiertAm).not.toBe(original)
  })

  it('delete removes the planung', async () => {
    const p = buildPlanung({
      zeitraum: { start: '2025-09-05', ende: '2025-09-12' },
      weekday: 'freitag',
      rhythmus: { kind: 'weekly' },
      dauerMinuten: 90,
      team: [],
    })
    await savePlanung(p)
    await deletePlanung(p.id)
    expect(await listPlanungen()).toEqual([])
  })
})

describe('globalConfigRepo', () => {
  it('returns default when empty', async () => {
    const cfg = await getGlobalConfig()
    expect(cfg).toEqual(defaultGlobalConfig())
  })
  it('persists changes', async () => {
    await saveGlobalConfig({ ...defaultGlobalConfig(), bundesland: 'TH' })
    const cfg = await getGlobalConfig()
    expect(cfg.bundesland).toBe('TH')
  })
})

describe('repertoireRepo aktivitäten', () => {
  it('round-trips activities', async () => {
    const a: Aktivitaet = {
      id: 'akt-1' as AktivitaetId,
      name: 'Taschenlampen-Spiel',
      typ: 'spiel-sport',
      wbTags: [{ key: 'koerperlich', intensity: 1 }],
      themenTags: ['Licht'],
      zeitMin: 20,
      zeitMax: 40,
      quelle: 'eigene',
    }
    await saveAktivitaet(a)
    const all = await listAktivitaeten()
    expect(all.length).toBe(1)
    expect(all[0].name).toBe('Taschenlampen-Spiel')
  })
})

describe('ferienRepo', () => {
  it('round-trips a cache entry', async () => {
    await saveFerienCache({
      bundesland: 'TH',
      jahr: 2025,
      feiertage: [],
      ferien: [],
      abgerufenAm: new Date().toISOString(),
    })
    const loaded = await getFerienCache('TH', 2025)
    expect(loaded?.bundesland).toBe('TH')
    expect(loaded?.jahr).toBe(2025)
  })
})
