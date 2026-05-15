# Phase 15 — Export & Planungsabschluss

## Überblick

Phase 15 fügt zwei Dinge hinzu:

1. **Planungsabschluss** — expliziter Status `'abgeschlossen'` mit Kriterien-Overlay
2. **Exporte** — JSON (Reimport), PDF (Dokumentation), iCal (Kalender)

Beide sind am unteren Ende der Kontextleiste angesiedelt, sticky unterhalb aller Ziel-Sektionen.

---

## 1. Status-Erweiterung

### 1.1 `PlanungStatus`

```ts
export type PlanungStatus = 'entwurf' | 'aktiv' | 'abgeschlossen' | 'archiviert'
```

`'abgeschlossen'` bedeutet: alle harten Kriterien erfüllt, Planung dokumentiert. Der Status bleibt auch nach nachträglichen Änderungen erhalten — er wird nicht automatisch zurückgesetzt. Manuelles Zurücksetzen auf `'aktiv'` muss möglich sein (Button im Overlay oder neben dem Abschluss-Button).

Visuelle Unterscheidung in der Übersichtsseite: Planungskarte wechselt von gestricheltem zu durchgezogenem Border.

### 1.2 Verantwortlichkeit: dritter Zustand

`verantwortlicherId` wird von `MitarbeiterId | undefined` auf einen Union-Typ erweitert:

```ts
verantwortlicherId: MitarbeiterId | 'spontan' | undefined
```

- `undefined` — noch nicht entschieden, offener Punkt (zählt als Planungslücke)
- `MitarbeiterId` — konkrete Person
- `'spontan'` — absichtlich offen, kein Handlungsbedarf (zählt als geklärt)

Im Toggle neben dem Programmpunkt: drei Zustände `–` / `[Person]` / `Spontan`.

---

## 2. Planungsabschluss-UI

### 2.1 Platzierung

Sticky am unteren Ende der Kontextleiste, unterhalb aller Ziel-Sektionen:

```
┌─────────────────────────────────────────┐
│  [i]  Planung abschließen          [→]  │
│       Zwischenstand exportieren    [↓]  │
└─────────────────────────────────────────┘
```

- `[i]` — Info-Icon, öffnet Kriterien-Overlay (immer klickbar, unabhängig vom Button-Status)
- `[→]` — Abschluss-Button, disabled solange harte Kriterien offen
- `[↓]` — Export-Button, immer aktiv, öffnet Dropdown mit drei Optionen

### 2.2 Kriterien-Overlay

Das Overlay zeigt immer den vollständigen Status — nicht nur Fehler. Zwei Sektionen:

**Ziele** — inhaltliche Commitments der Planung:

| Icon | Kriterium | Anzeige |
|---|---|---|
| ✓ / ⚠ | WB-Schwerpunkt (wenn gesetzt) | „Geistlich: 8 % (Ziel: ~25 %)" |
| ✓ / ⚠ | WB ohne Schwerpunkt | „Körperlich: 8 % — stark unterrepräsentiert" (Schwelle: < 10 %) |
| ✓ / ✗ | Andachtsreihe (wenn gesetzt) | „6 / 6 Einheiten eingeplant" |
| ✓ / ✗ | Abzeichen (wenn gesetzt) | „8 / 8 Anforderungen abgedeckt" |
| ✓ / ⚠ | Stammkontext (wenn vorhanden) | „2 / 8 Aktivitäten eingebunden" |

**Hinweise** — Planungslücken und strukturelle Ungereimtheiten:

| Icon | Kriterium | Anzeige |
|---|---|---|
| ✓ / ✗ | Leere Treffen | „3 Treffen ohne Programmpunkte" |
| ✓ / ✗ | Ungeklärte Verantwortlichkeiten | „4 Programmpunkte ohne Verantwortliche" |
| ✓ / ⚠ | Zeitbalken | „Treffen 2, 5: Zeitbalken außerhalb grünem Bereich" |
| ✓ / ⚠ | Überhang | „3 Programmpunkte im Überhang" |

**Ikonographie:**
- `✗` — hartes Kriterium, Button bleibt disabled
- `⚠` — weiches Kriterium, Button bleibt aktiv
- `✓` — erfüllt

Wenn alles erfüllt:
```
── Ziele ─────────────────────
✓  Andachtsreihe vollständig
✓  Bronzelilie vollständig
✓  Stammkontext: 2 / 8 eingebunden

── Hinweise ──────────────────
✓  Alle Treffen haben Programmpunkte
✓  Alle Verantwortlichkeiten geklärt
```

### 2.3 Harte vs. weiche Kriterien

**Hart (Button disabled):**
- Treffen ohne Programmpunkte
- Programmpunkte mit `verantwortlicherId === undefined` (außer Wegezeit)
- Andachtsreihe unvollständig (wenn gesetzt)
- Abzeichen unvollständig (wenn gesetzt)

**Weich (Warnung, Button aktiv):**
- WB stark unterrepräsentiert (< 10 %, unabhängig ob Schwerpunkt gesetzt)
- WB außerhalb Zielband (wenn Schwerpunkt gesetzt)
- Stammkontext: keine Aktivität eingeplant (0 / n)
- Treffen mit Zeitbalken außerhalb grünem Bereich
- Überhang vorhanden

---

## 3. Exporte

Export-Dropdown öffnet sich beim Klick auf „Zwischenstand exportieren" mit drei Einträgen.

### 3.1 JSON-Export

**Zweck:** Vollständiger Export zur Wiederverwendung oder Archivierung. Kann in Wegbereiter reimportiert werden.

**Inhalt:**
- Das vollständige `Planung`-Objekt
- Denormalisierte `Aktivitaet`-Objekte für alle referenzierten `aktivitaetId`s (damit der Import auch ohne das Repertoire funktioniert)
- `StammKontext`-Snapshot (wenn vorhanden)
- Andachtsreihen-Objekte (wenn zugeordnet)
- Abzeichen-Objekte (wenn zugeordnet)

**Dateiname:** `planung-{name}-{yyyy-MM-dd}.json`

**Implementierung:** `JSON.stringify` + Blob-Download, kein Package nötig.

---

### 3.2 PDF-Export

**Zweck:** Druckbares Dokument zur Weitergabe an das Team oder als Saisonarchiv.

**Library:** `@react-pdf/renderer` — erzeugt echtes PDF mit echtem Text (kein Screenshot-Ansatz).

**Layout (A4, Hochformat):**

#### Titelseite
- Planung-Name (groß, Fraunces-Schrift)
- Zeitraum: `{start} – {ende}`
- Team: Liste der Mitarbeiter-Namen

#### Abschnitt 1 — WB-Übersicht
- Vier Zeilen: körperlich / gesellschaftlich / geistig / geistlich
- Pro Zeile: Prozentwert + Balkendarstellung (Textzeichen)
- Wenn Schwerpunkt gesetzt: Zielwert in Klammern, Ampel-Status

#### Abschnitt 2 — Zielstatus
- Kompakte Liste analog zum Overlay (Ziele + Hinweise)
- Dient als Dokumentation: „Das haben wir erreicht"

#### Abschnitt 3 — Treffenliste (Hauptteil)
Pro Treffen ein Block:

```
── Fr, 07.02.2025 ─────────────────────────────────────────────
  Andacht „Die Bergpredigt"          Andacht   20 min   Max M.
  Geländespiel Nacht-Orientierung    Spiel     45 min   Lena K.
  Rückblick & Logbuch                Ritual    15 min   Spontan
  ── Gesamt: 80 min (85 %) ──────────────────────────────────
```

Felder pro Programmpunkt: Name, Typ-Icon als Text, Dauer, Verantwortliche/r (oder „Spontan" / „–").

#### Abschnitt 4 — Stammkontext-Zusammenfassung (wenn vorhanden)
- Saisonthema + Beschreibung
- Liste der Stammaktivitäten mit Status (eingeplant / nicht eingeplant)

**Dateiname:** `planung-{name}-{yyyy-MM-dd}.pdf`

---

### 3.3 iCal-Export

**Zweck:** Import in Kalender-Apps (Apple Kalender, Google Calendar, Outlook). Ein VCALENDAR-Objekt mit einem VEVENT pro Treffen.

**Offene Frage — Startzeit:** `Treffen` speichert nur `datum: IsoDate`, keine Uhrzeit. `Planung` hat `dauerMinuten` als Standard-Dauer. Optionen:
  - **A)** Feste Default-Zeit (z.B. 17:00 Uhr) + `dauerMinuten` → Endzeit
  - **B)** Ganztags-Events (`DTSTART;VALUE=DATE`)
  - **C)** Startzeit einmalig beim Export abfragen (kleines Modal)

Empfehlung: **Option C** — ein Feld „Beginn um:" im Export-Dialog, vorbelegt mit 17:00. Damit sind die Kalendereinträge sofort nutzbar.

**VEVENT-Felder:**

```
BEGIN:VEVENT
UID:{treffenId}@stammtreff-planer
SUMMARY:{titel || 'Stammtreff'} — {datum als 'EE, dd.MM.'}
DTSTART:{datum}T{startzeit}00
DTEND:{datum}T{endzeit}00
DESCRIPTION:
  Programm:\n
  • {pp.name} ({pp.dauerMinuten} min) — {verantwortlicher | 'Spontan' | '–'}\n
  • ...\n
  \n
  WB: K {k}% · G {g}% · I {i}% · S {s}%
END:VEVENT
```

**Kalender-Metadaten:**

```
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Stammtreff Planer//DE
X-WR-CALNAME:{planungName}
X-WR-TIMEZONE:Europe/Berlin
```

**Dateiname:** `planung-{name}-{yyyy-MM-dd}.ics`

**Implementierung:** Reiner String-Export, kein Package nötig. Blob-Download mit MIME-Type `text/calendar`.

---

## 4. Technische Abhängigkeiten

| Bereich | Package | Begründung |
|---|---|---|
| PDF | `@react-pdf/renderer` | Neues Package — echtes PDF, React-nativ |
| iCal | — | Kein Package, reiner String |
| JSON | — | Kein Package, `JSON.stringify` |

---

## 5. Offene Entscheidungen vor Implementierung

1. **iCal-Startzeit:** Option A (17:00 fest), B (ganztags) oder C (Abfrage im Export-Dialog)?
2. **Abschluss zurücksetzen:** Gibt es einen expliziten „Zurück zu aktiv"-Button, oder reicht ein Hinweistext im Overlay wenn `status === 'abgeschlossen'`?
3. **JSON-Reimport:** Liegt der Import bereits in Phase 15, oder nur der Export? (Reimport ist aufwändiger — separate Phase sinnvoll.)
