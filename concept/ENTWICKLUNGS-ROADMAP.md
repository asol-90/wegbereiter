# Stammtreff Planer — Entwicklungs-Roadmap

Dieses Dokument hält den Stand der Umsetzung und die offenen Phasen fest, damit in einem neuen Chat ohne Kontextverlust weitergearbeitet werden kann.

---

## Projekt in einer Minute

Lokales Web-Tool für Stammgruppen-Leiter, das beim Planen einer Stammtreff-Saison hilft: Termine generieren, Inhalte aus einem Repertoire kaskadieren, Wachstumsbereiche (WB) ausbalancieren, Andachtsreihen/Abzeichen anbinden, Stamm-Kontext verankern.

Stack: React 19 + Vite 8 + TypeScript 6 + Vitest 2 + react-router-dom v6. CSS Modules, zentrale Design Tokens (`tokens.css`). Persistenz: IndexedDB via `idb`. Code in Englisch, UI in Deutsch.

**Konzeptquelle**: `Konzept v0.3.md` + sieben Wireframe-HTMLs im Projektordner. Die Roadmap verweist stückweise darauf. Zusätzlich: `konzept-planungsziele-kontextleiste.md` (Phase 10), `PHASE-8-SCOPE.md` (Stammkontext-Datenmodell).

---

## Stehende Entscheidungen (NICHT über Bord werfen)

1. **Eng am Konzept bleiben.** Keine nice-to-have-Features oder -Infrastruktur einbauen, die nicht in Konzept oder Wireframes stehen. Wenn ein Feature plötzlich sinnvoll erscheint: erst zurückfragen.
2. **Startseite: Hover nur auf Planungs-Ebene.** Hover auf einen Monat im Jahreskalender highlightet die **Planungs-Karten** rechts — **nicht** einzelne Treffen. Der Wireframe `jahresansicht-wireframes.html` ist an dieser Stelle falsch und gezielt zu korrigieren.
3. **NavToggle auf Startseite** (alle drei Icons inaktiv, solange keine Planung aktiv ist): das ist kein Bug. Erst wenn man in eine Planung navigiert hat, sind Kalender/Liste klickbar.
4. **DurationBar-Semantik**: Zielintervall (default `[0.7, 0.9]`) mit Ampel — grün innerhalb, gelb davor/danach, rot bei Overflow. Kein „dicker Balken bei Überschreitung".
5. **Spotlight (`⌘K`)**: ausschließlich für Programmpunkt-Auswahl in der Treffen-Karte (§9.5). **Kein** globales Spotlight.
6. **Architektur**: Store-Singletons + `useSyncExternalStore`, **kein** React Context für Zustand. Branded IDs (`PlanungId`, `TreffenId`, …) gegen versehentliches Mischen.
7. **Datumswerte**: ISO-Strings `'yyyy-MM-dd'` in der Domain; `date-fns` für Rechnen/Formatieren, `de` Locale für Anzeigen.
8. **WB-Farben**: `--wb-k` (körperlich), `--wb-g` (gesellschaftlich), `--wb-i` (geistig), `--wb-s` (geistlich). WB-Intensitäten diskret: `[0, 0.33, 0.66, 1.0]` — siehe `domain/wb.ts`.

---

## Ordnerstruktur (App-Seite)

```
app/src/
├── app/                # App.tsx + main.tsx
├── domain/             # Pure business logic (types, ids, wb, cascade, zeitbudget, dateUtils, planungFactory, zeitraumVorschlaege)
├── storage/            # IndexedDB repos + db.ts
├── services/           # ferienService (+ Cache)
├── ui/
│   ├── tokens/         # tokens.css + base.css
│   ├── primitives/     # Button/Input/Select/Modal/…
│   ├── domain/         # WB-Bar/Dot/Goal/Intensity, Avatar, DurationBar, DragHandle, TypeIcon
│   └── utils/          # clsx etc.
├── features/
│   ├── appShell/       # AppShell, Topbar, NavToggle, RepertoireToggle, Panels, PanelGhost, SettingsModal, useNavPosition
│   ├── planungen/      # PlanungenStore, usePlanungen, PlanungenProvider
│   ├── overview/       # OverviewPage, Planungsliste, PlanungsCard, NewPlanungDialog
│   ├── calendar/       # CalendarPage
│   ├── list/           # ListPage
│   └── repertoire/     # RepertoirePage
├── dev/                # KitShowcase
└── test/               # setup.ts, dbHelpers.ts
```

---

## Abgeschlossene Phasen

### Phase 1 — Scaffold & Domain-Kern
Vite/React/TS-Projekt. Domain-Typen, Branded IDs, WB-Logik. Pure Domain-Funktionen (cascade, zeitbudget, wbLogic, dateUtils, planungFactory, zeitraumVorschlaege), alle unit-getestet. IndexedDB-Layer (planungRepo, repertoireRepo, globalConfigRepo, ferienRepo). FerienService mit Offline-Cache.

### Phase 2 — Design System
Design Tokens (Farben, Typographie, Radii, Shadows, Motion). UI-Primitives: Icon, Button, IconButton, Input, Select, Chip, Badge, Tooltip, Kbd, Toggle, IconToggle, SegmentedControl, Tabs, Accordion/AccordionGroup, Modal (`<dialog>`), ConfirmDialog, ContextMenu, Spotlight. Domain-UI: Avatar/AvatarGroup, WBBar, WBDot, WBDotGrid, WBGoalBars, WBIntensitySegment, DurationBar, DragHandle, TypeIcon. KitShowcase unter `/dev/kit`.

### Phase 3 — App-Shell & Routing
AppShell (beige Hintergrund + weiße Card). Topbar mit NavToggle (sliding pill), RepertoireToggle, Meta-Label, Settings-IconButton. Panels (main-side 65/35, side-main 35/65). PanelGhost. useNavPosition. Nested Routes.

### Phase 4 — Startseite & Planungsverwaltung
PlanungenStore (Singleton, useSyncExternalStore, IndexedDB-backed). PlanungsCard + Planungsliste mit Cross-Hover. Jahreskalender (3×4 MiniMonth-Raster, Ferien-Bänder, Feiertag-Farbe, Planungs-Marker, Today-Marker). GlobalConfigStore + SettingsModal (Bundesland, Defaults). NewPlanungWizard (4 Schritte; Schritt 2 + 3 als Platzhalter). Planung löschen (ConfirmDialog). Nav-Integration (Klick auf Card → Kalenderansicht). 93 Tests grün.

### Phase 5 — Planungsansicht Kalender
planungskalenderGrid (pure, durchgehende Wochen-Zeilen). PlanungsKalender mit sticky Header, Treffen als Anchor-Box, Ferien-Bänder, Hover-Preview, Today-Marker. CalendarPage mit Zeitraum-Titel + Planungsname. 102 Tests grün.

### Phase 6 — Planungsansicht Terminliste
TreffenKarte (read-only): Datum, Lock-Icon, Titel, WB-Dots, Team-Avatare, Notiz, Programmpunkte-Liste, DurationBar. TreffenListe mit Intervall-Trennbalken (Abweichung vom Rhythmus farblich abgestuft). ListPage mit Hash-Anchor-Scroll. Navigation Kalender → Liste via Doppelklick/Details-Button.

### Phase 7 — Treffen-Karte interaktiv (§9)
useTreffenMutations-Hook. Titel als Inline-Input, Notiz als expandierende Textarea, Lock-Toggle, Soll-WB per Klick (max 2, FIFO). Programmpunkte: Name + Dauer inline editierbar, Verantwortlicher als Select, Delete auf Hover, Drag-Reorder. AddPunktSpotlight mit „Neu erstellen…"-Inline-Formular.

### Phase 8 — Stamm-Import (§11)
StammKontextStore (global, eigene IndexedDB-Collection). File-Upload + Parser für Stamm-JSON. Stammkontext liefert alle Treffen (regulär + Stammaktionen). Default-Anfangs-/Endblöcke, pro Treffen überschreibbar. Referenz-Modell (Planung → stammKontextId), Opt-Out-Liste, eigene Zusatz-Treffen. Überlappungslogik (Vollersetzung). Import in Planungsliste-Sidebar (Drag-Zone + Button). Vorschau + Bestätigung. Sichtbarkeit im Jahreskalender. Aktivitäten-Import ins Repertoire. Siehe `PHASE-8-SCOPE.md` für Details.

### Phase 9 — Repertoire-Verwaltung (§10)
Aktivitäten-Liste (65%) + Detail/Edit (35%). CRUD, WB-Tags, Themen-Tags, Filter, Tabs (alle/eigene/stamm-import).

### Phase 10 — Wizard-Überarbeitung
4-Schritte-Wizard inhaltlich überarbeitet. Schritt 1: Team-Eingabe mit Avataren + Abwesenheits-Dots in der Terminliste. Schritt 2: Stammkontext-Anzeige mit vorgeschlagenen Aktivitäten, kompakte Treffenliste (Datumskette regulär, besondere separat), Stammaktionen. Schritt 3: „Unsere Ziele" mit drei kollabierbaren Sektionen — WB-Schwerpunkt (5 Modi + WB-Key-Chips), Andachtsreihe (Toggle + Titel + dynamische Einheitenliste), Abzeichen (Toggle + Altersstufe + Abzeichen-Auswahl). Schritt 4: Zusammenfassung ohne Treffenliste — Name + Metadaten nebeneinander, Stammkontext prominent, gewählte Ziele als Zeilen-Darstellung, Team-Chips. Domain: `AbzeichenAnforderung` mit typ/untertyp/zeitMin/zeitMax, `Altersstufe`, `WbSchwerpunktModus` (5 Modi), `abzeichenKatalog.ts` mit Fake-Daten. `CreatePlanungInput` erweitert um wbSchwerpunkt/andachtsreiheIds/abzeichenAuswahl. 131 Tests grün.

### Phase 11 — Kontextleiste + Jahresplaner-Sidebar
Zwei Komponenten: Kontextleiste für Kalender-/Listenansicht und überarbeitete rechte Spalte der Startseite.

**Jahresplaner-Sidebar (11A)**: Ersetzt die bisherige Planungsliste. Vertikaler Jahreskalender (24-Zeilen-Grid, 2 pro Monat) mit Monatsnames, Kontext-Spalte (Stammkontext-Balken mit Tooltip + Cross-Hover), Planungs-Spalte (farbige Blöcke mit Dimming/Highlighting). Drag-Geste: Ziehen über Monate eröffnet Wizard mit vorausgefülltem Zeitraum. Crosshair-Cursor, Split-Button für Import/Anlegen. Bestehende Import-Logik (DropZone, StammImportDialog) migriert.

**Kontextleiste (11B)**: Rechter Panel in Kalender-/Listenansicht. WB-Sektion immer sichtbar (Donut + WBGoalBars mit Zielintervallen aus `wbZielverteilung.ts` + Charakterisierungs-Label). Andachtsreihe, Abzeichen und Stamm-Kontext als exclusive AccordionGroup mit Fortschritts-Badge. Checklisten mit Häkchen/Counter/Tooltip. Native HTML Drag-to-assign: CheckRows als Drag-Source, TreffenKarten als Drop-Target mit visuellem Feedback (inset box-shadow). Abzeichen aus `ABZEICHEN_KATALOG` (in-memory), Andachtsreihen aus IndexedDB. Wizard speichert Andachtsreihe in IDB. 131 Tests grün.

---

## Offene Phasen

### Phase 12 — Repertoire überarbeiten

Vier Segmente statt drei Tabs. Konzeptionell durchdiskutiert, Details in `PHASE-12-SCOPE.md`. Kernaufgaben:

1. **SegmentedControl mit 4 Bereichen**: Aktivitäten (allg.) · Pfadfindertechnik (eigener Tab mit Subkategorie-Überschriften) · Andachtsreihen (Reihe vs. Sammlung) · Abzeichen (read-only Katalog)
2. **Andachtsreihen**: Reihe (sequenziell, komplett folgen) vs. Sammlung (Pool, Auswahl pro Planung). Buchquelle als Feld an der Reihe (Titel + Autor), Kapitel/Seite pro Einheit. Alle editierbar, auch planungsgebundene.
3. **Abzeichen**: Read-only-Anzeige. Anforderungen sind abstrakt (Konkretisierung bei Treffen-Planung). „Ins Repertoire"-Button übernimmt Anforderung als Aktivität.
4. **Aktivitäten erweitert**: Quell-Filter, Temp-Banner, Themen-Tags, Stufenbezug, Verwendungs-Anzeige im Detail.
5. **Datenmodell**: `Andachtsreihe` + art/buchquelle, `AndachtsEinheit` + kapitelSeite, `Planung.andachtsreihenZuordnung` mit optionaler Einheiten-Auswahl für Sammlungen.
6. **Store**: RepertoireStore um andachtsreihen + abzeichen erweitern.

---

### Phase 13 — Ablauf-Korrekturen

Verschiedene Fehler und Inkonsistenzen im bestehenden Ablauf korrigieren:

1. **Zeiten bei Initiierung**: Zeitraum-Berechnung und Termin-Generierung im Wizard prüfen und korrigieren.
2. **Stammkontext bei Initiierung**: Verhalten wenn kein Stammkontext verbunden ist — kein Fehler, sondern sauberer Fallback. Stammkontext-Schritt im Wizard optional und klar kommuniziert.
3. **Stammkontext als Planungsgrenzen**: Nutzung des Stammkontext-Zeitraums als Vorschlag/Begrenzung für den Planungszeitraum verbessern.
4. **Planungsansicht (Monatskalender)**: Sinn und Interaktion der Kalenderansicht überdenken — was zeigt der Kalender, was kann man dort tun, wie verhält sich der Zusammenhang mit der Listenansicht.

---

### Phase 14 — Header-Zeile

Die Topbar wird um Organisations-Chips erweitert. Links bleiben die vier Buttons (NavToggle + RepertoireToggle); der Repertoire-Button hat die gleiche Höhe wie die drei Nav-Icons davor.

**Chips rechts neben den Buttons**:

| Chip | Inhalt | Farbe | Settings |
|---|---|---|---|
| Distrikt | RR-Stern (b/w) + Name | Denim-Blau | Hard-coded (Konstante: Ost) |
| Region | „Region " + Kürzel | Denim-Blau | Hard-coded (Konstante: O3) |
| Bundesland | Landesflagge + Name | Ferien-/Feiertag-Farbe | Auswählbar (existiert schon in Settings) |
| Stamm | Kürzel | Waldgrün | Hard-coded (Konstante: RR642) |
| Teilstamm | Name | Waldgrün | Dropdown: Kundschafter+ / Entdecker+ |
| Team | Freitext-Name | Lila (Planungs-Farbe) | Freitext in Settings |

Die Farbzuordnung hilft später bei der visuellen Zuordnung im Kalender: Denim-Blau = Distrikt-/Regionstermine, Ferien-Farbe = Bundesland (Ferien + Feiertage werden durch das Bundesland bestimmt, deshalb gleiche Farbe), Waldgrün = Stamm-Ebene, Lila = eigene Planung.

**GlobalConfig-Erweiterung**: Neue Felder für Teilstamm und Teamname. Distrikt, Region und Stamm sind Konstanten (kein Config-Eintrag nötig).

**Stammkontext-JSON-Erweiterung**: Die Stamm-Datei bringt Distrikt- und Regionstermine mit. Erweiterung des Schemas um eine `ebene`-Eigenschaft pro Termin oder separate Arrays (`distriktTermine`, `regionsTermine`). Details bei Umsetzung zu klären.

**Kalender-Darstellung**: Termine aus Distrikt und Region werden über den Stammkontext importiert, aber in ihrer eigenen Farbe (Denim-Blau) im Kalender angezeigt — visuell getrennt von Stamm-Treffen (Waldgrün) und eigener Planung (Lila).

---

### Phase 13 — Export

PDF-Export der Planung (Treffenliste mit Programmpunkten, WB-Übersicht, Stammkontext-Zusammenfassung). iCal-Export (Treffen als Kalender-Einträge). Details bei Umsetzung zu klären.

---

### Phase 14 — Raster

Templates für den Team-Freiraum zwischen Stamm-Blöcken.

**Konzept**: Ein Raster ist ein benannter Standard-Ablauf für ein Treffen (z.B. Spiel → Andacht → Logbuch). Die Aktivitäten im Raster sind Platzhalter — sie definieren Typen und Zeitkontingente, nicht konkrete Aktivitäten. Erst wenn eine konkrete Aktivität und eine verantwortliche Person zugewiesen werden, wird das Zeitkontingent vom Raster abgezogen und der eigenen Planung angerechnet.

**Zeitbalken**: Ein angewandtes Raster füllt den Zeitbalken grau — als zweiter Balken hinter dem farbigen (den farbigen, wenn vorhanden, verlängernd). Wenn ein Platzhalter konkretisiert wird, wandert das Zeitkontingent von grau nach farbig.

**Definition & Anwendung**:

1. *In der Initialisierung (Wizard)*: Ein Standard-Raster für alle Treffen auswählen oder neu definieren. Option: „Starte jedes n-te Treffen ohne Raster" (Default n = 4, als Anreiz, auch aus dem Raster auszubrechen).
2. *Auf der Treffen-Card*: Dropdown-Button zur Auswahl eines definierten Rasters. Kann das Standard-Raster überschreiben oder ein Raster auf ein bisher leeres Treffen anwenden.

**Platzhalter-Auflösung**: Klick auf einen Platzhalter im Raster öffnet das Spotlight/Auswahlmenü mit entsprechendem Filter (z.B. Typ = Spiel, Dauer ≈ 30 Min) aus dem Repertoire.

**Raster-Verwaltung**: Teams können mehrere Raster erstellen und benennen. Aktivitäten im Raster können mit Zeiten versehen werden.

---

### Phase 15 — Polish / A11y / Performance

Keyboard-Shortcuts (ohne ⌘K-Global). Focus-Management. Dark-Mode (falls gewünscht — nicht im Konzept, erst fragen). Bundle-Size-Review.

---

## Einstieg für einen neuen Chat

1. Dieses Dokument lesen.
2. `MEMORY.md` im Auto-Memory liefert die wichtigsten stehenden Präferenzen (Konzeptnähe, Hover-Semantik, Stammkontext global).
3. Aktueller Task-Stand: `TaskList` aufrufen. **Phasen 1–10 sind abgeschlossen**; nächste offene Phase ist **Phase 11 (Kontextleiste + Jahresplaner-Sidebar)**.
4. Konzept & Wireframes im Projektordner konsultieren, bevor größere Layouts/Interaktionen gebaut werden. Insbesondere `konzept-planungsziele-kontextleiste.md` für Phase 11 und `PHASE-8-SCOPE.md` für das Stammkontext-Datenmodell.
5. Nach Abschluss jeder Phase: `tsc --noEmit` + `vitest run` + `vite build --outDir /tmp/vite-verify --emptyOutDir` grün halten.
