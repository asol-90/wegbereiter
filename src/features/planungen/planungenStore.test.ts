import type {CreatePlanungInput} from '@/domain/planungFactory'
import {listPlanungen} from '@/storage/planungRepo'
import {clearAllStores} from '@/test/dbHelpers'
import {afterEach, beforeEach, describe, expect, it} from 'vitest'
import {PlanungenStore} from './planungenStore'

function makeInput(start: string, ende: string): CreatePlanungInput {
  return {
    zeitraum: { start, ende },
    weekday: 'freitag',
    rhythmus: { kind: 'weekly' },
    dauerMinuten: 90,
    team: [],
  }
}

describe('PlanungenStore', () => {
  let store: PlanungenStore

  beforeEach(async () => {
    await clearAllStores()
    store = new PlanungenStore()
  })

  afterEach(async () => {
    await clearAllStores()
  })

  it('starts empty and unloaded before init()', () => {
    const s = store.getSnapshot()
    expect(s.loaded).toBe(false)
    expect(s.planungen).toHaveLength(0)
  })

  it('init() loads existing Planungen from IndexedDB', async () => {
    await store.init()
    await store.create(makeInput('2025-09-05', '2025-12-19'))

    // Fresh store simulating an app reload.
    const fresh = new PlanungenStore()
    await fresh.init()
    expect(fresh.getSnapshot().loaded).toBe(true)
    expect(fresh.getSnapshot().planungen).toHaveLength(1)
  })

  it('create() persists and updates snapshot', async () => {
    await store.init()
    const p = await store.create(makeInput('2025-09-05', '2025-12-19'))
    expect(store.getSnapshot().planungen).toHaveLength(1)
    expect(store.getSnapshot().planungen[0].id).toBe(p.id)
    const fromDb = await listPlanungen()
    expect(fromDb).toHaveLength(1)
  })

  it('update() replaces existing entry by id', async () => {
    await store.init()
    const p = await store.create(makeInput('2025-09-05', '2025-12-19'))
    const renamed = { ...p, name: 'Mein Experiment' }
    await store.update(renamed)
    expect(store.getSnapshot().planungen).toHaveLength(1)
    expect(store.getSnapshot().planungen[0].name).toBe('Mein Experiment')
  })

  it('remove() drops the entry from snapshot and DB', async () => {
    await store.init()
    const p = await store.create(makeInput('2025-09-05', '2025-12-19'))
    await store.remove(p.id)
    expect(store.getSnapshot().planungen).toHaveLength(0)
    expect(await listPlanungen()).toHaveLength(0)
  })

  it('sorts Planungen by zeitraum.start descending', async () => {
    await store.init()
    await store.create(makeInput('2025-01-10', '2025-04-25'))
    await store.create(makeInput('2026-01-16', '2026-04-24'))
    await store.create(makeInput('2025-09-05', '2025-12-19'))
    expect(store.getSnapshot().planungen.map((p) => p.zeitraum.start)).toEqual([
      '2026-01-16',
      '2025-09-05',
      '2025-01-10',
    ])
  })

  it('notifies subscribers on state change', async () => {
    await store.init()
    let calls = 0
    const unsubscribe = store.subscribe(() => {
      calls += 1
    })
    const callsBefore = calls
    await store.create(makeInput('2025-09-05', '2025-12-19'))
    expect(calls).toBeGreaterThan(callsBefore)
    unsubscribe()
    const callsAfterUnsub = calls
    await store.create(makeInput('2026-01-16', '2026-04-24'))
    expect(calls).toBe(callsAfterUnsub)
  })
})
