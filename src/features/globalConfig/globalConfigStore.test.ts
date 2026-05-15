import {getGlobalConfig} from '@/storage/globalConfigRepo'
import {clearAllStores} from '@/test/dbHelpers'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {GlobalConfigStore} from './globalConfigStore'

describe('GlobalConfigStore', () => {
  let store: GlobalConfigStore

  beforeEach(async () => {
    await clearAllStores()
    store = new GlobalConfigStore()
  })

  afterEach(async () => {
    await clearAllStores()
  })

  it('starts with defaults and loaded=false before init()', () => {
    const s = store.getSnapshot()
    expect(s.loaded).toBe(false)
    expect(s.config.bundesland).toBeNull()
    expect(s.config.defaultWeekday).toBe('freitag')
    expect(s.config.defaultDauerMinuten).toBe(90)
  })

  it('init() loads persisted config from IndexedDB', async () => {
    await store.init()
    await store.patch({ bundesland: 'NI' })

    // Fresh store simulating an app reload.
    const fresh = new GlobalConfigStore()
    await fresh.init()
    expect(fresh.getSnapshot().loaded).toBe(true)
    expect(fresh.getSnapshot().config.bundesland).toBe('NI')
  })

  it('save() persists the full config and updates snapshot', async () => {
    await store.init()
    await store.save({
      bundesland: 'BW',
      defaultWeekday: 'montag',
      defaultRhythmus: { kind: 'biweekly' },
      defaultDauerMinuten: 120,
      lastActivePlanungId: null,
    })
    expect(store.getSnapshot().config.bundesland).toBe('BW')
    expect(store.getSnapshot().config.defaultWeekday).toBe('montag')
    const fromDb = await getGlobalConfig()
    expect(fromDb.bundesland).toBe('BW')
    expect(fromDb.defaultDauerMinuten).toBe(120)
  })

  it('patch() merges shallowly into the current config', async () => {
    await store.init()
    await store.patch({ bundesland: 'NI', defaultDauerMinuten: 75 })
    const snap = store.getSnapshot().config
    expect(snap.bundesland).toBe('NI')
    expect(snap.defaultDauerMinuten).toBe(75)
    // unrelated fields stay at their defaults
    expect(snap.defaultWeekday).toBe('freitag')
  })

  it('notifies subscribers on save()', async () => {
    await store.init()
    let calls = 0
    const unsubscribe = store.subscribe(() => {
      calls += 1
    })
    const callsBefore = calls
    await store.patch({ bundesland: 'HH' })
    expect(calls).toBeGreaterThan(callsBefore)
    unsubscribe()
    const callsAfterUnsub = calls
    await store.patch({ bundesland: 'BE' })
    expect(calls).toBe(callsAfterUnsub)
  })

  it('getSnapshot() returns a frozen, reference-stable object', async () => {
    await store.init()
    const a = store.getSnapshot()
    const b = store.getSnapshot()
    expect(a).toBe(b)
    expect(Object.isFrozen(a)).toBe(true)
    expect(Object.isFrozen(a.config)).toBe(true)
  })
})
