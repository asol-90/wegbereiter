import {describe, expect, it} from 'vitest';
import type {StammAktionId, StammImportId, StammKontextId, StammTreffenId} from './ids';
import {checkOverlap, clipKontext, earliestDate, latestDate} from './stammOverlap';
import type {StammKontext} from './types';

function makeKontext(
  treffen: Array<{ id: string; datum: string; dauerMin: number }>,
  stammaktionen: Array<{ id: string; beginn: string; ende: string }> = [],
  overrides: Partial<StammKontext> = {},
): StammKontext {
  return {
    id: 'sk-test' as StammKontextId,
    stammImportId: 'si-test' as StammImportId,
    thema: 'Test',
    treffen: treffen.map((t) => ({
      id: t.id as StammTreffenId,
      datum: t.datum,
      dauerMin: t.dauerMin,
    })),
    stammaktionen: stammaktionen.map((a) => ({
      id: a.id as StammAktionId,
      titel: 'Aktion',
      beginn: a.beginn,
      ende: a.ende,
    })),
    distriktAktionen: [],
    regionalAktionen: [],
    defaultAnfangsBlock: [],
    defaultEndBlock: [],
    bearbeitetAm: '2026-04-01T00:00:00',
    importiertAm: '2026-04-01T00:00:00',
    importierteAktivitaetIds: [],
    ...overrides,
  }
}

describe('earliestDate / latestDate', () => {
  it('returns earliest treffen date', () => {
    const k = makeKontext([
      { id: 't2', datum: '2026-10-02', dauerMin: 90 },
      { id: 't1', datum: '2026-09-18', dauerMin: 90 },
    ])
    expect(earliestDate(k)).toBe('2026-09-18')
  })

  it('considers stammaktionen for latest', () => {
    const k = makeKontext(
      [{ id: 't1', datum: '2026-09-18', dauerMin: 90 }],
      [{ id: 'sa1', beginn: '2026-12-01', ende: '2026-12-05' }],
    )
    expect(latestDate(k)).toBe('2026-12-05')
  })

  it('returns undefined for empty kontext', () => {
    const k = makeKontext([], [])
    expect(earliestDate(k)).toBeUndefined()
    expect(latestDate(k)).toBeUndefined()
  })
})

describe('checkOverlap', () => {
  it('detects no overlap when old ends before new starts', () => {
    const old = makeKontext([{ id: 't1', datum: '2026-09-18', dauerMin: 90 }])
    const neu = makeKontext(
      [{ id: 't2', datum: '2026-11-01', dauerMin: 90 }],
      [],
      { id: 'sk-new' as StammKontextId },
    )
    expect(checkOverlap(old, neu)).toEqual({ kind: 'no-overlap' })
  })

  it('detects overlap when dates collide', () => {
    const old = makeKontext([
      { id: 't1', datum: '2026-09-18', dauerMin: 90 },
      { id: 't2', datum: '2026-10-16', dauerMin: 90 },
    ])
    const neu = makeKontext(
      [{ id: 't3', datum: '2026-10-10', dauerMin: 90 }],
      [],
      { id: 'sk-new' as StammKontextId },
    )
    const result = checkOverlap(old, neu)
    expect(result.kind).toBe('overlap')
    if (result.kind === 'overlap') {
      expect(result.overlapStart).toBe('2026-10-10')
      expect(result.oldLastDate).toBe('2026-10-16')
    }
  })

  it('detects overlap on exact same date', () => {
    const old = makeKontext([{ id: 't1', datum: '2026-10-02', dauerMin: 90 }])
    const neu = makeKontext(
      [{ id: 't2', datum: '2026-10-02', dauerMin: 90 }],
      [],
      { id: 'sk-new' as StammKontextId },
    )
    expect(checkOverlap(old, neu).kind).toBe('overlap')
  })
})

describe('clipKontext', () => {
  it('removes treffen on or after cutoff', () => {
    const k = makeKontext([
      { id: 't1', datum: '2026-09-18', dauerMin: 90 },
      { id: 't2', datum: '2026-10-02', dauerMin: 90 },
      { id: 't3', datum: '2026-10-16', dauerMin: 90 },
    ])
    const clipped = clipKontext(k, '2026-10-02')
    expect(clipped).toBeDefined()
    expect(clipped!.treffen).toHaveLength(1)
    expect(clipped!.treffen[0].datum).toBe('2026-09-18')
  })

  it('removes stammaktionen on or after cutoff', () => {
    const k = makeKontext(
      [{ id: 't1', datum: '2026-09-18', dauerMin: 90 }],
      [{ id: 'sa1', beginn: '2026-10-05', ende: '2026-10-08' }],
    )
    const clipped = clipKontext(k, '2026-10-01')
    expect(clipped!.stammaktionen).toHaveLength(0)
    expect(clipped!.treffen).toHaveLength(1)
  })

  it('returns undefined when nothing remains', () => {
    const k = makeKontext([{ id: 't1', datum: '2026-09-18', dauerMin: 90 }])
    const clipped = clipKontext(k, '2026-09-01')
    expect(clipped).toBeUndefined()
  })
})
