import {beforeEach, describe, expect, it, vi} from 'vitest'
import {getFerienCache, saveFerienCache} from '../storage/ferienRepo'
import {clearAllStores} from '../test/dbHelpers'
import {FerienService, isFeiertag, isInFerien} from './ferienService'

beforeEach(async () => {
  await clearAllStores()
})

describe('FerienService', () => {
  it('returns cache hit within TTL without calling fetch', async () => {
    const fetcher = vi.fn()
    // Seed cache
    await saveFerienCache({
      bundesland: 'TH',
      jahr: 2025,
      feiertage: [{ datum: '2025-01-01', name: 'Neujahr', bundesweit: true }],
      ferien: [],
      abgerufenAm: new Date().toISOString(),
    })
    const svc = new FerienService({ fetch: fetcher })
    const entry = await svc.getForYear('TH', 2025)
    expect(entry.feiertage.length).toBe(1)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('fetches + caches when no entry exists', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      feiertage: [{ datum: '2025-05-01', name: 'Tag der Arbeit', bundesweit: true }],
      ferien: [{ name: 'sommerferien', start: '2025-07-01', ende: '2025-08-15' }],
    })
    const svc = new FerienService({ fetch: fetcher })
    const entry = await svc.getForYear('TH', 2025)
    expect(fetcher).toHaveBeenCalledOnce()
    expect(entry.feiertage[0].name).toBe('Tag der Arbeit')
    // Cached?
    const cached = await getFerienCache('TH', 2025)
    expect(cached?.feiertage[0].name).toBe('Tag der Arbeit')
  })

  it('falls back to stale cache on fetch error', async () => {
    const stale = {
      bundesland: 'TH' as const,
      jahr: 2025,
      feiertage: [{ datum: '2025-01-01', name: 'Neujahr', bundesweit: true }],
      ferien: [],
      abgerufenAm: new Date(Date.now() - 1000 * 60 * 60 * 24 * 60).toISOString(), // 60d old
    }
    await saveFerienCache(stale)
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'))
    const svc = new FerienService({ fetch: fetcher, ttlMs: 1 })
    const entry = await svc.getForYear('TH', 2025)
    expect(entry.feiertage[0].name).toBe('Neujahr')
  })

  it('throws when no cache and fetch fails', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('offline'))
    const svc = new FerienService({ fetch: fetcher })
    await expect(svc.getForYear('TH', 2025)).rejects.toThrow('offline')
  })
})

describe('isFeiertag / isInFerien', () => {
  const entry = {
    bundesland: 'TH' as const,
    jahr: 2025,
    feiertage: [{ datum: '2025-05-01', name: 'Tag der Arbeit', bundesweit: true }],
    ferien: [{ name: 'herbstferien', start: '2025-10-06', ende: '2025-10-18' }],
    abgerufenAm: new Date().toISOString(),
  }
  it('matches a feiertag', () => {
    expect(isFeiertag(entry, '2025-05-01')?.name).toBe('Tag der Arbeit')
    expect(isFeiertag(entry, '2025-05-02')).toBeUndefined()
  })
  it('matches inside ferien range', () => {
    expect(isInFerien(entry, '2025-10-06')?.name).toBe('herbstferien')
    expect(isInFerien(entry, '2025-10-18')?.name).toBe('herbstferien')
    expect(isInFerien(entry, '2025-10-05')).toBeUndefined()
    expect(isInFerien(entry, '2025-10-19')).toBeUndefined()
  })
})
