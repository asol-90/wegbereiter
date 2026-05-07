# Anforderungsdokument: Stammtreff-Planer

**Version:** 0.3 (Diskussionsstand)  
**Status:** In Erarbeitung

-----

## 1. Zielsetzung

Ein lokales Web-Tool (React + Vite, läuft im Browser), das Leitern von Stammgruppen hilft, ihre Treffen strukturiert zu planen. Mehrere Planungen können gespeichert und bearbeitet werden. Das Tool macht Inhalte, Wachstumsbereiche und Zeitverteilung sichtbar – ohne Automatisierung oder KI, aber mit smarter Sortierung und Visualisierung.

-----

## 2. Technologie

|Aspekt          |Entscheidung                                         |
|----------------|-----------------------------------------------------|
|Frontend        |React + Vite                                         |
|Ausführung      |Lokal im Browser (kein Server)                       |
|Datenspeicherung|IndexedDB (NoSQL, im Browser, kein Dateisystem nötig)|
|App-Wrapper     |Zunächst keine; optional später Electron-Shell       |
|Plattformen     |Mac + Windows (via Browser)                          |
|Export          |PDF, optional iCal                                   |

-----

## 3. Globale Konfiguration

Einmalig app-weit einstellbar (nicht pro Planung):

- **Bundesland** (für Ferien- und Feiertagsabfrage via Online-API)
- **Üblicher Wochentag** der Treffen
- **Üblicher Rhythmus** (z.B. wöchentlich, zweiwöchentlich)

Diese Werte dienen als Defaults bei der Initiierung neuer Planungen und sind dort überschreibbar.

-----

## 4. Kernkonzepte

### 4.1 Planungen

Das Tool verwaltet mehrere **Planungen** als eigenständige Projekte. Der Name einer Planung wird automatisch aus dem Zeitraum generiert (z.B. „September – Dezember 2025”). Planungen können angelegt, geöffnet, bearbeitet, exportiert und importiert werden.

### 4.2 Projekt-Export & Import

Eine Planung kann als JSON-Datei exportiert und auf einem anderen Gerät importiert werden. So kann ein Leiter vorab planen und die Datei beim gemeinsamen Treffen einlesen.

### 4.3 Zeitraum & Rhythmus als Fundament

Zeitraum und Rhythmus sind nach der Initiierung nicht frei editierbar – sie definieren welche Treffen existieren. Änderungen erfolgen nur über eine bewusste Aktion („Planung anpassen”) mit folgenden Konsequenzen:

**Termin fällt weg:**
→ Tool fragt: „Inhalte auf nächsten Termin verschieben (Kaskade) oder löschen?”

- Kaskade: Inhalte rutschen auf den nächsten Termin, dessen Inhalte auf den übernächsten usw.
- Fixierte Treffen unterbrechen die Kaskade
- Nicht unterbringbare Inhalte landen im **Überhang** (sichtbar im Kontext-Panel als offen, mit ⚠-Hinweis)

**Neuer Termin in der Mitte:**
→ Tool fragt: „Inhalte ab hier nach hinten verschieben oder leerer Slot?”

**Fixierung:** Ein Treffen kann per Ketten-Icon fixiert werden – seine Inhalte werden bei Kaskaden übersprungen.

### 4.4 Treffen-Typen

**Reguläre Treffen**

- Werden automatisch aus Zeitraum + Rhythmus generiert
- Ohne Stamm-Kontext: Ferien und Feiertage werden markiert mit Hinweis „Findet das Treffen trotzdem statt?”
- Mit Stamm-Kontext: Stammaktionen sind als geblockte Termine markiert, keine separaten Feiertagswarnungen
- Haben einen strukturierten Planungsbereich (Programmpunkte, WB-Fokus, Andacht, Zeitbudget)

**Extra-Termine**

- Manuell hinzugefügt (aus Trennbalken, Kalender- oder Zeitraumansicht)
- Untertyp *Geplantes Treffen*: läuft wie reguläre Treffen
- Untertyp *Aktion*: freie Planung oder Platzhalter; Detailplanung ist ausgelagert

-----

## 5. UX: Navigation

**Oben links:** Segmented Control mit drei Icons:

- 🏠 Planungsübersicht (Startseite)
- 📅 Terminliste + Kalender (Splitansicht)
- 📋 Nur Terminliste

**Daneben, abgesetzt:** 📚 Repertoire-Button (globale Ebene, planungsübergreifend)

-----

## 6. UX: Startseite (Planungsübersicht)

**Links: Jahreskalender**

- Planungen als farbige Blöcke im Jahresverlauf
- Stamm-Kontext-Abdeckung als dezente Hintergrundfarbe erkennbar
- Klick auf Block → öffnet Planung
- Klick auf leeren Zeitraum → „Neue Planung anlegen?” mit vorausgefülltem Startdatum
- Hover auf Block hebt Planung in der Liste hervor (und umgekehrt)

**Rechts: Planungsliste**

- Chronologisch, jede Planung als kompakte Zeile: Name · Zeitraum · Status
- „Neue Planung”-Button oben

**Zeitraum-Vorschläge bei neuer Planung:**

- Ohne Stamm-Datei: zwei klassische Zeiträume (nach Sommerferien bis Weihnachten / nach Weihnachten bis Sommerferien), berechnet anhand Bundesland
- Mit Stamm-Datei: Zeitraum des Stamm-Kontexts als Vorschlag
- Immer überschreibbar

-----

## 7. UX: Initiierung einer Planung

Mehrstufiger Flow, jeder Schritt eine Seite. „Zurück” und „Weiter” auf jeder Seite.

**Schritt 1 – Basics & Team**

- Zeitraum (von–bis, mit Vorschlag) → Name wird automatisch generiert
- Wochentag + Rhythmus (vorausgefüllt aus globaler Konfiguration, anpassbar)
- Zeitbudget pro regulärem Treffen (Minuten)
- Mitarbeiter-Team (Vorschlag aus letzter Planung, anpassbar)

**Schritt 2 – Stamm-Kontext**

- Stamm-Datei laden (optional)
- Wenn geladen: ausführliche Vorschau – Thema, Zeitraum, Zeitbudget-Abzug, Stammaktionen, importierte Aktivitäten
- Bewusstes „Übernehmen” bevor es weitergeht

**Schritt 3 – Unsere Ziele**
Sprachlich klar: „Was wollen wir in diesem Zeitraum erreichen?”

- Andachtsreihe(n) wählen (aus Bibliothek oder „später festlegen”)
- Abzeichen/Emblem (ja/nein, welches)
- WB-Schwerpunkt (optional, ein oder zwei Bereiche, Formulierung: Ausgewogen / Tendenz / Fokus / Dominant)

**Schritt 4 – Vorschau & Start**

- Generierte Treffen als Liste
- Ohne Stamm-Kontext: Feiertagsmarkierungen + Hinweise sichtbar
- Mit Stamm-Kontext: Stammaktionen markiert, keine separaten Feiertagswarnungen
- Zeitbudget pro Treffen sichtbar (inkl. Stamm-Abzug)
- „Planung starten”-Button

-----

## 8. UX: Planungsansicht

### 8.1 Zweigeteilte Hauptansicht (Laptop-optimiert)

**Links (~60%): Treffen-Liste**

- Chronologische Liste aller Treffen als Karten
- Karten wachsen mit ihrem Inhalt – kein Aufklappen nötig
- Zwischen zwei Treffen: dezenter Trennbalken mit Zeitangabe (z.B. „2 Wochen”) → klickbar → zeigt Zeitraum-Ausschnitt + Button „Extra-Termin anlegen”
- Fixierte Treffen zeigen Ketten-Icon

**Rechts (~40%): Kontext-Panel**
Vier einklappbare Blöcke:

1. **WB-Verteilung** (siehe 8.2)
2. **Andachtsreihe** – Einheiten als Liste, per D&D auf Treffen ziehbar
3. **Abzeichen** – Anforderungen als Liste, per D&D auf Treffen ziehbar
4. **Stamm-Kontext** – Thema + nächste Stammaktionen

### 8.2 WB-Panel

- **Donut-Chart** zeigt Ist-Verteilung der vier Bereiche (berechnet live aus allen Programmpunkten)
- Darunter Legende als Zeilen; wenn Ziel gesetzt, Fortschrittsbalken mit Charakterisierung:

```
● körperlich       ████░░░░  Tendenz
● gesellschaftlich █████░░░  Fokus ✓
● geistig          ███░░░░░  Ausgewogen
● geistlich        ████░░░░  Tendenz
```

- WB-Schwerpunkt der Planung kann **ein oder zwei Bereiche** umfassen

### 8.3 WB-Charakterisierung (wertneutral, vier Stufen)

|Stufe        |Bedeutung                            |
|-------------|-------------------------------------|
|Ausgewogen   |Alle Bereiche roughly gleichgewichtig|
|Tendenz [WB] |Leichte Abweichung                   |
|Fokus [WB]   |Deutliche Gewichtung                 |
|Dominant [WB]|Stark ausgeprägte Einseitigkeit      |

Gleiche Sprache für Ziel (Initiierung) und Ist-Auswertung. Keine Wertung – „Dominant körperlich” kann bewusst gewünscht sein.

### 8.4 Drag & Drop aus dem Kontext-Panel

- Andachtseinheiten und Abzeichen-Anforderungen per D&D auf Treffen ziehbar
- **Einmalige Inhalte** (Andacht): nach Zuweisung mit Datum markiert, nicht mehr ziehbar; direkt auf anderes Treffen ziehbar (verschiebt Zuweisung); × zum Aufheben
- **Wiederholbare Inhalte** (Abzeichen): bleiben immer ziehbar; zeigen Counter + Tooltip mit Daten (z.B. `2× ⓘ`)
- „Auto-verteilen”-Button: weist Einheiten der Reihe nach den offenen Treffen zu
- **Überhang**: nicht unterbringbare Inhalte bleiben als offen im Panel (⚠ kein Termin verfügbar)

-----

## 9. UX: Treffen-Karte

### 9.1 Aufbau

```
🔗  Fr 14.11.                         [WB-Icons]
    "Das Licht der Welt"              ← Titel (editierbar, optional)
    📝 ___________________________    ← Notiz (eingeklappt; Icon zeigt ob vorhanden)

    ⠿  Andacht · Licht der Welt · Max · 20 min
    ⠿  Taschenlampen-Spiel · Lisa · 30 min
    ⠿  Wegezeit · 15 min
    ─────────────────────────────────
    ████████████░  65/90 min

    + Punkt hinzufügen
```

- `⠿` = Drag-Handle für Reihenfolge per D&D
- `🔗` = Ketten-Icon für Fixierung (nur wenn aktiv sichtbar)
- Zeitbalken: grün ab 80% der verfügbaren Zeit (Schwelle in Planungs-Settings anpassbar), rot bei Überschreitung
- Titel: optional, aber dezenter Platzhaltertext „Titel hinzufügen…” wenn leer – einladend, nicht aufdringlich

### 9.2 WB-Icons auf der Karte

- **Blass**: Ist-Zustand (berechnet aus Programmpunkten)
- **Präsent**: Soll-Fokus für dieses Treffen (per Klick auf Icon setzbar, ein oder zwei Bereiche)
- Beide am gleichen Ort, kein extra Panel nötig

### 9.3 Programmpunkte

Jeder Punkt zeigt:

- Typ-Icon · Name · Verantwortliche(r) · Dauer (inline editierbar)
- × zum Entfernen

Typen:

- **Aktivität** (aus Repertoire oder ad-hoc) – hat WB-Tags
- **Wegezeit** – schlanker Typ, nur Name + Dauer, kein WB, keine Verantwortlichen

### 9.4 Andacht als Programmpunkt

Andacht ist ein normaler Programmpunkt vom Typ „Andacht”, mit Sonderverhalten im Command-Menu:

- **Reihe aktiv** → Auswahl aus offenen Einheiten der Reihe → Titel wird automatisch als Treffen-Titel übernommen (editierbar)
- **Keine Reihe** → Freitextfeld für Titel/Thema

### 9.5 Punkt hinzufügen: Command-Menu

`+` öffnet ein Spotlight-artiges Overlay:

- Fokus sofort auf Suchfeld, Keyboard-first
- Tippen filtert live durch Repertoire
- Ergebnisse: Name · Typ-Icon · WB-Tags · Zeitrichtwert
- Sortiert nach WB-Fokus des Treffens (falls gesetzt)
- Filter-Chips oben: `Alle · Andacht · Spiel · Basteln · Wegezeit · …`
- Letzter Eintrag: „Neu anlegen” → Name, WB, Zeit eingeben → wird als temporärer Eintrag (⏱) ins Repertoire aufgenommen
- Escape schließt

### 9.6 Mitarbeiter pro Treffen

- Standard: alle Mitarbeiter der Planung verfügbar
- Abweichung: einzelne Mitarbeiter als „nicht verfügbar” markieren
- Gast-Mitarbeiter: einmalig für dieses Treffen eintragbar (nur Name), erscheinen nicht in der Planungs-Mitarbeiterliste
- Konflikt: Mitarbeiter bereits zugewiesen aber als nicht verfügbar markiert → Warn-Icon am betroffenen Programmpunkt

-----

## 10. UX: Repertoire-Verwaltung

Globale Ebene – planungsübergreifend. Erreichbar über Repertoire-Button in der Navigation.

**Links: Aktivitätenliste**

- Suchfeld oben
- Filter-Chips: `Alle · Andacht · Spiel · Basteln · …`
- Weitere Filter: WB-Bereich · Quelle (Eigene / Vorinstalliert / Stamm-Import / Temporär ⏱)
- Hinweis wenn temporäre Einträge zur Übernahme bereit: „3 temporäre Aktivitäten zur Übernahme”

**Rechts: Detail / Bearbeitung**

- Klick auf Aktivität öffnet Detail inline
- Felder: Name · Typ · WB-Tags · Themen-Tags · Zeitspanne (min–max) · Stufenbezug · Notizen
- Löschen: nur bei eigenen Einträgen; vorinstallierte + Stamm-Importe nur deaktivierbar

**Andachtsreihen** als eigener Tab:

- Reihen als Liste, aufklappbar → Einheiten sichtbar
- Neue Reihe anlegen, Einheiten hinzufügen und sortieren

**Neue Aktivität:** + Button oben → schlankes Formular

-----

## 11. Repertoire: Datenstruktur

|Feld             |Beschreibung                                                                |
|-----------------|----------------------------------------------------------------------------|
|Name             |Bezeichnung der Aktivität                                                   |
|Typ              |Andacht / Spiel / Basteln / Gebet / Gespräch / Wegezeit / …                 |
|Wachstumsbereiche|Tags: körperlich / gesellschaftlich / geistig / geistlich (Mehrfach möglich)|
|Themen-Tags      |Freie Schlagworte (z.B. „Licht”, „Abenteuer”, „Gemeinschaft”)               |
|Stufenbezug      |Zuordnung zu Abzeichen-/Emblem-Anforderungen (optional)                     |
|Zeitspanne       |Richtwert in Minuten (min–max, z.B. 15–45)                                  |
|Quelle           |Eigene / Vorinstalliert / Stamm-Import / Temporär                           |
|Notizen          |Beschreibung, Material, Hinweise                                            |

### Vorinstallierte Inhalte

- Aktivitäten zu **RR-Emblem-Werten**
- Aktivitäten zu **Tieren** (thematische Reihe)
- Weitere Reihen später über zentrales Web-Repository nachladbar (Zukunft)

### Temporäre vs. permanente Einträge

- Ad-hoc eingetragene Aktivitäten erscheinen mit ⏱ Icon – temporär, gebunden an die Planung
- Per Klick: „In Repertoire übernehmen?” → planungsübergreifend permanent
- Verschwinden wenn Planung gelöscht wird (sofern nicht übernommen)

-----

## 12. Andachtsreihen

- **Vorgespeicherte Reihen**: RR-Emblem-Werte, Tiere, weitere
- **Eigene Reihen** anlegen mit einzelnen Einheiten (Titel, Thema, Bibelstelle o.ä.)
- Reihenfolge der Einheiten optional (erkennbar am Namen: „1 – Wachsam”, „2 – Rein”)
- Zuteilung zu Treffen per D&D im Kontext-Panel oder über Command-Menu

-----

## 13. Stamm-Kontext

### 13.1 Stamm-Datei (Import)

Eine JSON-Datei vom Stammführer, importiert bei Initiierung oder nachträglich. Enthält:

- **Übergeordnetes Thema** der Saison + Zeitraum
- **Zeitbudget-Abzug** pro regulärem Treffen (Stamm-Zeit)
- **Stammaktionen**: geblockte Termine (Team-Zeit entfällt)
- **Eigene Aktivitäten** passend zum Thema (ins Repertoire importiert, als „Stamm-Import” erkennbar)
- **Themen-Tag**, der automatisch an passenden Aktivitäten hängt

### 13.2 Auswirkungen auf die Planung

- Zeitbudget pro Treffen automatisch um Stamm-Zeit reduziert
- Stammaktionen als Platzhalter im Kalender
- Keine separaten Feiertagswarnungen in Vorschau und Planung
- Stamm-Kontext auf Startseite als dezente Hintergrundfarbe im Jahreskalender sichtbar

*Hinweis: Ein eigenes Stamm-Planungsmodul ist denkbar, aber abhängig von Akzeptanz des Tools.*

-----

## 14. Mitarbeiter & Verantwortlichkeiten

- Team wird bei Initiierung angelegt; Vorschlag aus letzter Planung
- Pro Programmpunkt: verantwortliche Person zuweisen (freie Zuweisung, keine fixen Rollen)
- Pro Treffen: Verfügbarkeit anpassen (nicht verfügbar markieren, Gast-Mitarbeiter eintragen)
- Konflikte werden mit Warn-Icon sichtbar gemacht

-----

## 15. Ferien & Feiertage

- Abfrage über Online-API für Deutschland
- Bundesland in globaler Konfiguration hinterlegt
- Ohne Stamm-Kontext: Markierung in Treffen-Liste + Vorschau
- Mit Stamm-Kontext: Stammaktionen ersetzen separate Feiertagswarnungen

-----

## 16. Planungsansätze

Das Tool unterstützt drei gedankliche Ausgangspunkte:

|Ansatz              |Ausgangspunkt                              |Logik                                              |
|--------------------|-------------------------------------------|---------------------------------------------------|
|WB-zentriert        |„Dieses Treffen soll gesellschaftlich sein”|WB-Fokus setzen → Repertoire sortiert sich         |
|Andachts-zentriert  |„Wir machen eine Andacht zu Licht”         |Thema wählen → thematisch getaggte Aktivitäten oben|
|Lerninhalt-zentriert|Anforderungen für Abzeichen/Emblem         |Stufenbezug als Sortierung im Repertoire           |

-----

## 17. Export

|Format         |Inhalt                                                   |
|---------------|---------------------------------------------------------|
|PDF            |Planungskalender mit Inhalten, Verantwortlichen, Zeitplan|
|iCal (optional)|Termine für Kalender-Import                              |

-----

## 18. Offene Punkte

- **Treffen-Typen / Ablauf-Raster**: Welche typischen Strukturen gibt es? (Brainstorming ausstehend)
- **Abzeichen-Anforderungen**: Welche Inhalte werden fest hinterlegt?
- **Zentrales Web-Repository** für Aktivitäten/Reihen (Zukunft)
- **Stammebene** im Tool: nur bei ausreichender Akzeptanz

-----

*Dokument wird laufend aktualisiert.*