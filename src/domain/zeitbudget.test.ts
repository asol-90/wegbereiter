import { describe, expect, it } from 'vitest'
import type { Planung, Programmpunkt, StammKontext, StammTreffen, Treffen } from './types'
import type { PlanungId, ProgrammpunktId, StammKontextId, StammImportId, StammTreffenId, TreffenId } from './ids'
import { stammAbzugFuerTreffen, zeitbudgetFuerTreffen, zeitbudgetStatus } from './zeitbudget'

const makePlanung = (partial: Partial<Planung> = {}): Planung => ({
  id: 'pl-1' as PlanungId,
  name: 'Test',
  zeitraum: { start: '2025-09-01', ende: '2025-12-20' },
  weekday: 'freitag',
  rhythmus: { kind: 'weekly' },
  dauerMinuten: 90,
  team: [],
  abwesenheiten: [],
  treffen: [],
  ueberhang: [],
  andachtsreihenZuordnung: [],
  abzeichenAuswahl: [],
  stammOptOuts: [],
  status: 'entwurf',
  zeitbalkenSchwelle: 0.8,
  erstelltAm: '2025-08-01T00:00:00.000Z',
  aktualisiertAm: '2025-08-01T00:00:00.000Z',
  ...partial,
})

const makeTreffen = (programm: Programmpunkt[] = [], partial: Partial<Treffen> = {}): Treffen => ({
  id: 't-1' as TreffenId,
  kind: 'regulaer',
  datum: '2025-09-05',
  programm,
  fixiert: false,
  sollWB: [],
  ...partial,
})

const pp = (dauerMin: number, id = 'pp'): Programmpunkt => ({
  id: id as ProgrammpunktId,
  kind: 'abstrakt',
  name: 'Pp',
  typ: 'sonstiges',
  wbTags: [],
  dauerMin,
} as Programmpunkt)

describe('zeitbudgetFuerTreffen', () => {
  it('computes brutto/verfügbar/ist without stamm', () => {
    const p = makePlanung()
    const t = makeTreffen([pp(30, 'a'), pp(20, 'b')])
    const info = zeitbudgetFuerTreffen(p, t)
    expect(info.bruttoMin).toBe(90)
    expect(info.stammAbzugMin).toBe(0)
    expect(info.verfuegbarMin).toBe(90)
    expect(info.istMin).toBe(50)
    expect(info.ueberbudget).toBe(false)
    expect(info.auslastung).toBeCloseTo(50 / 90)
  })

  it('subtracts stamm-block durations from verfügbar', () => {
    const kontext: StammKontext = {
      id: 'sk-1' as StammKontextId,
      stammImportId: 'si' as StammImportId,
      thema: 'X',
      themenTag: undefined,
      treffen: [],
      stammaktionen: [],
      defaultAnfangsBlock: [{ name: 'Stammrunde', typ: 'sonstiges', dauerMin: 15 }],
      defaultEndBlock: [{ name: 'Stammrunde', typ: 'sonstiges', dauerMin: 10 }],
      bearbeitetAm: '2025-08-01T00:00:00.000Z',
      importiertAm: '2025-08-01T00:00:00.000Z',
      importierteAktivitaetIds: [],
    }
    const st: StammTreffen = {
      id: 'st-1' as StammTreffenId,
      datum: '2025-09-05',
      dauerMin: 90,
    }
    const p = makePlanung()
    const t = makeTreffen([pp(40, 'a')])
    const info = zeitbudgetFuerTreffen(p, t, st, kontext)
    expect(info.stammAbzugMin).toBe(25) // 15 + 10
    expect(info.verfuegbarMin).toBe(65) // 90 - 25
    expect(info.auslastung).toBeCloseTo(40 / 65)
  })

  it('uses per-meeting block overrides', () => {
    const kontext: StammKontext = {
      id: 'sk-1' as StammKontextId,
      stammImportId: 'si' as StammImportId,
      thema: 'X',
      themenTag: undefined,
      treffen: [],
      stammaktionen: [],
      defaultAnfangsBlock: [{ name: 'Stammrunde', typ: 'sonstiges', dauerMin: 15 }],
      defaultEndBlock: [{ name: 'Stammrunde', typ: 'sonstiges', dauerMin: 10 }],
      bearbeitetAm: '2025-08-01T00:00:00.000Z',
      importiertAm: '2025-08-01T00:00:00.000Z',
      importierteAktivitaetIds: [],
    }
    const st: StammTreffen = {
      id: 'st-2' as StammTreffenId,
      datum: '2025-09-12',
      dauerMin: 90,
      endBlock: [], // no closing block today
    }
    const abzug = stammAbzugFuerTreffen(st, kontext)
    expect(abzug).toBe(15) // only opening block
  })

  it('flags over-budget', () => {
    const p = makePlanung({ dauerMinuten: 60 })
    const t = makeTreffen([pp(45, 'a'), pp(30, 'b')])
    const info = zeitbudgetFuerTreffen(p, t)
    expect(info.ueberbudget).toBe(true)
  })

  it('extra-aktion has zero verfügbar', () => {
    const p = makePlanung()
    const t = makeTreffen([pp(30)], { kind: 'extra-aktion' })
    const info = zeitbudgetFuerTreffen(p, t)
    expect(info.verfuegbarMin).toBe(0)
    expect(info.bruttoMin).toBe(0)
  })
})

describe('zeitbudgetStatus', () => {
  const mkInfo = (auslastung: number, ueberbudget = false) => ({
    bruttoMin: 90,
    stammAbzugMin: 0,
    verfuegbarMin: 90,
    istMin: 0,
    auslastung,
    ueberbudget,
  })

  it('green when at or above schwelle', () => {
    expect(zeitbudgetStatus(mkInfo(0.8), 0.8)).toBe('green')
    expect(zeitbudgetStatus(mkInfo(0.9), 0.8)).toBe('green')
  })
  it('neutral below schwelle', () => {
    expect(zeitbudgetStatus(mkInfo(0.5), 0.8)).toBe('neutral')
  })
  it('over trumps everything', () => {
    expect(zeitbudgetStatus(mkInfo(1.2, true), 0.8)).toBe('over')
  })
})
