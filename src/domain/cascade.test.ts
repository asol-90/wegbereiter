import {describe, expect, it} from 'vitest'
import {insertTreffen, redistributeProgramm, removeTreffen} from './cascade'
import type {PlanungId, ProgrammpunktId, TreffenId} from './ids'
import type {Planung, Programmpunkt, Treffen} from './types'

const pp = (id: string, dauer = 10): Programmpunkt => ({
  id: id as ProgrammpunktId,
  kind: 'abstrakt',
  name: id,
  typ: 'sonstiges',
  wbTags: [],
  dauerMin: dauer,
} as Programmpunkt)

const treffen = (
  id: string,
  datum: string,
  programm: Programmpunkt[] = [],
  fixiert = false,
): Treffen => ({
  id: id as TreffenId,
  kind: 'regulaer',
  datum,
  programm,
  fixiert,
  sollWB: [],
})

const planung = (treffenList: Treffen[]): Planung => ({
  id: 'pl' as PlanungId,
  name: 'Test',
  zeitraum: { start: '2025-09-01', ende: '2025-12-20' },
  weekday: 'freitag',
  rhythmus: { kind: 'weekly' },
  dauerMinuten: 90,
  team: [],
  abwesenheiten: [],
  treffen: treffenList,
  ueberhang: [],
  andachtsreihenZuordnung: [],
  abzeichenAuswahl: [],
  stammOptOuts: [],
  status: 'entwurf',
  zeitbalkenSchwelle: 0.8,
  erstelltAm: '2025-08-01T00:00:00.000Z',
  aktualisiertAm: '2025-08-01T00:00:00.000Z',
})

describe('removeTreffen', () => {
  it('delete-mode drops contents without überhang', () => {
    const p = planung([
      treffen('a', '2025-09-05', [pp('pp-1')]),
      treffen('b', '2025-09-12'),
    ])
    const result = removeTreffen(p, 'a' as TreffenId, 'delete')
    expect(result.treffen.map((t) => t.id)).toEqual(['b'])
    expect(result.ueberhang).toEqual([])
  })

  it('cascade-mode moves contents to next non-fixed treffen', () => {
    const p = planung([
      treffen('a', '2025-09-05', [pp('pp-1')]),
      treffen('b', '2025-09-12'),
      treffen('c', '2025-09-19'),
    ])
    const result = removeTreffen(p, 'a' as TreffenId, 'cascade')
    expect(result.treffen.map((t) => t.id)).toEqual(['b', 'c'])
    expect(result.treffen[0].programm.map((pp) => pp.id)).toEqual(['pp-1'])
    expect(result.ueberhang).toEqual([])
  })

  it('cascade skips fixed treffen', () => {
    const p = planung([
      treffen('a', '2025-09-05', [pp('pp-1')]),
      treffen('b', '2025-09-12', [], true), // fixiert
      treffen('c', '2025-09-19'),
    ])
    const result = removeTreffen(p, 'a' as TreffenId, 'cascade')
    expect(result.treffen.find((t) => t.id === 'b')?.programm).toEqual([])
    expect(result.treffen.find((t) => t.id === 'c')?.programm.map((p) => p.id)).toEqual([
      'pp-1',
    ])
  })

  it('cascade lands in Überhang when no slot left', () => {
    const p = planung([
      treffen('a', '2025-09-05', [pp('pp-1')]),
      treffen('b', '2025-09-12', [], true), // fixiert, only remaining
    ])
    const result = removeTreffen(p, 'a' as TreffenId, 'cascade')
    expect(result.ueberhang.length).toBe(1)
    expect(result.ueberhang[0]).toMatchObject({
      kind: 'programmpunkt',
      grund: expect.stringContaining('Kein passender Termin'),
    })
  })
})

describe('insertTreffen', () => {
  it('inserts before given id', () => {
    const p = planung([treffen('a', '2025-09-05'), treffen('c', '2025-09-19')])
    const newOne = treffen('b', '2025-09-12')
    const res = insertTreffen(p, [newOne], 'c' as TreffenId, 'empty')
    expect(res.treffen.map((t) => t.id)).toEqual(['a', 'b', 'c'])
  })

  it('appends when beforeId is null', () => {
    const p = planung([treffen('a', '2025-09-05')])
    const newOne = treffen('b', '2025-09-12')
    const res = insertTreffen(p, [newOne], null, 'empty')
    expect(res.treffen.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('still sorts by date', () => {
    const p = planung([treffen('c', '2025-09-19'), treffen('a', '2025-09-05')])
    const res = insertTreffen(p, [treffen('b', '2025-09-12')], null, 'empty')
    expect(res.treffen.map((t) => t.datum)).toEqual([
      '2025-09-05',
      '2025-09-12',
      '2025-09-19',
    ])
  })
})

describe('redistributeProgramm', () => {
  it('drops into Überhang when no non-fixed slot available', () => {
    const t = [treffen('a', '2025-09-05', [], true)]
    const res = redistributeProgramm(t, 0, [pp('pp-1')], 'src' as TreffenId)
    expect(res.ueberhang.length).toBe(1)
  })
})
