import { describe, expect, it } from 'vitest'
import {
  characterize,
  combine,
  contributionOf,
  emptyDistribution,
  evaluateAgainstGoal,
  normalize,
  sumWBTags,
  total,
} from './wbLogic'
import type { Programmpunkt } from './types'
import type { ProgrammpunktId } from './ids'

const pp = (partial: Partial<Programmpunkt> & { kind?: string }): Programmpunkt => ({
  id: 'p' as ProgrammpunktId,
  kind: 'abstrakt',
  name: 'Test',
  typ: 'sonstiges',
  wbTags: [],
  dauerMin: 10,
  ...partial,
} as Programmpunkt)

describe('wbLogic', () => {
  describe('sumWBTags', () => {
    it('sums intensities by key', () => {
      const d = sumWBTags([
        { key: 'koerperlich', intensity: 0.5 },
        { key: 'koerperlich', intensity: 0.3 },
        { key: 'geistig', intensity: 1 },
      ])
      expect(d.koerperlich).toBeCloseTo(0.8)
      expect(d.geistig).toBe(1)
      expect(d.gesellschaftlich).toBe(0)
    })
    it('returns empty distribution for empty input', () => {
      expect(sumWBTags([])).toEqual(emptyDistribution())
    })
  })

  describe('contributionOf', () => {
    it('weights intensity by dauer', () => {
      const d = contributionOf(
        pp({
          dauerMin: 30,
          wbTags: [{ key: 'gesellschaftlich', intensity: 0.66 }],
        }),
      )
      expect(d.gesellschaftlich).toBeCloseTo(30 * 0.66)
    })
    it('wegezeit (no wbTags) contributes zero', () => {
      const d = contributionOf(pp({ kind: 'wegezeit', wbTags: [], dauerMin: 15 }))
      expect(total(d)).toBe(0)
    })
  })

  describe('characterize', () => {
    it('returns ausgewogen for zero distribution', () => {
      expect(characterize(emptyDistribution())).toEqual({ kind: 'ausgewogen' })
    })
    it('returns ausgewogen when all bereiche roughly equal', () => {
      expect(
        characterize({
          koerperlich: 1,
          gesellschaftlich: 1,
          geistig: 1,
          geistlich: 1,
        }),
      ).toEqual({ kind: 'ausgewogen' })
    })
    it('detects dominant when one bereich dominates', () => {
      const c = characterize({
        koerperlich: 10,
        gesellschaftlich: 1,
        geistig: 1,
        geistlich: 1,
      })
      expect(c.kind).toBe('dominant')
      expect((c as { kind: 'dominant'; keys: string[] }).keys).toContain('koerperlich')
    })
    it('detects fokus for clear but moderate emphasis', () => {
      const c = characterize({
        koerperlich: 5,
        gesellschaftlich: 2,
        geistig: 2,
        geistlich: 1,
      })
      // share: 5/10 = 0.5 → fokus
      expect(c.kind).toBe('fokus')
    })
    it('detects tendenz for slight emphasis', () => {
      const c = characterize({
        koerperlich: 35,
        gesellschaftlich: 25,
        geistig: 20,
        geistlich: 20,
      })
      // share: 35/100 = 0.35 → tendenz
      expect(c.kind).toBe('tendenz')
    })
  })

  describe('combine', () => {
    it('sums distributions element-wise', () => {
      const a = { ...emptyDistribution(), koerperlich: 1 }
      const b = { ...emptyDistribution(), koerperlich: 2, geistig: 3 }
      const c = combine(a, b)
      expect(c.koerperlich).toBe(3)
      expect(c.geistig).toBe(3)
    })
  })

  describe('normalize', () => {
    it('sums to 1 for non-zero input', () => {
      const n = normalize({
        koerperlich: 2,
        gesellschaftlich: 2,
        geistig: 2,
        geistlich: 2,
      })
      expect(total(n)).toBeCloseTo(1)
    })
    it('zero-distribution stays zero', () => {
      expect(normalize(emptyDistribution())).toEqual(emptyDistribution())
    })
  })

  describe('evaluateAgainstGoal', () => {
    it('meets goal when actual char equals or exceeds target level with correct keys', () => {
      const dist = {
        koerperlich: 10,
        gesellschaftlich: 2,
        geistig: 2,
        geistlich: 2,
      }
      const res = evaluateAgainstGoal(dist, ['koerperlich'], 'fokus')
      expect(res.meetsGoal).toBe(true)
      expect(res.actualChar.kind).toBe('dominant')
    })
    it('fails when wrong bereich dominates', () => {
      const dist = {
        koerperlich: 1,
        gesellschaftlich: 10,
        geistig: 1,
        geistlich: 1,
      }
      const res = evaluateAgainstGoal(dist, ['koerperlich'], 'fokus')
      expect(res.meetsGoal).toBe(false)
    })
    it('ausgewogen goal met only when actually ausgewogen', () => {
      const balanced = {
        koerperlich: 1,
        gesellschaftlich: 1,
        geistig: 1,
        geistlich: 1,
      }
      const focused = { koerperlich: 5, gesellschaftlich: 1, geistig: 1, geistlich: 1 }
      expect(evaluateAgainstGoal(balanced, [], 'ausgewogen').meetsGoal).toBe(true)
      expect(evaluateAgainstGoal(focused, [], 'ausgewogen').meetsGoal).toBe(false)
    })
  })
})
