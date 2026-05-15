# Code-Review — 2026-05-15

Architekt-Sicht: React/TypeScript, 238 Source-Dateien, 396 Tests grün, `tsc --noEmit` ohne Fehler. ESLint (nur `src/`, ohne Worktree-Duplikate): 4 Errors, 80 Warnings.

## 1. Toter Code & Redundanz

| Datei | Status | Aktion |
|---|---|---|
| `src/App.tsx` | Legacy-Scaffold (Header: „intentionally empty"), nicht importiert | löschen |
| `src/App.css` | Legacy-Scaffold | löschen |
| `src/index.css` | Legacy-Scaffold; aktive Styles in `src/ui/tokens/{base,tokens}.css` | löschen |
| `eslint-report.json` (95 KB im Repo-Root) | Snapshot aus Commit a2c4039, nicht im `.gitignore` | löschen + `.gitignore` |
| `src/ui/domain/WBIconRow.tsx` + `.module.css` | Nur Self-Reference, kein Konsument | löschen + aus `ui/domain/index.ts` |
| `src/ui/primitives/Tabs.tsx` + `.module.css` | Kein Konsument | löschen + aus `ui/primitives/index.ts` |
| `src/ui/primitives/Accordion.tsx` | Nur intern von `AccordionGroup` benutzt; Re-Export ggf. obsolet | verifizieren, sonst Re-Export entfernen |

WB-Komponenten (`WBBar`, `WBGoalBars`, `WBDot`, `WBDotGrid`, `WBIconStack`, `WBDonut`, `WBIntensitySegment`) sind alle aktiv genutzt — keine Duplikate.

## 2. React-Anti-Patterns (echte Bugs)

| Datei:Zeile | Severity | Problem |
|---|---|---|
| `features/overview/WizardStep3Ziele.tsx:284` | Bug | `andachtFocusRef.current === …` im Render gelesen (`react-hooks/refs`). Renderer entscheidet `autoFocus` aus Ref → nicht reproduzierbar |
| `features/overview/NewPlanungWizard.tsx:154` | Risk | Reset-Effect setzt ~20 States synchron → Cascading Renders. Besser: `key`-Remount oder uncontrolled-Init |
| `features/overview/NewPlanungWizard.tsx:257` | Risk | Smart-End-Effect setzt `setEnde` im `[ferienYear1, ferienYear2]`-Effekt; aktuell per `eslint-disable` verschleiert |
| `features/list/TreffenKarte.tsx:206` | Hinweis | `react-compiler` Bailout in `commitNotiz` |

## 3. React-Smells (über `eslint-disable` verschleiert)

- `features/calendar/AbwesenheitsSidebar.tsx` — **7×** `ref-during-render`-Disables (Z. 144–170). „Refs spiegeln Props"-Pattern ist in React 19 nicht mehr zulässig; korrekt wäre Update im `useEffect` oder Daten direkt in den Listener zu schließen. Technische Schuld.
- 5× `set-state-in-effect`-Disables in `useFerienForYear.ts`, `NewKontextWizard.tsx`, `useStammKontextEditorState.ts`, `useKontextDaten.ts`, `Spotlight.tsx`. Drei davon vertretbar (async-Init).
- `features/repertoire/RepertoirePage.tsx:253` — `setTimeout(() => setImportFeedback(null), 4000)` **ohne** Cleanup → setState auf unmounteter Komponente möglich.
- `features/calendar/AbwesenheitsSidebar.tsx:417` — `setTimeout(…focus, 50)` ohne Cleanup.

## 4. Naming & Ordnerstruktur

- `src/ui/domain/` vs. CLAUDE.md (`src/ui/domain-primitives/`): beides existiert; CLAUDE.md ist veraltet.
- Pure-TS außerhalb `src/domain/`: `features/calendar/planungskalenderGrid.ts`, `features/overview/monthGrid.ts`, `features/overview/newPlanungWizardUtils.ts`, `features/repertoire/repertoireUtils.ts`, `features/repertoire/repertoireImport.ts`, `features/stammKontext/stammKontextExport.ts`, `features/planungen/planung{Json,Ical}Export.ts`. Kontextuell sinnvoll, kein Bug.
- Barrel-Files inkonsistent: 5 Features haben `index.ts`, 4 nicht (`calendar`, `list`, `overview`, `repertoire`).
- `features/list/treffenKarteTypes.ts` — camelCase File für Type-Bündel.
- ESLint-Config-Lücke: `.claude/worktrees/*` wird mitgelintet (~290 Duplikat-Issues im Report).

## 5. Sicherheit & Robustheit

| Severity | Stelle | Befund |
|---|---|---|
| Med | `services/ferienService.ts:68,89` | `fetch` ohne Timeout/AbortSignal |
| Med | `services/ferienService.ts:70,91` | `as OHHoliday[]` ohne Schema-Validierung → Crash bei API-Drift |
| Med | `features/kontextleiste/dragPayload.ts:48` | `decodePayload` macht blinden Cast nach `JSON.parse` |
| Med | `features/repertoire/repertoireImport.ts:99` | `untertyp`-Cast ignoriert vorhandenen `istGueltigerUntertyp`-Guard |
| Low | `index.html` | Kein CSP-Meta |
| Low | `domain/stammParser.ts:331–375` | Kein Längenlimit vor Loops über User-JSON |

Positiv: kein `dangerouslySetInnerHTML`, kein `eval`, kein `localStorage`, IDB-Migration v1→v2 sauber, Filename-Sanitization beim Export OK, keine externen `target="_blank"`-Links ohne Schutz.

---

## Plan: Boyscout-Schritte

### A — Dead-Code & Hygiene
1. `src/App.tsx`, `src/App.css`, `src/index.css` löschen.
2. `eslint-report.json` löschen, Pattern in `.gitignore`.
3. `src/ui/domain/WBIconRow.{tsx,module.css}` löschen, Export aus `ui/domain/index.ts`.
4. `src/ui/primitives/Tabs.{tsx,module.css}` löschen, Export aus `ui/primitives/index.ts`.
5. `eslint.config.js`: `.claude/worktrees/**` in `globalIgnores`.

### B — Kleine React-Fixes
6. `RepertoirePage.tsx:253` — Toast-Timer in `useEffect` mit `clearTimeout`-Cleanup.
7. `AbwesenheitsSidebar.tsx:417` — `setTimeout`-Focus auf `requestAnimationFrame` mit Cleanup.
8. `WizardStep3Ziele.tsx:284` — `andachtFocusId`-State statt Ref-Lesen im Render.

### C — Sicherheit
9. `index.html` — restriktive CSP-Meta hinzufügen.
10. `services/ferienService.ts` — `AbortSignal.timeout(8000)` + minimaler Typ-Guard.
11. `dragPayload.ts:46–52` — `kind`-Whitelist nach `JSON.parse`.
12. `repertoireImport.ts:99` — `istGueltigerUntertyp` nutzen.

### D — Doku
13. `CLAUDE.md` — `ui/domain-primitives/` → `ui/domain/`.

### Nicht im Boyscout-Scope (separat planen)
- `AbwesenheitsSidebar` 7-Refs-Pattern auflösen.
- `NewPlanungWizard` (683 Z.) und `WizardStep3Ziele` (378 Z.) splitten.
- `Accordion` Re-Export entfernen (Verifizierung).
- Barrels für `calendar`, `list`, `overview`, `repertoire` ergänzen.
- Pure-TS-Files nach `src/domain/` verschieben.
