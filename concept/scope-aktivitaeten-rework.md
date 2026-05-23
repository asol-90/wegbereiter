# Scope: Aktivitäten & Repertoire — Konzeptionelles Rework

**Status:** Entwurf (Stand 23.05.2026)
**Bezug:** Hauptkonzept §10–11, aktuelle Implementierung in `src/domain/`, `src/features/repertoire/`

---

## 1. Problemstellung

Die aktuelle Umsetzung von Aktivitäten und Repertoire hat mehrere konzeptionelle Schwächen:

1. **Unklare Abstraktionsebene:** Aktivitäten im Repertoire mischen Kategorien (z.B. „Kooperationsspiel") mit konkreten Vorlagen (z.B. „Strickleiter"). Es fehlt eine saubere Trennung zwischen dem, was das System vorgibt (Taxonomie), was der Nutzer kuratiert (Repertoire) und was im Treffen tatsächlich passiert (Programmpunkt).

2. **Duplikate:** Es gibt keine Prüfung, ob eine Aktivität gleichen Namens bereits existiert. Duplikate mit exakt identischem Namen entstehen ungehindert.

3. **Inline-Umbenennung verändert die Vorlage:** Wenn ein Programmpunkt im Treffen umbenannt wird, verändert das die zugrunde liegende Aktivität — statt nur eine lokale Annotation zu sein.

4. **Falsches Abhaken von Zielen:** Andachtsreihen-Einheiten und Abzeichen-Anforderungen werden als erfüllt markiert, sobald ein Programmpunkt gleichen *Typs* im Treffen steht — ohne explizite Verlinkung. Das erzeugt false positives.

5. **Unübersichtliches Repertoire-UI:** Die Verwaltung ist schwer nutzbar, Filter und Struktur sind nicht intuitiv.

6. **WB unsichtbar auf Programmpunkt-Ebene:** Welchen WB-Beitrag ein einzelner Programmpunkt leistet, ist in der Treffen-Karte nicht erkennbar. Der Planer sieht nur die Aggregation im Donut.

---

## 2. Drei-Ebenen-Modell

Das Rework führt ein klar geschichtetes Modell ein:

### Ebene 1 — Taxonomie (System)

Systemseitig definierte Typen und Untertypen mit WB-Defaults. Nicht vom Nutzer veränderbar.

Dient als Planungs-Vokabular: „Ich brauche hier ein Spiel zum Auspowern" → `spiel-sport / auspowern`.

### Ebene 2 — Repertoire (Nutzer-kuratiert)

Wiederverwendbare Aktivitäts-Vorlagen, die der Nutzer anlegt oder importiert. Eine Vorlage hat einen konkreten Namen, verfeinerte WB-Werte, Zeitangaben, Notizen und Themen-Tags. Das Repertoire ist planungsübergreifend.

Perspektivisch kann das Repertoire teamübergreifend geteilt werden (geteiltes Repertoire).

### Ebene 3 — Programmpunkt im Treffen

Was tatsächlich im Treffen stattfindet. Verschiedene Ausprägungen (siehe §3).

**Kernregel:** Ebene 2 (Repertoire) ist optional. Ein Planer kann auf Ebene 1 bleiben (abstrakt planen) und erst bei Bedarf auf Ebene 2 konkretisieren. Die Konkretisierung ist ein organischer Übergang, keine explizite Aktion.

---

## 3. Programmpunkt-Typen (Ebene 3)

| Kind | Beschreibung | WB-Quelle |
|---|---|---|
| `abstrakt` | Nur Typ/Untertyp, kein konkreter Inhalt. Platzhalter. | Taxonomie-Defaults |
| `konkret-vorlage` | Referenziert eine Aktivität aus dem Repertoire (Ebene 2). | WB der Vorlage |
| `konkret-lokal` | Lokale Kopie mit eigenen WB-Werten — entstanden durch Konkretisierung eines abstrakten Punkts oder durch Anpassung einer Vorlage. | Eigene WB-Werte |
| `zeitblock` | Strukturelement für Wege, Pausen, Umbauten etc. Freier Name. Kein WB-Beitrag. | — (keine WB) |

### Annotation vs. Konkretisierung

**Annotation** ist leichtgewichtig: Ein abstraktes „Spiel / Auspowern" bekommt einen Freitext-Zusatz, z.B. „Spiel / Auspowern: Capture the Flag". Die WB-Werte bleiben unverändert (Taxonomie-Defaults). Es entsteht keine neue Aktivität.

**Konkretisierung** greift tiefer: Sobald der Nutzer WB-Werte anpasst oder eine Repertoire-Vorlage zuweist, wird der Programmpunkt konkret. Der Übergang ist fließend — getriggert durch die passive Sichtbarkeit der WB-Werte am Programmpunkt (siehe §6).

---

## 4. Neue Taxonomie

Untertypen sind wo sinnvoll **intentionsbasiert** (Spiel/Sport, Andacht/Gespräch) oder **kompetenzbasiert** (Pfadfindertechnik).

### Andacht/Gespräch
Intentionen: Gott begegnen, Bibel entdecken, Gegenseitig stärken, Einander hören

### Musik/Lobpreis
Keine Untertypen (selten genug, dass Differenzierung keinen Planungswert hat).

### Spiel/Sport
Intentionen: Auspowern, Zusammenwachsen, Herausfordern, Abenteuer
(Geländespiel/Stationenlauf gehört zu „Abenteuer".)

### Basteln/Bauen
Keine Untertypen.

### Kochen/Essen
Keine Untertypen.

### Pfadfindertechnik
Kompetenzen: Camp, Knoten/Bünde, Feuer, Orientierung, Erste Hilfe, Naturkunde, Stufenarbeit

### Wandern/Exkursion
Keine Untertypen.

### Dienst/Nächstenliebe
Keine Untertypen.

### Stammformat
System-Typ, nicht vom Nutzer wählbar. Entsteht ausschließlich durch Stammkontext-Import.

### Sonstiges
Keine Untertypen. Auffang für alles, was nicht passt.

### Entfernt: Wegezeit
„Wegezeit" ist kein Aktivitätstyp mehr, sondern wird durch den strukturellen Programmpunkt-Typ `zeitblock` ersetzt (siehe §3).

---

## 5. Duplikatprüfung

Beim Anlegen oder Importieren einer Aktivität wird ein Hash aus `typ + untertyp + name` (normalisiert, lowercase, trimmed) geprüft. `untertyp` fließt ein, damit z.B. „Andacht: Dankbarkeit" und „Austausch: Dankbarkeit" nicht als Duplikat gelten.

Bei Duplikat-Fund: Inline-Hinweis unter dem Namensfeld („Eine Aktivität mit diesem Namen existiert bereits") mit Link/Button „Bestehende verwenden". Der Nutzer kann die neue Aktivität trotzdem speichern — kein harter Block. So werden versehentliche Duplikate verhindert, bewusste Varianten aber zugelassen. Kein Merge-Dialog (zu komplex für die Zielgruppe).

---

## 6. WB-Visualisierung pro Programmpunkt — WB-Segmente

Jeder Programmpunkt in der Treffen-Karte zeigt seinen WB-Beitrag über vier gestapelte Segment-Spalten:

- **Position:** Rechts in der Zeile, direkt vor dem Edit-Button (WB und Edit bilden eine zusammenhängende „Bearbeitungszone")
- **Layout:** 4 Spalten nebeneinander (K, G, I, S), jeweils in der zugehörigen WB-Farbe (`--wb-k`, `--wb-g`, `--wb-i`, `--wb-s`)
- **Segmente:** Pro Spalte 0–3 Segmente, gestapelt von unten nach oben
  - 0 Segmente = leerer Rahmen (kein Beitrag)
  - 1 Segment = `intensity 0.33`
  - 2 Segmente = `intensity 0.66`
  - 3 Segmente = `intensity 1.0`
- **Proportionen:** Segmente sind breiter als hoch (ca. 8×4px) — kompakte flache Blöcke, keine Akku-Silhouette
- **Sichtbarkeit:** Auch abstrakte Punkte (Kategorien) zeigen die WB-Presets bei voller Opacity — kein Dimmen

**Zweck:** Die passive Sichtbarkeit der WB-Beiträge erzeugt den organischen Trigger für Konkretisierung. Der Edit-Button direkt daneben lädt zur Anpassung ein. Zeitblöcke zeigen keine WB-Segmente (Spalte bleibt leer, um das Grid-Alignment zu erhalten).

---

## 7. Ziel-Tracking: Explizite Verlinkung

### Andachtsreihen
Eine Andachtsreihen-Einheit gilt nur als abgedeckt, wenn ein Programmpunkt eine explizite `andachtsEinheitId` trägt. Typ-Matching allein reicht nicht.

### Abzeichen
Eine Abzeichen-Anforderung gilt nur als erfüllt, wenn ein Programmpunkt einen expliziten `stufenbezug` (Referenz auf `AbzeichenAnforderungId`) trägt. Nicht über Typ-Matching.

---

## 8. Zeitblock (ersetzt Wegezeit)

`Zeitblock` ist ein eigenes `kind` auf Programmpunkt-Ebene (nicht in der Taxonomie):

- Freies Namensfeld (z.B. „Anfahrt", „Pause", „Umbau")
- Dauer in Minuten
- Kein WB-Beitrag, kein Typ, kein Untertyp
- Wird im Zeitbudget berücksichtigt, aber nicht in der WB-Auswertung

---

## 9. Entscheidungen & offene Fragen

### 9.1 Spotlight / Command Menu ✔

Gemischte Liste (keine Zwei-Spalten-Aufteilung), gruppiert durch Section-Header.

**Begriffe:** „Kategorien" für Taxonomie-Einträge (Ebene 1), „Aktivitäten" für Repertoire-Vorlagen (Ebene 2). Beide Begriffe beschreiben was man bekommt (nicht woher es kommt).

**Zustände:**

1. **Top-Level** (kein Query, kein Drill): Liste aller Typen mit grossen monochromen Icons (18–20px, `--t2`). Keine farbigen Icon-Hintergründe — der Farbraum bleibt frei für Stamm/Team/Region/WB. Typen mit Untertypen zeigen Chevron → Drill-Down. Unter einer Trennlinie: Zeitblock-Eintrag.

2. **Drill-Down** (Typ gewählt): Section „Kategorien" zeigt „(Typ) allgemein" + Untertypen/Intentionen. Section „Aktivitäten" zeigt passende Repertoire-Vorlagen mit Metadaten-Subline (Dauer) und WB-Segmenten. Keine Zeitspanne aus dem Repertoire in der Subline — die tatsächliche Dauer steht in der Treffen-Zeile.

3. **Suche** (Freitext): Gemischte Ergebnisse, Section-Header „Kategorien" und „Aktivitäten" trennen die Ebenen. Bei keinen Treffern: Fallback-Zeile „‚{query}' als Sonstiges eintragen".

**WB-Segmente im Spotlight:** Repertoire-Einträge zeigen ihre WB-Segmente direkt in der Ergebniszeile. Kategorien zeigen keine (die Presets kommen erst nach Auswahl ins Treffen).

**Zeitblock:** Eigener Eintrag am Ende der Top-Level-Liste. Anlage über ein kompaktes Inline-Formular (Name + Dauer) mit Schnellwahl-Chips (Anfahrt, Pause, Umbau, Rückweg).

**Alterseignung (MinStufe):** Repertoire-Einträge zeigen die Stufe als Kürzel in der Metadaten-Subline (z.B. „Pfadfindertechnik · 15–30 min · KS+"), aber nur wenn die Einschränkung nicht „alle" ist. Perspektivisch: automatische Sortierung/Ausgrauung basierend auf der Gruppenstufe der Planung.

### 9.2 Duplikatprüfung ✔

Siehe §5 (aktualisiert). Warnen und bestehende vorschlagen, aber nicht blockieren.

### 9.3 Repertoire-UI Redesign — offen

Noch nicht im Detail konzipiert, eigene Session. Grundrichtung:

- Primäre Gruppierung nach Typ (entspricht der Planungs-Frage „Welche Spiele habe ich?")
- Quelle (`eigene | vorinstalliert | stamm-import`) als sekundärer Filter, nicht als Gruppierung
- Untertypen als Tabs/Chips innerhalb einer Typ-Gruppe
- Drei Tabs auf der Repertoire-Seite: Aktivitäten / Andachtsreihen / Abzeichen (keine globale Cross-Entity-Suche)
- temporär→permanent: Visueller Marker + Aktion „Ins Repertoire übernehmen" per Klick

### 9.4 Programmpunkt-Bearbeitungsflow ✔

#### Zeilen-Layout (8-Spalten-Grid)

```
drag | icon | label(2-zeilig) | avatar | dauer | wb-segmente | edit | delete
14px   20px   1fr               24px     48px    36px          20px   14px
```

Die Programmpunkt-Zeile ist bewusst höher als bisher — Platz für einen Zwei-Zeiler im Label-Bereich.

#### Zwei-Zeiler: Beschreibung + Kategorie

Die Reihenfolge ist stabil — Beschreibung immer oben, Kategorie immer unten. Nur Grössen und Farben ändern sich je nach Zustand:

**Unbeschriftet (Kategorie ohne Annotation):**
- Oben: Platzhalter (13px, `--t3`, kursiv) — dynamisch formuliert als Frage: „Wie auspowern?", „Wie konkret?" (basierend auf Typ/Intention)
- Unten: Kategorie (12px, `--t1`, prominent) — z.B. „Spiel/Sport · Auspowern"
- Die Kategorie ist die Information, der Platzhalter die Einladung zum Beschriften

**Beschriftet (Annotation oder konkreter Name):**
- Oben: Name (14px, `--t1`, prominent) — z.B. „Brennball", „Capture the Flag"
- Unten: Kategorie (10px, `--t3`, dezent) — z.B. „Spiel/Sport · Auspowern"
- Bei Repertoire-Vorlagen zusätzlich Dauer in der Subline, aber keine Zeitspanne aus dem Repertoire (redundant zur Dauer-Spalte)
- Bei Tracking-Bezügen: „Andachtsreihe: Johannes-Evangelium" oder „Abzeichen: Seefahrer · Anforderung 3/8"

**Übergang beim Klick auf den Platzhalter:** Kategorie schrumpft von 12px/`--t1` auf 10px/`--t3` (animiert, ~200ms ease), Cursor springt ins Namensfeld oben. Keine Hintergrund-Hervorhebung der Zeile. Nach Eingabe und Blur: Name steht oben, Kategorie bleibt unten — gleiche Position, nur neue Gewichtung.

#### Verantwortlicher: Avatar statt Name

Initialen-Kreis (22px) aus dem bestehenden Avatar-System. Kein zugewiesener Verantwortlicher = gestrichelter leerer Kreis. Voller Name per Tooltip bei Hover.

#### Annotation (leichtgewichtig, inline)

Klick auf den Platzhalter oder den Namen macht das Namensfeld editierbar. Der Punkt bleibt abstrakt, WB-Presets bleiben unverändert. Es entsteht keine neue Aktivität — nur der Anzeigename ändert sich.

#### WB-Bearbeitung und Konkretisierung (Overlay)

Der Edit-Button (Bleistift-Icon) ersetzt den bisherigen Konkretisieren-Button (Crosshair). Er öffnet die rechte Spalte des Repertoire-Detailbereichs als Overlay (nicht inline in der Zeile). Dort: WB-Slider, Zeitangaben, Notizen, Themen-Tags, Repertoire-Vorlage zuweisen. Sobald WB-Werte angepasst werden, wird der Punkt automatisch `konkret-lokal`. Der Edit-Button funktioniert für alle Punkt-Typen gleich (Kategorien, Aktivitäten) — ein einheitlicher Einstieg statt eines Sonder-Buttons nur für abstrakte Punkte.

#### Zeitblock-Zeile

Gleiches Grid wie normale Programmpunkte, aber: Clock-Icon statt Typ-Icon, Name in `--t2`, keine WB-Spalte (unsichtbar gehalten für Alignment), gestrichelter leerer Avatar-Kreis.

### 9.5 Geteiltes Repertoire (Zukunft)

Nicht Teil dieses Reworks, aber berücksichtigt im Modell: Aktivitäten könnten perspektivisch teamübergreifend geteilt werden. Das Drei-Ebenen-Modell ist darauf vorbereitet (Taxonomie = global, Repertoire = teilbar, Programmpunkt = lokal). Vorbedingung: `quelle`-Property um `'geteilt'` erweiterbar, Repertoire-Store-Interface unterstützt read-only-Referenzen für geteilte Aktivitäten.

---

## 10. Betroffene Dateien (Implementierung)

| Bereich | Dateien | Änderungsumfang |
|---|---|---|
| Taxonomie | `aktivitaetKatalog.ts` | Komplett-Rewrite: neue Typen, Untertypen, WB-Matrix, Labels, Icons |
| Domain-Typen | `types.ts`, `wb.ts` | Neues `ProgrammpunktKind`-Enum, `Zeitblock`-Typ, Annotation-Feld |
| Starter-Katalog | `starterKatalog.ts` | Neue vorinstallierte Aktivitäten auf Basis neuer Taxonomie |
| Repertoire Store | `repertoireStore.ts` | Duplikatprüfung, ggf. neue Methoden |
| Repertoire UI | `RepertoirePage.tsx`, `AktivitaetenListe.tsx`, `AktivitaetDetail.tsx` | Redesign |
| Import | `repertoireImport.ts` | Neue Taxonomie-Validierung, Migration alter Typen |
| Treffen-Karte | `TreffenCard`, `SortableProgrammpunktRow`, `ProgrammpunktFields` | 8-Spalten-Grid, WB-Segmente, Zwei-Zeiler, Avatar, Edit-Overlay |
| Spotlight | `AddPunktSpotlight`, `addPunktItems` | Kategorien/Aktivitäten-Sections, WB im Drill-Down, Zeitblock-Formular |
| Ziel-Tracking | Andachts-/Abzeichen-Fulfillment-Logik | Umstellung auf explizite ID-Verlinkung |
| DB-Schema | `db.ts` | Migration für neue Typen, Zeitblock |
