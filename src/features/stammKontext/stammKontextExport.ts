/**
 * stammKontextExport — serialise a StammKontext back to the JSON import format
 * (the inverse of parseStammDatei in stammParser.ts).
 */
import type {Aktivitaet, StammAktion, StammBlock, StammKontext, StammTreffen} from '@/domain/types'

type RawBlock = {
  name: string
  typ: string
  untertyp?: string
  dauerMin: number
}

type RawTreffen = {
  datum: string
  dauerMin: number
  anfangsBlock?: RawBlock[]
  endBlock?: RawBlock[]
}

type RawAktion = {
  titel: string
  beschreibung?: string
  beginn: string
  ende: string
  ort?: string
}

type RawAktivitaet = {
  name: string
  typ: string
  untertyp?: string
  dauerMin: number
  dauerMax: number
  themenTags?: string[]
  wbTags?: { key: string; intensity: number }[]
  notizen?: string
}

type RawStammFile = {
  typ: 'stammkontext'
  version: 1
  bearbeitetAm: string
  bearbeitungsNotiz?: string
  thema: string
  themaBeschreibung?: string
  themenTag?: string
  defaultAnfangsBlock?: RawBlock[]
  defaultEndBlock?: RawBlock[]
  treffen?: RawTreffen[]
  stammaktionen?: RawAktion[]
  distriktAktionen?: RawAktion[]
  regionalAktionen?: RawAktion[]
  aktivitaeten?: RawAktivitaet[]
}

function serializeBlock(b: StammBlock): RawBlock {
  const raw: RawBlock = { name: b.name, typ: b.typ, dauerMin: b.dauerMin }
  if (b.untertyp) raw.untertyp = b.untertyp
  return raw
}

function serializeTreffen(t: StammTreffen): RawTreffen {
  const raw: RawTreffen = { datum: t.datum, dauerMin: t.dauerMin }
  if (t.anfangsBlock) raw.anfangsBlock = t.anfangsBlock.map(serializeBlock)
  if (t.endBlock) raw.endBlock = t.endBlock.map(serializeBlock)
  return raw
}

function serializeAktion(a: StammAktion): RawAktion {
  const raw: RawAktion = { titel: a.titel, beginn: a.beginn, ende: a.ende }
  if (a.beschreibung) raw.beschreibung = a.beschreibung
  if (a.ort) raw.ort = a.ort
  return raw
}

function serializeAktivitaet(a: Aktivitaet): RawAktivitaet {
  const raw: RawAktivitaet = {
    name: a.name,
    typ: a.typ,
    dauerMin: a.zeitMin,
    dauerMax: a.zeitMax,
  }
  if (a.untertyp) raw.untertyp = a.untertyp
  if (a.themenTags.length) raw.themenTags = a.themenTags
  if (a.wbTags.length) {
    raw.wbTags = a.wbTags.map((t) => ({ key: t.key, intensity: t.intensity }))
  }
  if (a.notizen) raw.notizen = a.notizen
  return raw
}

export function serializeStammKontext(
  kontext: StammKontext,
  aktivitaeten: readonly Aktivitaet[],
): string {
  const raw: RawStammFile = {
    typ: 'stammkontext',
    version: 1,
    bearbeitetAm: kontext.bearbeitetAm,
    thema: kontext.thema,
  }

  if (kontext.bearbeitungsNotiz) raw.bearbeitungsNotiz = kontext.bearbeitungsNotiz
  if (kontext.themaBeschreibung) raw.themaBeschreibung = kontext.themaBeschreibung
  if (kontext.themenTag) raw.themenTag = kontext.themenTag

  if (kontext.defaultAnfangsBlock.length) {
    raw.defaultAnfangsBlock = kontext.defaultAnfangsBlock.map(serializeBlock)
  }
  if (kontext.defaultEndBlock.length) {
    raw.defaultEndBlock = kontext.defaultEndBlock.map(serializeBlock)
  }
  if (kontext.treffen.length) {
    raw.treffen = kontext.treffen.map(serializeTreffen)
  }
  if (kontext.stammaktionen.length) {
    raw.stammaktionen = kontext.stammaktionen.map(serializeAktion)
  }
  if (kontext.distriktAktionen.length) {
    raw.distriktAktionen = kontext.distriktAktionen.map(serializeAktion)
  }
  if (kontext.regionalAktionen.length) {
    raw.regionalAktionen = kontext.regionalAktionen.map(serializeAktion)
  }
  if (aktivitaeten.length) {
    raw.aktivitaeten = aktivitaeten.map(serializeAktivitaet)
  }

  return JSON.stringify(raw, null, 2)
}

export function downloadStammKontext(
  kontext: StammKontext,
  aktivitaeten: readonly Aktivitaet[],
): void {
  const json = serializeStammKontext(kontext, aktivitaeten)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = kontext.thema.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
  a.href = url
  a.download = `stammkontext-${slug || 'export'}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
