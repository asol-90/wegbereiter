import type { Abzeichen, Aktivitaet, Andachtsreihe, Planung, StammKontext } from './types'
import { WB_KEYS, type WBKey } from './wb'
import { combine, contributionOf, normalize } from './wbLogic'
import { wbZielverteilung } from './wbZielverteilung'

export type KriteriumStatus = 'ok' | 'warn' | 'fehler'

export type Kriterium = {
  key: string
  art: 'ziel' | 'hinweis'
  status: KriteriumStatus
  text: string
}

export type AbschlussKriterien = {
  kriterien: Kriterium[]
  kannAbschliessen: boolean
}

const WB_NAMEN: Record<WBKey, string> = {
  koerperlich: 'Körperlich',
  gesellschaftlich: 'Gesellschaftlich',
  geistig: 'Geistig',
  geistlich: 'Geistlich',
}

export function pruefePlanung(
  planung: Planung,
  andachtsreihen: readonly Andachtsreihe[],
  abzeichen: readonly Abzeichen[],
  stammKontext: StammKontext | null,
  stammAktivitaeten: readonly Aktivitaet[],
): AbschlussKriterien {
  const allPP = planung.treffen.flatMap((t) => t.programm)
  const dist = normalize(combine(...allPP.map(contributionOf)))

  const kriterien: Kriterium[] = [
    ...pruefeWbBereiche(planung, dist),
    ...pruefeAndachtsreihen(planung, andachtsreihen),
    ...pruefeAbzeichen(planung, abzeichen),
    ...pruefeStammKontext(planung, stammKontext, stammAktivitaeten),
    ...pruefeHinweise(planung),
  ]

  return { kriterien, kannAbschliessen: !kriterien.some((k) => k.status === 'fehler') }
}

// ─── Ziele ────────────────────────────────────────────────────────────────────

function pruefeWbBereiche(planung: Planung, dist: Record<WBKey, number>): Kriterium[] {
  const result: Kriterium[] = []

  if (planung.wbSchwerpunkt) {
    const targets = wbZielverteilung(planung.wbSchwerpunkt)!
    const offTarget = WB_KEYS.filter((k) => dist[k] < targets[k].min || dist[k] > targets[k].max)
    if (offTarget.length === 0) {
      result.push({ key: 'wb-schwerpunkt', art: 'ziel', status: 'ok', text: 'Wachstumsbereiche im Zielbereich' })
    } else {
      const texts = offTarget.map(
        (k) => `${WB_NAMEN[k]}: ${Math.round(dist[k] * 100)} % (Ziel: ~${Math.round(targets[k].ziel * 100)} %)`,
      )
      result.push({ key: 'wb-schwerpunkt', art: 'ziel', status: 'warn', text: texts.join('; ') })
    }
  }

  const unterrepr = WB_KEYS.filter((k) => dist[k] < 0.1)
  if (unterrepr.length === 0) {
    result.push({ key: 'wb-balance', art: 'ziel', status: 'ok', text: 'Alle Wachstumsbereiche ausreichend vertreten' })
  } else {
    const texts = unterrepr.map((k) => `${WB_NAMEN[k]}: ${Math.round(dist[k] * 100)} % — stark unterrepräsentiert`)
    result.push({ key: 'wb-balance', art: 'ziel', status: 'warn', text: texts.join('; ') })
  }

  return result
}

function pruefeAndachtsreihen(planung: Planung, andachtsreihen: readonly Andachtsreihe[]): Kriterium[] {
  const assignedIds = buildAssignedAndachtsIds(planung)

  return planung.andachtsreihenZuordnung.flatMap((zuordnung) => {
    const reihe = andachtsreihen.find((r) => r.id === zuordnung.reiheId)
    if (!reihe) return []
    const relevant = zuordnung.ausgewaehlteEinheiten?.map((id) => id as string)
      ?? reihe.einheiten.map((e) => e.id as string)
    const done = relevant.filter((id) => assignedIds.has(id)).length
    return [{
      key: `andacht-${reihe.id}`,
      art: 'ziel' as const,
      status: done === relevant.length ? 'ok' : 'fehler' as KriteriumStatus,
      text: `${reihe.name}: ${done}/${relevant.length} Einheiten eingeplant`,
    }]
  })
}

function pruefeAbzeichen(planung: Planung, abzeichen: readonly Abzeichen[]): Kriterium[] {
  return planung.abzeichenAuswahl.flatMap((auswahl) => {
    const abz = abzeichen.find((a) => a.id === auswahl.abzeichenId)
    if (!abz) return []
    const abgedeckt = buildAbgedeckteAnforderungen(planung, abz)
    const done = abz.anforderungen.filter((a) => abgedeckt.has(a.id as string)).length
    return [{
      key: `abzeichen-${abz.id}`,
      art: 'ziel' as const,
      status: done === abz.anforderungen.length ? 'ok' : 'fehler' as KriteriumStatus,
      text: `${abz.name}: ${done}/${abz.anforderungen.length} Anforderungen abgedeckt`,
    }]
  })
}

function pruefeStammKontext(
  planung: Planung,
  stammKontext: StammKontext | null,
  stammAktivitaeten: readonly Aktivitaet[],
): Kriterium[] {
  if (!stammKontext || stammAktivitaeten.length === 0) return []
  const usedIds = buildUsedAktivitaetIds(planung)
  const done = stammAktivitaeten.filter((a) => usedIds.has(a.id as string)).length
  return [{
    key: 'stammkontext',
    art: 'ziel',
    status: done === 0 ? 'warn' : 'ok',
    text: `Stammkontext: ${done}/${stammAktivitaeten.length} Aktivitäten eingebunden`,
  }]
}

// ─── Hinweise ─────────────────────────────────────────────────────────────────

function pruefeHinweise(planung: Planung): Kriterium[] {
  return [
    pruefeLeereTreffen(planung),
    pruefeVerantwortliche(planung),
    pruefeZeitbalken(planung),
    pruefeUeberhang(planung),
  ]
}

function pruefeLeereTreffen(planung: Planung): Kriterium {
  const count = planung.treffen.filter((t) => t.programm.length === 0).length
  return count === 0
    ? { key: 'leere-treffen', art: 'hinweis', status: 'ok', text: 'Alle Treffen haben Programmpunkte' }
    : { key: 'leere-treffen', art: 'hinweis', status: 'fehler', text: `${count} Treffen ohne Programmpunkte` }
}

function pruefeVerantwortliche(planung: Planung): Kriterium {
  const allPP = planung.treffen.flatMap((t) => t.programm)
  const count = allPP.filter((pp) => pp.kind !== 'wegezeit' && pp.verantwortlicherId == null).length
  return count === 0
    ? { key: 'verantwortliche', art: 'hinweis', status: 'ok', text: 'Alle Verantwortlichkeiten geklärt' }
    : { key: 'verantwortliche', art: 'hinweis', status: 'fehler', text: `${count} Programmpunkt${count === 1 ? '' : 'e'} ohne Verantwortliche` }
}

function pruefeZeitbalken(planung: Planung): Kriterium {
  const count = planung.treffen.filter((t) => {
    if (t.programm.length === 0) return false
    const istMin = t.programm.reduce((sum, pp) => sum + pp.dauerMin, 0)
    const auslastung = planung.dauerMinuten === 0 ? 0 : istMin / planung.dauerMinuten
    return auslastung > 1 || auslastung < planung.zeitbalkenSchwelle
  }).length
  return count === 0
    ? { key: 'zeitbalken', art: 'hinweis', status: 'ok', text: 'Alle Treffen im grünen Zeitbereich' }
    : { key: 'zeitbalken', art: 'hinweis', status: 'warn', text: `${count} Treffen: Zeitbalken außerhalb grünem Bereich` }
}

function pruefeUeberhang(planung: Planung): Kriterium {
  const count = planung.ueberhang.length
  return count === 0
    ? { key: 'ueberhang', art: 'hinweis', status: 'ok', text: 'Kein Überhang' }
    : { key: 'ueberhang', art: 'hinweis', status: 'warn', text: `${count} Programmpunkt${count === 1 ? '' : 'e'} im Überhang` }
}

// ─── Data helpers ──────────────────────────────────────────────────────────────

function buildAssignedAndachtsIds(planung: Planung): Set<string> {
  const ids = new Set<string>()
  for (const t of planung.treffen)
    for (const pp of t.programm)
      if (pp.andachtsEinheitId) ids.add(pp.andachtsEinheitId as string)
  return ids
}

function buildAbgedeckteAnforderungen(planung: Planung, abz: Abzeichen): Set<string> {
  const ids = new Set<string>()
  for (const t of planung.treffen)
    for (const pp of t.programm) {
      if (pp.kind === 'wegezeit') continue
      for (const anf of abz.anforderungen)
        if (pp.typ === anf.typ && (anf.untertyp == null || pp.untertyp === anf.untertyp))
          ids.add(anf.id as string)
    }
  return ids
}

function buildUsedAktivitaetIds(planung: Planung): Set<string> {
  const ids = new Set<string>()
  for (const t of planung.treffen)
    for (const pp of t.programm)
      if (pp.kind === 'konkret') ids.add(pp.aktivitaetId as string)
  return ids
}
