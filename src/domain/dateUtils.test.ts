import { describe, expect, it } from 'vitest'
import {
  daysBetween,
  generateTermine,
  parseIso,
  rhythmusWeekInterval,
  toIso,
  weeksBetween,
} from './dateUtils'

describe('dateUtils', () => {
  describe('rhythmusWeekInterval', () => {
    it('maps known rhythmus kinds', () => {
      expect(rhythmusWeekInterval({ kind: 'weekly' })).toBe(1)
      expect(rhythmusWeekInterval({ kind: 'biweekly' })).toBe(2)
      expect(rhythmusWeekInterval({ kind: 'monthly' })).toBe(4)
      expect(rhythmusWeekInterval({ kind: 'custom', weekCount: 3 })).toBe(3)
    })
    it('clamps custom to min 1', () => {
      expect(rhythmusWeekInterval({ kind: 'custom', weekCount: 0 })).toBe(1)
      expect(rhythmusWeekInterval({ kind: 'custom', weekCount: -5 })).toBe(1)
    })
  })

  describe('generateTermine', () => {
    it('generates weekly Friday dates starting on a Friday', () => {
      // 2025-09-05 is a Friday
      const dates = generateTermine('2025-09-05', '2025-09-26', 'freitag', {
        kind: 'weekly',
      })
      expect(dates).toEqual(['2025-09-05', '2025-09-12', '2025-09-19', '2025-09-26'])
    })

    it('finds the first Friday after a Tuesday start', () => {
      // 2025-09-02 is Tuesday → first Friday is 2025-09-05
      const dates = generateTermine('2025-09-02', '2025-09-20', 'freitag', {
        kind: 'weekly',
      })
      expect(dates[0]).toBe('2025-09-05')
    })

    it('respects biweekly rhythmus', () => {
      const dates = generateTermine('2025-09-05', '2025-10-31', 'freitag', {
        kind: 'biweekly',
      })
      expect(dates).toEqual(['2025-09-05', '2025-09-19', '2025-10-03', '2025-10-17', '2025-10-31'])
    })

    it('returns empty when ende < start', () => {
      expect(generateTermine('2025-09-20', '2025-09-05', 'freitag', { kind: 'weekly' })).toEqual([])
    })

    it('handles a single-day window on the target weekday', () => {
      expect(
        generateTermine('2025-09-05', '2025-09-05', 'freitag', { kind: 'weekly' }),
      ).toEqual(['2025-09-05'])
    })

    it('returns empty if target weekday never falls inside window', () => {
      // Window is Mon→Wed, asking for Friday
      expect(
        generateTermine('2025-09-01', '2025-09-03', 'freitag', { kind: 'weekly' }),
      ).toEqual([])
    })

    it('handles sunday correctly (date-fns convention: 0)', () => {
      // 2025-09-07 is Sunday
      const dates = generateTermine('2025-09-01', '2025-09-30', 'sonntag', {
        kind: 'weekly',
      })
      expect(dates[0]).toBe('2025-09-07')
      expect(dates.length).toBe(4)
    })
  })

  describe('toIso / parseIso round-trip', () => {
    it('preserves the calendar date', () => {
      expect(toIso(parseIso('2025-12-31'))).toBe('2025-12-31')
    })
  })

  describe('daysBetween / weeksBetween', () => {
    it('days between are inclusive of difference', () => {
      expect(daysBetween('2025-09-05', '2025-09-12')).toBe(7)
    })
    it('weeks are rounded', () => {
      expect(weeksBetween('2025-09-05', '2025-09-19')).toBe(2)
      expect(weeksBetween('2025-09-05', '2025-09-12')).toBe(1)
    })
  })
})
