# Konzept: Stammkontext-Editor

**Version:** 0.1 (Diskussionsstand)  
**Status:** Entwurf

---

## Motivation

Bisher lässt sich ein Stammkontext ausschließlich über einen JSON-Datei-Import erfassen — ein Format, das für die Stammführung geeignet ist, aber eine technische Hürde darstellt. Wenn die App selbst ein Bearbeitungswerkzeug anbietet, kann die Stammführung (oder ein engagierter Gruppenleiter) den Kontext direkt im Tool pflegen und von dort exportieren. Import und manuelle Erfassung koexistieren gleichberechtigt.

---

## Einstiegspunkt: Kompass-Button im Header

Im Header erscheint ein **Kompass-IconButton** ganz rechts außen — dort, wo in Phase 14 der Settings-Button war (der in den Footer wandert). Er ist dauerhaft sichtbar und hat keinen Planungszustand. Er leuchtet aktiv, solange die Stammkontext-Ansicht geöffnet ist.

**Klick öffnet immer dasselbe Dropdown-Menü**, unabhängig davon, ob Stammkontexte vorhanden sind oder nicht:

```
┌───────────────────────────────┐
│  📂  JSON-Datei importieren   │
│  ✏️  Neuen Kontext anlegen    │
│  ─────────────────────────── │
│  Herbst/Winter 2026  →        │
│  Frühjahr 2027       →        │
└───────────────────────────────┘
```

- Die dritte Gruppe listet alle gespeicherten Stammkontexte (nach Zeitraum sortiert). Klick navigiert zur Bearbeitungsansicht des jeweiligen Kontexts.
- Wenn noch kein Kontext existiert, ist diese Gruppe leer — das Menü zeigt nur die zwei oberen Aktionen.
- Das Menü schließt sich beim Klick auf eine Option oder außerhalb.

---

## Stammkontext-Ansicht

### Phase 1: Zeitraum bestimmen (nur bei „Neu anlegen")

Beim Anlegen eines neuen Stammkontexts erscheint zuerst der **vertikale Jahreskalender** — dieselbe `JahresplanerSidebar`-Komponente, die auf der Startseite schon für die Drag-Geste beim Anlegen von Planungen genutzt wird. Dort zieht die Stammführung den Zeitraum auf.

```
┌────────────────────────────────┐
│  Jan │                         │
│  Feb │                         │
│  Mär │                         │
│  Apr │   ← Drag-Geste          │
│  Mai │   für Zeitraum          │
│  Jun │                         │
│  Jul │  [████████████]  ←      │
│  Aug │  [████████████]  markiert│
│  Sep │  [████████████]         │
│  Okt │                         │
│  Nov │                         │
│  Dez │                         │
└────────────────────────────────┘
```

Nach dem Loslassen erscheint ein kurzes Bestätigungs-Banner (ähnlich dem bisherigen Wizard-Trigger), das Zeitraum + Rhythmus zeigt. „Bestätigen" lässt den vertikalen Kalender verschwinden und blendet das Editor-Panel ein. Kein separater Wizard-Modal nötig — der Übergang ist inline.

---

### Layout im Bearbeitungsmodus

Zwei-Spalten-Layout — analog zur Planungsansicht:

```
┌──────────────────────────────────────────────────────────┐
│  [🧭 Stammkontext]  [Thema / Saison-Label]   [↑ Export] │
├────────────────────────────────┬─────────────────────────┤
│                                │                         │
│   JAHRESKALENDER               │   EDITOR-PANEL          │
│   (links, ~60 %)               │   (rechts, ~40 %)       │
│                                │                         │
│   MiniMonth-Raster             │   Accordion-Sektionen:  │
│   (12 Monate, gleich wie       │   · Thema               │
│   auf der Startseite)          │   · Stammzeit           │
│                                │   · Treffen             │
│   Stamm-Treffen  → waldgrün    │   · Aktionen            │
│   Stamm-Aktionen → waldgrün    │   · Aktivitäten         │
│   Distrikt/Reg.  → denim-blau  │                         │
│   Ferien/Feiertage → wie immer │                         │
│                                │                         │
└────────────────────────────────┴─────────────────────────┘
```

**Linke Spalte — Jahreskalender:**  
Nutzt die bestehende `MiniMonth`-Komponente im 3×4-Raster. Der Kontext-Layer (Balken, Punkte) ist neu, die Grundstruktur existiert bereits.

- Reguläre Stamm-Treffen → kleine waldgrüne Punkte/Boxen
- Stammaktionen → waldgrüne Balken (mehrtägig = Span über mehrere Tage)
- Distrikt- und Regional-Aktionen → Denim-Blau
- Feiertage und Ferien wie gewohnt

Klick auf freies Datum → Kontext-Menü: „Treffen hinzufügen" / „Aktion hinzufügen"  
Klick auf bestehendes Element → scrollt Editor-Panel zur entsprechenden Zeile

**Rechte Spalte — Editor-Panel:**  
Scrollbare Sektion mit Accordion-Gruppen (nicht exklusiv):

---

### Sektion 1: Thema

```
Thema *                [Freitext-Input, einzeilig            ]
Beschreibung           [Textarea, optional                   ]
Bearbeitungsnotiz      [Textarea, optional — erscheint auch  ]
                       [im Import-Dialog für Gruppenleiter   ]
```

---

### Sektion 2: Stammzeit pro Treffen

Analogie: Default-Anfangs- und Endblock, die für alle Treffen gelten (überschreibbar per Treffen).

```
Anfangsblock
  [+ Programmpunkt hinzufügen]
  ├─ [Stammrunde]  [15 Min]  [Typ: sonstiges]  [🗑]
  └─ [Andacht   ]  [10 Min]  [Typ: andacht   ]  [🗑]

Endblock
  [+ Programmpunkt hinzufügen]
  └─ [Abschlussrunde]  [10 Min]  [Typ: sonstiges]  [🗑]
```

Jeder Eintrag: Name (Freitext), Dauer in Minuten, Typ (Select aus Aktivitätstypen), Löschen.  
Reihenfolge via Drag-Handle änderbar.

---

### Sektion 3: Treffen

Liste aller regulären Stamm-Treffen — ähnlich der TreffenKarte, aber kompakter:

```
Treffen  [+ Termin hinzufügen]

09. Sep 2026  ·  90 Min  ·  [Anfang ▼]  [Ende ▼]  [🗑]
16. Sep 2026  ·  90 Min  ·  [...]
...
```

- **Datum**: Date-Picker
- **Dauer**: Minuten-Input
- **Anfang / Ende**: Dropdown — zeigt an, ob die Defaults gelten oder ein Override aktiv ist. Klick öffnet eine kleine Inliner-Liste wie in Sektion 2.
- **Hinzufügen**: Fügt ein neues Treffen am Ende (oder an einem sortierten Datum) ein.
- **Löschen**: Entfernt das Treffen (Bestätigung, wenn Planungen darauf verweisen).

Treffen werden **automatisch chronologisch sortiert** — kein manuelles Umsortieren nötig.

---

### Sektion 4: Aktionen

Drei Unter-Sektionen: **Stamm**, **Distrikt**, **Region** — je faltbar.

```
▼ Stamm-Aktionen               [+ Aktion hinzufügen]
  Herbstlager  ·  09.–12. Okt 2026  ·  Waldeck  [🗑]
  Stammversammlung  ·  07. Feb 2027  ·  Gemeindehaus  [🗑]

▶ Distrikt-Aktionen            [+ Aktion hinzufügen]
▶ Regional-Aktionen            [+ Aktion hinzufügen]
```

Klick auf eine Aktion öffnet ein Inline-Formular:
- Titel (Pflicht)
- Beginn / Ende (Date-Picker; Ende = Beginn als Default → eintägig)
- Ort (optional)
- Beschreibung (optional)

---

### Sektion 5: Aktivitäten fürs Repertoire

Optional — die Stammführung kann Aktivitäten mitliefern, die automatisch ins Repertoire der Gruppe importiert werden.

```
Aktivitäten  [+ Aktivität hinzufügen]

Bibelarbeit  ·  Andacht  ·  15–25 Min  [Wachstumsbereiche ▼]  [🗑]
Geländespiel  ·  Spiel   ·  30–45 Min  [Wachstumsbereiche ▼]  [🗑]
```

Felder: Name, Typ, Dauer-Range, Themen-Tags — und Wachstumsbereiche über denselben **WB-Editor** (s. u.), der auch im Repertoire eingesetzt wird. Aktivitäten tragen `quelle: 'stamm-import'`, werden beim manuellen Erfassen sofort ins Repertoire übernommen.

---

## Geteilter WB-Editor

Wachstumsbereiche lassen sich derzeit im Repertoire noch nicht bearbeiten. Das wird hier geschlossen — aber als **einzige, geteilte Komponente** (`WBAktivitaetEditor` o. Ä.), die an zwei Stellen eingebettet wird:

1. **Repertoire** — Aktivitäten-Detailansicht (Phase 12)
2. **Stammkontext-Editor** — Sektion „Aktivitäten" (diese Phase)

**Bedienmodell**: Für jeden der vier Wachstumsbereiche (körperlich / gesellschaftlich / geistig / geistlich) eine Zeile mit Intensitäts-Auswahl. Die vier diskreten Stufen werden als Segment oder als klickbare Dot-Reihe dargestellt — konsistent mit `WBIntensitySegment` aus dem Design-System.

```
Wachstumsbereiche
  Körperlich        – | ○ | ○ ○ | ○ ○ ○ ← vier Stufen
  Gesellschaftlich  – | ○ | ○ ○ | ○ ○ ○
  Geistig           – | ○ | ○ ○ | ○ ○ ○
  Geistlich         – | ○ | ○ ○ | ○ ○ ○
```

Nicht gesetzte Bereiche (Stufe 0) tragen nicht zu WB-Berechnungen bei und werden in der Übersicht nicht angezeigt. Ein Reset-Link setzt alle auf 0 zurück.

---

## Export

Der Kompass-Button oder ein Menü-Punkt in der Topbar bietet **„Als JSON exportieren"**. Damit kann die Stammführung den manuell gepflegten Kontext als Datei ausgeben und an Gruppenleiter weitergeben — dasselbe Format wie beim Import.

Analog: Ein bestehender JSON-Import kann im Editor nachbearbeitet und neu exportiert werden.

---

## Koexistenz mit dem JSON-Import

| Szenario | Verhalten |
|---|---|
| Manuell erfasst, kein Import | Editor ist die einzige Quelle |
| JSON importiert, nie manuell bearbeitet | Bestehender Flow unverändert; Editor zeigt die importierten Daten bearbeitbar |
| JSON importiert, dann manuell bearbeitet | Kontext gilt als lokal gepflegt — ein erneuter Import desselben Zeitraums ersetzt ihn nach Bestätigung |

---

## Verhältnis zu bestehenden Planungen

Stammkontexte überlappen sich nicht — ihre Zeiträume sind disjunkt. Eine Planung ist immer genau einem Stammkontext (oder keinem) zugeordnet; sie darf nicht über die Grenzen zweier Stammkontexte reichen. Der Planungs-Wizard verhindert das beim Anlegen, die `JahresplanerSidebar` visualisiert es entsprechend.

Planungen referenzieren den Stammkontext per ID (`stammKontextId`). Der Editor verändert den Kontext direkt — Planungen, die ihn nutzen, sehen die Änderungen sofort (StammKontextStore-Singleton, analog zu PlanungenStore). Bei kritischen Änderungen (Treffen gelöscht, das eine Planung nutzt) erscheint ein Warn-Toast.

---

## Wiederverwendung bestehender Komponenten

Die meiste visuelle Infrastruktur existiert bereits:

| Komponente | Herkunft | Einsatz hier |
|---|---|---|
| `JahresplanerSidebar` (vertikal, Drag-Geste) | Phase 11A | Zeitraum-Auswahl beim Anlegen |
| `MiniMonth` (12er-Raster) | Phase 4 | Jahreskalender links |
| Ferien-/Feiertags-Bänder | Phase 4/5 | unverändert |
| `WBIntensitySegment` | Phase 2 | Baustein des WB-Editors |
| `Accordion`, `Modal`, `Button`, `Input` | Phase 2 | Editor-Panel |
| `StammImportDialog` | Phase 8 | JSON-Import-Pfad unverändert |

Neu zu bauen: Kontext-Render-Layer im MiniMonth (Balken/Punkte für Stamm-Daten), Editor-Panel mit fünf Sektionen, `WBAktivitaetEditor` (geteilt mit Repertoire).

---

## Berechtigungsmodell

Wird **nicht** in dieser Phase vorbereitet. Die App kennt kein Login, und der Kompass-Button ist für alle Nutzer gleich zugänglich. Ein späterer „Stammführer-Modus" (z. B. per PIN oder separatem Profil) kann als eigene Phase nachgerüstet werden, ohne das jetzige Konzept zu brechen. Kein Hinweis-Banner o. Ä. nötig.

---

## Offene Fragen

1. **Rhythmus beim Anlegen**: Beim ersten Drag-Zeitraum — wird der Rhythmus direkt im Bestätigungs-Banner eingegeben (ähnlich wie im Planungs-Wizard), oder generiert der Stammkontext keine Treffen aus einem Rhythmus, sondern alle Treffen werden einzeln im Editor gepflegt? (Letzteres wäre konsistent mit dem JSON-Format, in dem Treffen explizit gelistet sind.)

2. **Thema als Kontext-Label**: Das `thema`-Feld des Stammkontexts dient bereits als primäre Bezeichnung (im Dropdown-Menü und in der Planungs-Zuweisung). Ein separates „Name"-Feld ist nicht nötig — das Thema IS der Name.

3. **Stammkontext-Auswahl in Planungen**: Wenn mehrere Kontexte existieren, muss der Planungs-Wizard (Schritt 2) die Auswahl anbieten. Das ist eine Folgeanpassung an Wizard Schritt 2, aber kein Blocker für dieses Konzept.
