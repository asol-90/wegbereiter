import { describe, expect, it } from 'vitest'
import { derive } from './useNavPosition'

describe('derive(pathname)', () => {
  it('returns position 0 for the root path', () => {
    expect(derive('/')).toEqual({
      position: 0,
      planungId: null,
      repertoireActive: false,
    })
  })

  it('recognises Kalender route and extracts the planungId', () => {
    expect(derive('/planung/abc-123/kalender')).toEqual({
      position: 1,
      planungId: 'abc-123',
      repertoireActive: false,
    })
  })

  it('recognises Liste route and extracts the planungId', () => {
    expect(derive('/planung/demo/liste')).toEqual({
      position: 2,
      planungId: 'demo',
      repertoireActive: false,
    })
  })

  it('returns pos=none and repertoireActive for /repertoire', () => {
    expect(derive('/repertoire')).toEqual({
      position: 'none',
      planungId: null,
      repertoireActive: true,
    })
  })

  it('falls back to overview for unknown paths', () => {
    const s = derive('/something/strange')
    expect(s.position).toBe(0)
    expect(s.planungId).toBeNull()
    expect(s.repertoireActive).toBe(false)
  })
})
