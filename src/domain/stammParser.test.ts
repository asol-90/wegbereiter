import { describe, expect, it } from 'vitest'
import { detectFileType, parseStammDatei, StammParseError } from './stammParser'

const MINIMAL_KONTEXT = {
  typ: 'stammkontext',
  version: 1,
  bearbeitetAm: '2026-04-20T14:30:00',
  thema: 'Christ sein heute',
  defaultAnfangsBlock: [
    { name: 'Stammrunde', typ: 'sonstiges', dauerMin: 15 },
  ],
  defaultEndBlock: [],
  treffen: [
    { id: 't-1', art: 'treffen', datum: '2026-09-18', dauerMin: 90 },
  ],
  stammaktionen: [],
}

function json(override: Record<string, unknown> = {}) {
  return JSON.stringify({ ...MINIMAL_KONTEXT, ...override })
}

describe('parseStammDatei', () => {
  it('parses a minimal valid file', () => {
    const { kontext, aktivitaeten } = parseStammDatei(json())
    expect(kontext.thema).toBe('Christ sein heute')
    expect(kontext.treffen).toHaveLength(1)
    expect(kontext.treffen[0].datum).toBe('2026-09-18')
    expect(kontext.defaultAnfangsBlock).toHaveLength(1)
    expect(kontext.defaultEndBlock).toHaveLength(0)
    expect(aktivitaeten).toHaveLength(0)
    expect(kontext.id).toBeTruthy()
    expect(kontext.stammImportId).toBeTruthy()
    expect(kontext.importiertAm).toBeTruthy()
  })

  it('parses treffen with block overrides', () => {
    const { kontext } = parseStammDatei(
      json({
        treffen: [
          {
            id: 't-1',
            art: 'treffen',
            datum: '2026-09-18',
            dauerMin: 90,
            endBlock: [], // no closing block today
          },
        ],
      }),
    )
    expect(kontext.treffen[0].endBlock).toEqual([])
    expect(kontext.treffen[0].anfangsBlock).toBeUndefined() // use defaults
  })

  it('parses stammaktionen', () => {
    const { kontext } = parseStammDatei(
      json({
        stammaktionen: [
          {
            id: 'sa-1',
            titel: 'Herbstlager',
            beginn: '2026-10-05',
            ende: '2026-10-08',
            ort: 'Waldeck',
            beschreibung: 'Packliste beachten',
          },
        ],
      }),
    )
    expect(kontext.stammaktionen).toHaveLength(1)
    expect(kontext.stammaktionen[0].titel).toBe('Herbstlager')
    expect(kontext.stammaktionen[0].ort).toBe('Waldeck')
  })

  it('parses imported activities with WB tags', () => {
    const { aktivitaeten, kontext } = parseStammDatei(
      json({
        themenTag: 'test-tag',
        aktivitaeten: [
          {
            name: 'Bibelarbeit',
            typ: 'andacht',
            dauerMin: 15,
            dauerMax: 25,
            wbTags: [{ bereich: 'geistlich', gewicht: 1.0 }],
            themenTags: ['other'],
          },
        ],
      }),
    )
    expect(aktivitaeten).toHaveLength(1)
    expect(aktivitaeten[0].quelle).toBe('stamm-import')
    expect(aktivitaeten[0].stammImportId).toBe(kontext.stammImportId)
    expect(aktivitaeten[0].wbTags).toEqual([{ key: 'geistlich', intensity: 1.0 }])
    // themenTag auto-added
    expect(aktivitaeten[0].themenTags).toContain('test-tag')
    expect(aktivitaeten[0].themenTags).toContain('other')
  })

  it('sets dauerMax = dauerMin when dauerMax is missing', () => {
    const { aktivitaeten } = parseStammDatei(
      json({
        aktivitaeten: [
          { name: 'Spiel', typ: 'spiel', dauerMin: 30 },
        ],
      }),
    )
    expect(aktivitaeten[0].zeitMin).toBe(30)
    expect(aktivitaeten[0].zeitMax).toBe(30)
  })

  it('migrates legacy typ keys to new keys', () => {
    const { aktivitaeten, kontext } = parseStammDatei(
      json({
        aktivitaeten: [
          { name: 'Andacht', typ: 'andacht', dauerMin: 15 },
          { name: 'Spiel', typ: 'spiel', dauerMin: 30 },
          { name: 'Gebet', typ: 'gebet', dauerMin: 10 },
        ],
      }),
    )
    expect(aktivitaeten[0].typ).toBe('andacht-gespraech')
    expect(aktivitaeten[1].typ).toBe('spiel-sport')
    expect(aktivitaeten[2].typ).toBe('gebet-stille')
    // StammBlock in default anfangs/endBlock also migrated
    expect(kontext.defaultAnfangsBlock[0].typ).toBe('sonstiges')
  })

  it('accepts new typ keys directly', () => {
    const { kontext } = parseStammDatei(
      json({
        defaultAnfangsBlock: [
          { name: 'Stammrunde', typ: 'stammformat', untertyp: 'stammrunde', dauerMin: 15 },
        ],
      }),
    )
    expect(kontext.defaultAnfangsBlock[0].typ).toBe('stammformat')
    expect(kontext.defaultAnfangsBlock[0].untertyp).toBe('stammrunde')
  })

  it('rejects invalid JSON', () => {
    expect(() => parseStammDatei('not json')).toThrow(StammParseError)
  })

  it('rejects wrong typ', () => {
    expect(() => parseStammDatei(json({ typ: 'planung' }))).toThrow(StammParseError)
  })

  it('rejects missing thema', () => {
    expect(() => parseStammDatei(json({ thema: '' }))).toThrow(StammParseError)
  })

  it('rejects missing bearbeitetAm', () => {
    expect(() => parseStammDatei(json({ bearbeitetAm: '2026-04-20' }))).toThrow(StammParseError)
  })

  it('rejects treffen with invalid date', () => {
    expect(() =>
      parseStammDatei(
        json({
          treffen: [{ id: 't-1', art: 'treffen', datum: 'not-a-date', dauerMin: 90 }],
        }),
      ),
    ).toThrow(StammParseError)
  })

  it('rejects aktion with beginn after ende', () => {
    expect(() =>
      parseStammDatei(
        json({
          stammaktionen: [
            { id: 'sa-1', titel: 'X', beginn: '2026-10-08', ende: '2026-10-05' },
          ],
        }),
      ),
    ).toThrow(StammParseError)
  })

  it('rejects empty context (no treffen, no aktionen)', () => {
    expect(() =>
      parseStammDatei(json({ treffen: [], stammaktionen: [] })),
    ).toThrow(StammParseError)
  })

  it('rejects invalid aktivitaet typ', () => {
    expect(() =>
      parseStammDatei(
        json({
          aktivitaeten: [{ name: 'X', typ: 'unknown', dauerMin: 10 }],
        }),
      ),
    ).toThrow(StammParseError)
  })

  it('stores optional meta fields', () => {
    const { kontext } = parseStammDatei(
      json({
        themaBeschreibung: 'Beschreibung',
        bearbeitungsNotiz: 'Lager verschoben',
        themenTag: 'tag',
      }),
    )
    expect(kontext.themaBeschreibung).toBe('Beschreibung')
    expect(kontext.bearbeitungsNotiz).toBe('Lager verschoben')
    expect(kontext.themenTag).toBe('tag')
  })
})

describe('detectFileType', () => {
  it('detects stammkontext', () => {
    expect(detectFileType(json())).toBe('stammkontext')
  })

  it('returns unknown for other JSON', () => {
    expect(detectFileType('{"typ":"planung"}')).toBe('unknown')
  })

  it('returns unknown for invalid JSON', () => {
    expect(detectFileType('not json')).toBe('unknown')
  })
})
