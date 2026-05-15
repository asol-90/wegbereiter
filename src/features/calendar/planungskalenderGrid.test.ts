import type {TreffenId} from '@/domain/ids'
import type {Treffen} from '@/domain/types'
import {describe, expect, it} from 'vitest'
import {buildPlanungskalenderGrid, buildTreffenLookup, WEEKDAY_HEADERS_LONG,} from './planungskalenderGrid'

describe('planungskalenderGrid', () => {
  describe('buildPlanungskalenderGrid', () => {
    it('starts on Monday and ends on Sunday', () => {
      // 2025-09-05 is a Friday → week starts Mon 2025-09-01
      // 2025-09-19 is a Friday → week ends Sun 2025-09-21
      const rows = buildPlanungskalenderGrid('2025-09-05', '2025-09-19')
      expect(rows.length).toBeGreaterThan(0)

      // First cell should be Monday 2025-09-01
      const first = rows[0][0]
      expect(first.kind).toBe('day')
      if (first.kind === 'day') {
        expect(first.iso).toBe('2025-09-01')
        expect(first.weekday).toBe(0) // Monday
      }

      // Last cell should be Sunday 2025-09-21
      const lastRow = rows[rows.length - 1]
      const last = lastRow[6]
      expect(last.kind).toBe('day')
      if (last.kind === 'day') {
        expect(last.iso).toBe('2025-09-21')
        expect(last.weekday).toBe(6) // Sunday
      }
    })

    it('every row has exactly 7 cells', () => {
      const rows = buildPlanungskalenderGrid('2025-09-01', '2025-11-30')
      for (const row of rows) {
        expect(row).toHaveLength(7)
      }
    })

    it('marks days outside zeitraum as inZeitraum: false', () => {
      const rows = buildPlanungskalenderGrid('2025-09-03', '2025-09-05')
      // 2025-09-03 is Wednesday → first Monday is 2025-09-01
      const mon = rows[0][0]
      expect(mon.kind).toBe('day')
      if (mon.kind === 'day') {
        expect(mon.inZeitraum).toBe(false) // 2025-09-01 is before start
      }
      const wed = rows[0][2]
      if (wed.kind === 'day') {
        expect(wed.inZeitraum).toBe(true) // 2025-09-03 is the start
      }
    })

    it('alternates shade per month (even monthIndex = shaded)', () => {
      // Sep (monthIndex 8, even) → shaded; Oct (monthIndex 9, odd) → not shaded
      const rows = buildPlanungskalenderGrid('2025-09-29', '2025-10-03')
      const sepCell = rows[0][0] // Mon Sep 29
      const octCell = rows[0][2] // Wed Oct 1
      if (sepCell.kind === 'day' && octCell.kind === 'day') {
        expect(sepCell.shaded).toBe(true)  // 8 % 2 === 0
        expect(octCell.shaded).toBe(false) // 9 % 2 === 1
      }
    })

    it('sets monthLabel on the first cell of a new month', () => {
      const rows = buildPlanungskalenderGrid('2025-09-29', '2025-10-05')
      // Find the cell for Oct 1
      const allCells = rows.flat()
      const oct1 = allCells.find(
        (c) => c.kind === 'day' && c.iso === '2025-10-01',
      )
      expect(oct1).toBeDefined()
      if (oct1?.kind === 'day') {
        expect(oct1.monthLabel).toBe('Okt')
      }
    })

    it('does not set monthLabel on subsequent days of the same month', () => {
      // 2025-10-06 is a Monday → grid starts exactly there, no Sep spill
      const rows = buildPlanungskalenderGrid('2025-10-06', '2025-10-19')
      const allCells = rows.flat().filter((c) => c.kind === 'day') as Array<
        Extract<(typeof rows)[0][0], { kind: 'day' }>
      >
      const withLabel = allCells.filter((c) => c.monthLabel !== null)
      // Only the very first Oct cell (Oct 6) should carry the label
      expect(withLabel).toHaveLength(1)
      expect(withLabel[0].monthLabel).toBe('Okt')
    })

    it('spans multiple months correctly', () => {
      const rows = buildPlanungskalenderGrid('2025-09-01', '2025-11-30')
      const allCells = rows.flat().filter((c) => c.kind === 'day') as Array<
        Extract<(typeof rows)[0][0], { kind: 'day' }>
      >
      const months = new Set(allCells.map((c) => c.monthIndex))
      expect(months.has(8)).toBe(true)  // Sep
      expect(months.has(9)).toBe(true)  // Oct
      expect(months.has(10)).toBe(true) // Nov
    })
  })

  describe('buildTreffenLookup', () => {
    it('maps datum to treffen for O(1) lookup', () => {
      const treffen: Treffen[] = [
        {
          id: 't1' as TreffenId,
          kind: 'regulaer',
          datum: '2025-09-05',
          programm: [],
          fixiert: false,
          sollWB: [],
        },
        {
          id: 't2' as TreffenId,
          kind: 'regulaer',
          datum: '2025-09-12',
          programm: [],
          fixiert: false,
          sollWB: [],
        },
      ]
      const lookup = buildTreffenLookup(treffen)
      expect(lookup.size).toBe(2)
      expect(lookup.get('2025-09-05')?.id).toBe('t1')
      expect(lookup.get('2025-09-12')?.id).toBe('t2')
      expect(lookup.get('2025-09-06')).toBeUndefined()
    })
  })

  describe('WEEKDAY_HEADERS_LONG', () => {
    it('has 7 entries starting with Mo', () => {
      expect(WEEKDAY_HEADERS_LONG).toHaveLength(7)
      expect(WEEKDAY_HEADERS_LONG[0]).toBe('Mo')
      expect(WEEKDAY_HEADERS_LONG[6]).toBe('So')
    })
  })
})
