/**
 * Abzeichen-Katalog — vorinstallierte Abzeichen-Definitionen.
 *
 * Phase 10: Fake-Daten basierend auf CSV-Export (nicht final).
 * Werden später durch echte Daten ersetzt.
 */
import type { AbzeichenAnforderungId, AbzeichenId } from './ids'
import type { Abzeichen, Altersstufe } from './types'

// ─── Altersstufen-Labels ──────────────────────────────────────────────────

export const ALTERSSTUFE_LABELS: Record<Altersstufe, string> = {
  kundschafter: 'Kundschafter',
  pfadfinder: 'Pfadfinder',
}

// ─── Vorinstallierte Abzeichen ────────────────────────────────────────────

export const ABZEICHEN_KATALOG: Abzeichen[] = [
  // ── Kundschafter ──
  {
    id: 'abz-beobachter' as AbzeichenId,
    name: 'Beobachter',
    altersstufe: 'kundschafter',
    quelle: 'vorinstalliert',
    anforderungen: [
      {
        id: 'abz-beob-01' as AbzeichenAnforderungId,
        name: 'Royal Rangers Regeln sagen und erklären',
        typ: 'andacht-gespraech',
        untertyp: 'andacht',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-beob-02' as AbzeichenAnforderungId,
        name: 'A-Feuer machen und löschen',
        typ: 'pfadfindertechnik',
        untertyp: 'feuer',
        zeitMin: 20,
        zeitMax: 35,
      },
      {
        id: 'abz-beob-03' as AbzeichenAnforderungId,
        name: 'Halber Schlag / Kreuzknoten zeigen',
        typ: 'pfadfindertechnik',
        untertyp: 'knoten-buende',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-beob-04' as AbzeichenAnforderungId,
        name: 'Schnitt- und Schürfwunden behandeln',
        typ: 'pfadfindertechnik',
        untertyp: 'erste-hilfe-sicherheit',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-beob-05' as AbzeichenAnforderungId,
        name: '2 Vögel und 2 Säugetiere beschreiben',
        typ: 'pfadfindertechnik',
        untertyp: 'naturkunde',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-beob-06' as AbzeichenAnforderungId,
        name: 'Bibelfragebogen ausfüllen',
        typ: 'andacht-gespraech',
        untertyp: 'bibelarbeit',
        zeitMin: 20,
        zeitMax: 30,
      },
    ],
  },
  {
    id: 'abz-entdecker' as AbzeichenId,
    name: 'Entdecker',
    altersstufe: 'kundschafter',
    quelle: 'vorinstalliert',
    anforderungen: [
      {
        id: 'abz-entd-01' as AbzeichenAnforderungId,
        name: '4 Holzarten unterscheiden',
        typ: 'pfadfindertechnik',
        untertyp: 'feuer',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-entd-02' as AbzeichenAnforderungId,
        name: 'Webeleinenstek / Achtknoten / Kreuzbund',
        typ: 'pfadfindertechnik',
        untertyp: 'knoten-buende',
        zeitMin: 25,
        zeitMax: 40,
      },
      {
        id: 'abz-entd-03' as AbzeichenAnforderungId,
        name: 'Stark blutende Wunde versorgen',
        typ: 'pfadfindertechnik',
        untertyp: 'erste-hilfe-sicherheit',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-entd-04' as AbzeichenAnforderungId,
        name: 'Spiel leiten',
        typ: 'stammformat',
        untertyp: 'gelaendespiel',
        zeitMin: 20,
        zeitMax: 35,
      },
      {
        id: 'abz-entd-05' as AbzeichenAnforderungId,
        name: 'Bibelfragebogen ausfüllen',
        typ: 'andacht-gespraech',
        untertyp: 'bibelarbeit',
        zeitMin: 20,
        zeitMax: 30,
      },
    ],
  },
  // ── Pfadfinder ──
  {
    id: 'abz-bronzelilie' as AbzeichenId,
    name: 'Bronzelilie',
    altersstufe: 'pfadfinder',
    quelle: 'vorinstalliert',
    anforderungen: [
      {
        id: 'abz-bronze-01' as AbzeichenAnforderungId,
        name: 'A-Feuer mit max. 3 Hölzern machen',
        typ: 'pfadfindertechnik',
        untertyp: 'feuer',
        zeitMin: 20,
        zeitMax: 35,
      },
      {
        id: 'abz-bronze-02' as AbzeichenAnforderungId,
        name: 'Kompass-Teile benennen',
        typ: 'pfadfindertechnik',
        untertyp: 'orientierung',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-bronze-03' as AbzeichenAnforderungId,
        name: 'Polarstern finden',
        typ: 'pfadfindertechnik',
        untertyp: 'orientierung',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-bronze-04' as AbzeichenAnforderungId,
        name: 'Stabile Seitenlage üben',
        typ: 'pfadfindertechnik',
        untertyp: 'erste-hilfe-sicherheit',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-bronze-05' as AbzeichenAnforderungId,
        name: 'Andacht halten',
        typ: 'andacht-gespraech',
        untertyp: 'andacht',
        zeitMin: 20,
        zeitMax: 35,
      },
      {
        id: 'abz-bronze-06' as AbzeichenAnforderungId,
        name: 'Bibelfragebogen ausfüllen',
        typ: 'andacht-gespraech',
        untertyp: 'bibelarbeit',
        zeitMin: 20,
        zeitMax: 30,
      },
    ],
  },
  {
    id: 'abz-silberlilie' as AbzeichenId,
    name: 'Silberlilie',
    altersstufe: 'pfadfinder',
    quelle: 'vorinstalliert',
    anforderungen: [
      {
        id: 'abz-silber-01' as AbzeichenAnforderungId,
        name: 'Kohte/Zelt aufbauen',
        typ: 'pfadfindertechnik',
        untertyp: 'camp',
        zeitMin: 25,
        zeitMax: 40,
      },
      {
        id: 'abz-silber-02' as AbzeichenAnforderungId,
        name: 'Kroki zeichnen',
        typ: 'pfadfindertechnik',
        untertyp: 'orientierung',
        zeitMin: 20,
        zeitMax: 35,
      },
      {
        id: 'abz-silber-03' as AbzeichenAnforderungId,
        name: 'Erste Hilfe mit Halstuch',
        typ: 'pfadfindertechnik',
        untertyp: 'erste-hilfe-sicherheit',
        zeitMin: 15,
        zeitMax: 25,
      },
      {
        id: 'abz-silber-04' as AbzeichenAnforderungId,
        name: 'Andacht halten',
        typ: 'andacht-gespraech',
        untertyp: 'andacht',
        zeitMin: 20,
        zeitMax: 35,
      },
      {
        id: 'abz-silber-05' as AbzeichenAnforderungId,
        name: 'Bibelfragebogen ausfüllen',
        typ: 'andacht-gespraech',
        untertyp: 'bibelarbeit',
        zeitMin: 20,
        zeitMax: 30,
      },
    ],
  },
]

/** Abzeichen nach Altersstufe filtern. */
export function abzeichenFuerStufe(stufe: Altersstufe): Abzeichen[] {
  return ABZEICHEN_KATALOG.filter((a) => a.altersstufe === stufe)
}

/** Abzeichen per ID finden. */
export function abzeichenById(id: AbzeichenId): Abzeichen | undefined {
  return ABZEICHEN_KATALOG.find((a) => a.id === id)
}
