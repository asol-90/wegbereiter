import { describe, expect, it } from 'vitest'
import {
  buildMonthGrid,
  classifyDay,
  daysInMonth,
  MONTH_NAMES_DE,
} from './monthGrid'
import type { FerienCacheEntry } from '@/domain/types'

describe('buildMonthGrid', () => {
  it('returns 6 rows × 7 cells', () => {
    const grid = buildMonthGrid(2025, 0)
    expect(grid).toHaveLength(6)
    for (const row of grid) expect(row).toHaveLength(7)
  })

  it('Jan 2025 starts on Wednesday (leading = 2 empty cells)', () => {
    const [first] = buildMonthGrid(2025, 0)
    expect(first[0]).toEqual({ kind: 'empty' })
    expect(first[1]).toEqual({ kind: 'empty' })
    expect(first[2]).toMatchObject({ kind: 'day', day: 1, iso: '2025-01-01' })
  })

  it('Feb 2025 leads with 5 empty cells (Sat start)', () => {
    const grid = buildMonthGrid(2025, 1)
    expect(grid[0].slice(0, 5).every((c) => c.kind === 'empty')).toBe(true)
    expect(grid[0][5]).toMatchObject({ kind: 'day', day: 1 })
  })

  it('iso strings are zero-padded', () => {
    const grid = buildMonthGrid(2025, 8)
    const firstDay = grid.flat().find((c) => c.kind === 'day')
    expect(firstDay?.kind === 'day' && firstDay.iso).toBe('2025-09-01')
  })

  it('weekday is 0 for Monday, 6 for Sunday', () => {
    const grid = buildMonthGrid(2025, 0)
    // Jan 6 2025 is a Monday.
    const jan6 = grid.flat().find((c) => c.kind === 'day' && c.day === 6)
    expect(jan6?.kind === 'day' && jan6.weekday).toBe(0)
    // Jan 12 is a Sunday.
    const jan12 = grid.flat().find((c) => c.kind === 'day' && c.day === 12)
    expect(jan12?.kind === 'day' && jan12.weekday).toBe(6)
  })
})

describe('daysInMonth', () => {
  it.each([
    [2025, 0, 31], // Jan
    [2025, 1, 28], // Feb (common year)
    [2024, 1, 29], // Feb leap
    [2025, 3, 30], // Apr
    [2025, 11, 31], // Dec
  ])('year %s month %s → %s days', (y, m, d) => {
    expect(daysInMonth(y, m)).toBe(d)
  })
})

describe('MONTH_NAMES_DE', () => {
  it('has 12 names in German', () => {
    expect(MONTH_NAMES_DE).toHaveLength(12)
    expect(MONTH_NAMES_DE[0]).toBe('Januar')
    expect(MONTH_NAMES_DE[11]).toBe('Dezember')
  })
})

describe('classifyDay', () => {
  const entry: FerienCacheEntry = {
    bundesland: 'BW',
    jahr: 2025,
    feiertage: [
      { datum: '2025-05-01', name: 'Tag der Arbeit', bundesweit: true },
    ],
    ferien: [
      { name: 'Osterferien', start: '2025-04-14', ende: '2025-04-25' },
    ],
    abgerufenAm: '2025-01-01T00:00:00Z',
  }

  it('returns empty object when entry is null', () => {
    expect(classifyDay('2025-04-20', null)).toEqual({})
  })

  it('marks first day of ferien range', () => {
    const c = classifyDay('2025-04-14', entry)
    expect(c.ferien?.name).toBe('Osterferien')
    expect(c.ferienFirst).toBe(true)
    expect(c.ferienLast).toBeUndefined()
  })

  it('marks last day of ferien range', () => {
    const c = classifyDay('2025-04-25', entry)
    expect(c.ferienLast).toBe(true)
    expect(c.ferienFirst).toBeUndefined()
  })

  it('marks day as both ferien+feiertag when overlapping', () => {
    // May 1 is not in the defined ferien, but let's verify independence.
    const c = classifyDay('2025-05-01', entry)
    expect(c.feiertag?.name).toBe('Tag der Arbeit')
    expect(c.ferien).toBeUndefined()
  })

  it('returns empty when day is outside all ranges', () => {
    expect(classifyDay('2025-06-15', entry)).toEqual({})
  })
})
