/**
 * Vorinstallierte Aktivitäten — Starter-Repertoire für neue Planungen.
 *
 * Leicht löschbar: Alle tragen quelle === 'vorinstalliert'.
 * WB-Tags bleiben leer → Defaults aus Typ/Untertyp greifen.
 */
import type {AktivitaetTyp, AktivitaetUntertyp} from './aktivitaetKatalog'
import type {AktivitaetId} from './ids'
import type {Aktivitaet} from './types'

let counter = 0
function vorId(): AktivitaetId {
  return `vor-${++counter}` as AktivitaetId
}

type AktSpec = {
  name: string
  typ: AktivitaetTyp
  untertyp?: AktivitaetUntertyp
  zeitMin: number
  zeitMax: number
}

const SPECS: AktSpec[] = [
  // ─── Andacht/Gespräch ──────────────────────────
  { name: 'Tageslosung lesen', typ: 'andacht-gespraech', untertyp: 'andacht', zeitMin: 5, zeitMax: 10 },
  { name: 'Bibelarbeit: Gleichnisse Jesu', typ: 'andacht-gespraech', untertyp: 'bibelarbeit', zeitMin: 15, zeitMax: 25 },
  { name: 'Was beschäftigt euch?', typ: 'andacht-gespraech', untertyp: 'austausch', zeitMin: 10, zeitMax: 20 },

  // ─── Spiel/Sport ───────────────────────────────
  { name: 'Capture the Flag', typ: 'spiel-sport', untertyp: 'wettbewerb', zeitMin: 20, zeitMax: 40 },
  { name: 'Kooperatives Seilspiel', typ: 'spiel-sport', untertyp: 'kooperation', zeitMin: 15, zeitMax: 25 },
  { name: 'Vertrauensparcours', typ: 'spiel-sport', untertyp: 'teambuilding', zeitMin: 15, zeitMax: 30 },

  // ─── Basteln/Bauen ─────────────────────────────
  { name: 'Holzwerkstatt: Schnitzen', typ: 'basteln-bauen', zeitMin: 30, zeitMax: 60 },
  { name: 'Paracord-Armbänder', typ: 'basteln-bauen', zeitMin: 15, zeitMax: 30 },

  // ─── Musik/Lobpreis ────────────────────────────
  { name: 'Liedersingen am Feuer', typ: 'musik-lobpreis', zeitMin: 10, zeitMax: 20 },
  { name: 'Kanon-Runde', typ: 'musik-lobpreis', zeitMin: 5, zeitMax: 15 },

  // ─── Kochen/Essen ──────────────────────────────
  { name: 'Stockbrot backen', typ: 'kochen-essen', zeitMin: 20, zeitMax: 40 },
  { name: 'Gemeinsames Abendessen kochen', typ: 'kochen-essen', zeitMin: 30, zeitMax: 60 },

  // ─── Pfadfindertechnik ─────────────────────────
  { name: 'Feuer machen lernen', typ: 'pfadfindertechnik', untertyp: 'feuer', zeitMin: 15, zeitMax: 30 },
  { name: 'Kreuzknoten & Palstek', typ: 'pfadfindertechnik', untertyp: 'knoten-buende', zeitMin: 15, zeitMax: 30 },
  { name: 'Kompass-Wanderung', typ: 'pfadfindertechnik', untertyp: 'orientierung', zeitMin: 20, zeitMax: 40 },
  { name: 'Erste-Hilfe-Parcours', typ: 'pfadfindertechnik', untertyp: 'erste-hilfe-sicherheit', zeitMin: 20, zeitMax: 30 },

  // ─── Wandern/Exkursion ─────────────────────────
  { name: 'Waldwanderung', typ: 'wandern-exkursion', untertyp: 'wanderung', zeitMin: 30, zeitMax: 90 },
  { name: 'Stadterkundung', typ: 'wandern-exkursion', untertyp: 'ausflug', zeitMin: 45, zeitMax: 120 },

  // ─── Dienst/Nächstenliebe ──────────────────────
  { name: 'Müllsammelaktion im Quartier', typ: 'dienst-naechstenliebe', zeitMin: 30, zeitMax: 60 },
  { name: 'Besuch im Seniorenheim', typ: 'dienst-naechstenliebe', zeitMin: 30, zeitMax: 60 },

  // ─── Wachstumspfad (Untertyp Pfadfindertechnik) ─
  { name: 'Treffenbericht schreiben', typ: 'pfadfindertechnik', untertyp: 'logbuch', zeitMin: 10, zeitMax: 20 },
  { name: 'Tagesrückblick zeichnen', typ: 'pfadfindertechnik', untertyp: 'logbuch', zeitMin: 10, zeitMax: 15 },
]

/**
 * Generiert den vollständigen Starter-Katalog.
 * Jeder Aufruf erzeugt frische IDs (idempotent im Sinne des Inhalts,
 * nicht der IDs — beim Seeding per GlobalConfig-Flag vor Dopplung geschützt).
 */
export function createStarterKatalog(): Aktivitaet[] {
  counter = 0
  return SPECS.map((s) => {
    const a: Aktivitaet = {
      id: vorId(),
      name: s.name,
      typ: s.typ,
      wbTags: [], // leer → Defaults aus Typ/Untertyp
      themenTags: [],
      zeitMin: s.zeitMin,
      zeitMax: s.zeitMax,
      quelle: 'vorinstalliert',
    }
    if (s.untertyp) a.untertyp = s.untertyp
    return a
  })
}
