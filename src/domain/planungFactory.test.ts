import {describe, expect, it} from 'vitest'
import {buildPlanung, generatePlanungsName} from './planungFactory'

describe('generatePlanungsName', () => {
  it('same-year range → Month – Month Year', () => {
    expect(generatePlanungsName('2025-09-05', '2025-12-19')).toBe('September – Dezember 2025')
  })
  it('cross-year range → Month Year – Month Year', () => {
    expect(generatePlanungsName('2025-11-15', '2026-03-20')).toBe(
      'November 2025 – März 2026',
    )
  })
})

describe('buildPlanung', () => {
  it('generates treffen for full zeitraum', () => {
    const p = buildPlanung({
      zeitraum: { start: '2025-09-05', ende: '2025-09-26' },
      weekday: 'freitag',
      rhythmus: { kind: 'weekly' },
      dauerMinuten: 90,
      team: [],
    })
    expect(p.treffen.map((t) => t.datum)).toEqual([
      '2025-09-05',
      '2025-09-12',
      '2025-09-19',
      '2025-09-26',
    ])
    expect(p.name).toBe('September – September 2025')
    expect(p.status).toBe('entwurf')
    expect(p.zeitbalkenSchwelle).toBe(0.8)
  })

  it('honors custom name if provided', () => {
    const p = buildPlanung({
      zeitraum: { start: '2025-09-05', ende: '2025-09-26' },
      weekday: 'freitag',
      rhythmus: { kind: 'weekly' },
      dauerMinuten: 90,
      team: [],
      name: 'Mein Experiment',
    })
    expect(p.name).toBe('Mein Experiment')
  })
})
