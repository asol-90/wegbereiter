# Konzept: Planungsziele & Kontextleiste

## Überblick

Die Kontextleiste (rechter Panel in Kalender- und Listenansicht) zeigt vier Sektionen:

1. **Wachstumsbereiche** — immer sichtbar, live berechnet
2. **Andachtsreihe** — optional, wenn bei Initialisierung gesetzt
3. **Abzeichen** — optional, wenn bei Initialisierung gesetzt
4. **Stamm-Kontext** — optional, wenn Stamm-Import vorhanden

Sektionen 2–4 fehlen vollständig wenn keine Daten vorliegen (kein Platzhalter).

---

## 1. Wachstumsbereiche

### 1.1 Anzeige

- **Donut-Chart**: Ist-Verteilung der vier WB, live berechnet aus allen Programmpunkten der Planung
- **Legende**: vier Zeilen (körperlich / gesellschaftlich / geistig / geistlich), jeweils mit Fortschrittsbalken
- Wenn ein WB-Schwerpunkt gesetzt ist: Zielband im Balken (grau hinterlegt, ±5 pp um Zielwert)
- **Charakterisierungs-Label** pro WB-Zeile (wertneutral, vier Stufen — siehe 1.3)

### 1.2 WB-Schwerpunkt (Zieleingabe bei Initialisierung)

Der Nutzer wählt einen von fünf Modi. Alle Angaben sind optional.

| Modus | Eingabe | Beschreibung |
|---|---|---|
| Ausgewogen | — | Alle vier WB gleichgewichtig |
| Tendenz | 1–2 WB-Keys | Gewählte WB leicht betont |
| Fokus | 1 WB-Key | Ein WB deutlich gewichtet |
| Haupt+Neben | 2 WB-Keys (Haupt + Neben) | Einer führt, einer unterstützt |
| Dominant | 1 WB-Key | Ein WB stark ausgeprägt |

**UI-Regel**: Bei Fokus/Dominant ist nur ein WB wählbar; bei Tendenz bis zu zwei; bei Haupt+Neben genau zwei mit expliziter Haupt/Neben-Unterscheidung; bei Ausgewogen keine Auswahl.

### 1.3 Zielverteilungen (fest hinterlegt, ±5 pp Toleranz)

| Modus | WB-Rolle | Zielwert | Intervall |
|---|---|---|---|
| Ausgewogen | alle | 25 % | [20, 30] |
| Tendenz (1 WB) | betont | 33 % | [28, 38] |
| | Rest (×3) | 22 % | [17, 27] |
| Tendenz (2 WB) | betont (×2) | 30 % | [25, 35] |
| | Rest (×2) | 20 % | [15, 25] |
| Fokus | betont | 40 % | [35, 45] |
| | Rest (×3) | 20 % | [15, 25] |
| Haupt+Neben | Haupt | 40 % | [35, 45] |
| | Neben | 33 % | [28, 38] |
| | Rest (×2) | 13 % | [8, 18] |
| Dominant | betont | 50 % | [45, 55] |
| | Rest (×3) | 17 % | [12, 22] |

### 1.4 Charakterisierungs-Stufen

Gleiche Sprache für Ziel (Initiierung) und Ist-Auswertung. Keine Wertung.

| Stufe | Bedeutung |
|---|---|
| Ausgewogen | Alle Bereiche roughly gleichgewichtig |
| Tendenz [WB] | Leichte Abweichung |
| Fokus [WB] | Deutliche Gewichtung |
| Dominant [WB] | Stark ausgeprägte Einseitigkeit |

---

## 2. Andachtsreihe

### 2.1 Konzept

Eine geordnete Liste von Andachts-Einheiten, die bei Planungs-Initialisierung optional gesetzt wird. Die Reihenfolge ist bedeutsam, aber variierbar.

### 2.2 Anzeige in der Leiste

- Titel der Reihe als Meta-Label
- Jede Einheit als Zeile mit:
  - Häkchen (✓) wenn ≥1× einem Treffen zugewiesen, sonst offener Kreis
  - Label der Einheit
  - Counter (`0×` / `1×` / `2×` …)
  - Tooltip bei ≥1×: Datumslist der zugewiesenen Treffen
- Drag-Handle zum manuellen Umsortieren

### 2.3 Interaktion

- **Drag auf Treffen**: Einheit wird als Programmpunkt vom Typ `andacht` (ohne Subkategorie) eingefügt. Subkategorie wird auf der Treffenkarte gesetzt.
- **Mehrfachzuweisung** erlaubt (z.B. zwei Treffen zur selben Einheit aus verschiedenen Perspektiven)
- **Counter** zählt alle Vorkommen, Häkchen ab ≥1×

### 2.4 Reihenfolge-Warnung

Wenn die Treffen-Daten der zugewiesenen Einheiten nicht mit der Einheiten-Reihenfolge übereinstimmen, zeigt die Leiste eine Warnung. Dialog bietet zwei Aktionen:

- **Einheiten umsortieren**: Reihenfolge in der Leiste wird an die Treffen-Daten angepasst
- **Termine umsortieren**: Programmpunkte werden zwischen Treffen verschoben, sodass sie zur Einheiten-Reihenfolge passen

Grundlage des Vergleichs: erstes Vorkommen je Einheit.

### 2.5 Datentyp

```ts
export interface AndachtsEinheit {
  id:    AndachtsEinheitId;
  label: string;
}

export interface AndachtsReihe {
  titel:     string;
  einheiten: AndachtsEinheit[];   // Reihenfolge bedeutsam
}
```

---

## 3. Abzeichen

### 3.1 Konzept

Ein Abzeichen = eine Stufe mit konkreter Anforderungsliste (z.B. „Bronzelilie"). Wird bei Planungs-Initialisierung optional gewählt. Erstmal singular; Array später erweiterbar (für gemischte Gruppen).

### 3.2 Anzeige in der Leiste

- Abzeichen-Name als Label
- Jede Anforderung als Zeile mit:
  - Häkchen (✓) wenn ≥1× einem Treffen zugewiesen, sonst offener Kreis
  - Anforderungstext
  - Counter (`0×` / `1×` …)
  - Tooltip bei ≥1×: Datumslist der zugewiesenen Treffen

### 3.3 Interaktion

- **Drag auf Treffen**: Anforderung wird als Programmpunkt mit der entsprechenden Aktivitätskategorie eingefügt, Dauer = Mittelwert aus Zeitspanne [min, max]
- **Mehrfachzuweisung** erlaubt (Themen dürfen mehrfach adressiert werden)
- **Keine Reihenfolge-Logik** (im Gegensatz zur Andachtsreihe)

---

## 4. Stamm-Kontext

### 4.1 Konzept

Wenn ein Stamm-Import vorliegt, zeigt die Leiste Thema und Aktivitäten des Stamms. Kein eigener Ziel-Typ — der Stamm-Kontext *ist* das Ziel (übergreifendes Saisonthema + vorgeschlagene Aktivitäten).

### 4.2 Anzeige in der Leiste

- **Thema + Beschreibung**: rein informativ (Fraunces-Schrift, wie im Wireframe)
- **Stammaktivitäten**: Drag-Quelle auf Treffen, analog zu Abzeichen-Anforderungen
  - Counter + Tooltip (Datumslist) analog zu Abzeichen
  - Häkchen ab ≥1×

### 4.3 Fehlt Stamm-Import

Abschnitt fehlt vollständig — kein Platzhalter, kein Hinweis in der Leiste.

---

## 5. Gemeinsames Tracking-Muster (Sektionen 2–4)

| Eigenschaft | Verhalten |
|---|---|
| Zuweisung | Drag von Leiste auf Treffen-Karte |
| Mehrfachzuweisung | Immer erlaubt |
| Häkchen | Ab ≥1× Zuweisung |
| Counter | Zählt alle Vorkommen |
| Tooltip | Erscheint bei ≥1×; zeigt Datum aller zugewiesenen Treffen |
| „Erledigt" | Kein explizites Erledigt-Konzept — nur „eingeplant" |

---

## 6. PlanungsZiele-Typ (Gesamtübersicht)

```ts
export interface PlanungsZiele {
  wbSchwerpunkt:  WbSchwerpunktModus | null;
  andachtsReihe:  AndachtsReihe | null;
  abzeichen:      AbzeichenId | null;   // singular; später Array
}

// in Planung:
// ziele: PlanungsZiele
// default: { wbSchwerpunkt: null, andachtsReihe: null, abzeichen: null }
```

Stamm-Kontext ist kein Teil von `PlanungsZiele` — er hängt an `StammKontext` der Planung (Phase 8).

---

## 7. Wizard-Integration (Schritt 3 „Unsere Ziele")

Schritt 3 des NewPlanungWizard bekommt drei kollabierbare Sektionen:

1. **WB-Schwerpunkt**: Modus-Auswahl (5 Buttons) + kontextabhängige WB-Key-Auswahl
2. **Andachtsreihe**: Toggle → Titel-Input + dynamische Einheitenliste (add/remove/reorder)
3. **Abzeichen**: Toggle → Altersstufe wählen → Abzeichen wählen

Alle drei Sektionen sind überspringbar.
