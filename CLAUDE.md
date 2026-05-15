# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Was die App macht

**Stammtreff-Planer** ist eine lokal laufende Web-App (kein Backend, keine Accounts) für Gruppenleiter in Pfadfinderorganisationen. Sie hilft beim Planen ganzer Treffen-Saisons: Termine generieren, Programmpunkte aus einem Aktivitäten-Repertoire zuordnen, Team-Verfügbarkeiten verwalten, Wachstumsbereiche (WB) balancieren, Andachtsreihen und Abzeichen tracken sowie einen Stamm-Kontext (gemeinsame Jahresplanung) importieren.

Alle Daten liegen ausschließlich im Browser (IndexedDB). Es gibt keine Server-Kommunikation außer einem Read-only-Ferien-API-Abruf (`ferien-api.de` / `feiertage-api.de`) mit lokalem Cache.

## Befehle

```bash
npm run dev          # Vite Dev-Server (localhost:5173) mit HMR
npm run build        # tsc -b && vite build → /dist
npm run preview      # Produktions-Build lokal vorschauen
npm run lint         # ESLint
npm run test         # Vitest einmalig ausführen
npm run test:watch   # Vitest im Watch-Modus
```

Einzelnen Test ausführen:
```bash
npx vitest run src/domain/cascade.test.ts
npx vitest run --reporter=verbose   # mit Testnamen
```

TypeScript-Import-Alias `@/` zeigt auf `src/` (konfiguriert in `vite.config.ts` und `tsconfig.app.json`).

## Architektur

### Schichten

```
src/domain/       Pure TypeScript — kein React, kein IO
src/storage/      IndexedDB-Zugriff über idb (Repository-Pattern)
src/services/     Externe APIs (nur ferienService.ts)
src/features/     Feature-Module mit Stores und React-Komponenten
src/ui/           Design-System (Primitives + Domain-Primitives)
```

### State-Management ohne Context

Statt React Context werden **Module-Level-Singletons** mit dem `useSyncExternalStore`-Muster verwendet:

- `planungenStore.ts` — alle Planungen im Speicher, IndexedDB ist autoritativ
- `globalConfigStore.ts` — Singleton-Konfiguration
- `RepertoireProvider`, `StammKontextProvider` — React Context, aber nur für ihren Scope

Das Pattern: Store hält einen gefrorenen Snapshot, schreibt Mutationen erst in IndexedDB, aktualisiert dann den Snapshot und benachrichtigt Listener. React-Hooks wrappen `useSyncExternalStore(store.subscribe, store.getSnapshot)`.

### Domain-Layer (`src/domain/`)

Alle Geschäftslogik als pure Functions — unabhängig von React und Storage:

- `types.ts` — alle Core-Typen
- `ids.ts` — Branded ID-Types (verhindert Typen-Verwechslung: `PlanungId ≠ TreffenId`)
- `wb.ts` + `wbLogic.ts` — Wachstumsbereiche-Berechnung
- `cascade.ts` — Neuverteilung von Programmpunkten wenn Treffen entfernt/eingefügt wird
- `planungFactory.ts` — Planung-Builder inkl. Treffen-Generierung aus Rhythmus
- `zeitbudget.ts` — Zeitbudget-Berechnung pro Treffen
- `starterKatalog.ts` / `abzeichenKatalog.ts` — vorinstallierte Daten

### Cascade-Algorithmus (`src/domain/cascade.ts`)

Wenn ein Treffen entfernt oder eingefügt wird, werden Programmpunkte umverteilt. `fixierte` Treffen werden übersprungen. Inhalt, der keinen Platz findet, landet im `ueberhang`-Array der Planung. Modi: `cascade | delete` (bei Remove), `shift | empty` (bei Insert).

### Datenmodell (Kern-Typen)

**`Planung`** ist die Top-Level-Entität — enthält Zeitraum, Team, Rhythmus und das Array aller `Treffen`.

**`Treffen`** hat ein `programm: Programmpunkt[]`-Array. Programmpunkte können sein:
- `kind: 'konkret'` — referenziert eine `Aktivitaet` per `aktivitaetId`
- `kind: 'abstrakt'` — Platzhalter ohne konkrete Aktivität
- `kind: 'wegezeit'` — Reisezeit, trägt nicht zu WB bei

**`Aktivitaet`** lebt im Repertoire mit `quelle: 'eigene' | 'vorinstalliert' | 'stamm-import' | 'temporaer'`.

**`WBTag`** hat `key: WBKey` und `intensity: 0 | 0.33 | 0.66 | 1.0` — vier Wachstumsbereiche: `koerperlich | gesellschaftlich | geistig | geistlich`.

**`StammKontext`** enthält gemeinsame Jahresinformationen (reguläre Blöcke, Stammaktionen), die aus einem JSON-Import stammen.

Alle Datum-Werte sind `IsoDate = string` im Format `'yyyy-MM-dd'`.

### IndexedDB-Schema (`src/storage/db.ts`)

DB-Name: `stammtreff-planer`, Version 2

| Store | Key | Indexes |
|---|---|---|
| `planungen` | `id` | `by-status` |
| `aktivitaeten` | `id` | `by-quelle`, `by-typ` |
| `andachtsreihen` | `id` | `by-quelle` |
| `abzeichen` | `id` | `by-quelle` |
| `stammKontexte` | `id` | — |
| `globalConfig` | `'singleton'` | — |
| `ferienCache` | `${bundesland}-${jahr}` | — |

### UI-System (`src/ui/`)

- `ui/tokens/tokens.css` + `base.css` — Design Tokens (Farben, Typography, Spacing als CSS Custom Properties)
- `ui/primitives/` — generische Komponenten (Button, Input, Modal, Chip, …)
- `ui/domain/` — domänen-spezifische Komponenten (WBBar, WBDot, DurationBar, TypeIcon, …)
- `ui/domain-primitives/` — zusammengesetzte Domänen-Editoren (z.B. `WBAktivitaetEditor`)
- CSS Modules durchgehend (`.module.css`)

Komponenten-Showcase unter `/dev/kit` (nur im Dev-Build).

### Routing (`src/app/App.tsx`)

```
/                     → OverviewPage (Planungen-Liste + Jahreskalender)
/planung/:id/list     → ListPage (Treffen-Liste mit Inline-Editing)
/planung/:id/calendar → CalendarPage
/repertoire           → RepertoirePage
/dev/kit              → KitShowcase
```

## Tests

Tests liegen direkt neben den getesteten Dateien (`*.test.ts`). Die Domain-Logik hat die meiste Testabdeckung. `fake-indexeddb` mockt IndexedDB in Tests — `__resetDB()` in `src/storage/db.ts` setzt den Singleton zurück, damit Tests eine frische DB sehen.

Setup-Datei: `src/test/setup.ts`. Vitest läuft in `jsdom`-Umgebung mit globalen APIs.

## Roadmap & stehende Entscheidungen

`concept/ENTWICKLUNGS-ROADMAP.md` ist die maßgebliche Quelle für den Stand der Phasen-Umsetzung. Die Phasen 1–12 sind abgeschlossen, aktuell offen sind 13 (Ablauf-Korrekturen), 14 (Header-Zeile), 15 (Export), 16 (Raster), 17 (Polish/A11y/Performance). Vor jeder größeren Änderung dort den Phasen-Scope prüfen.

**Stehende Entscheidungen (nicht über Bord werfen):**

1. **Eng am Konzept bleiben.** Keine nice-to-have-Features oder -Infrastruktur, die nicht in Konzept/Wireframes stehen. Wenn etwas sinnvoll erscheint: erst nachfragen.
2. **Hover auf Startseite nur auf Planungs-Ebene.** Monats-Hover highlightet Planungs-Karten, **nicht** einzelne Treffen.
3. **NavToggle inaktiv ohne aktive Planung** ist kein Bug.
4. **DurationBar-Semantik:** Zielintervall `[0.7, 0.9]` mit Ampel — grün im Intervall, gelb davor/danach, rot bei Overflow. Kein „dicker Balken".
5. **Spotlight (`⌘K`) nur für Programmpunkt-Auswahl** in der Treffen-Karte (§9.5). **Kein** globales Spotlight.
6. **Architektur:** Store-Singletons + `useSyncExternalStore`, **kein** React Context für Zustand. Branded IDs gegen Typen-Mischung.
7. **Datumswerte:** ISO-Strings `'yyyy-MM-dd'` in der Domain; `date-fns` mit `de`-Locale für Anzeigen.
8. **WB-Farben:** `--wb-k|g|i|s` (körperlich/gesellschaftlich/geistig/geistlich). Intensitäten diskret: `[0, 0.33, 0.66, 1.0]`.
9. **UI-Sprache:** „WB" ist eine interne Abkürzung — in der UI immer „Wachstumsbereich(e)" ausschreiben.

Konzept-Quellen im Projektordner: `concept/Stammtreff Planer.md` (Hauptkonzept), sieben Wireframe-HTMLs, `konzept-planungsziele-kontextleiste.md` (Phase 11), `sample-stammkontext.json` (JSON-Schema-Beispiel).

Nach Abschluss jeder Phase sollten `tsc --noEmit` + `vitest run` + `vite build` grün bleiben.
