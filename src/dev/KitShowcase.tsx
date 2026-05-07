/**
 * KitShowcase — /dev/kit route. Renders every primitive on one long page so
 * we can visually compare them against the wireframes and click-test the
 * interactive ones. Not shipped to users.
 */
import { useState, type MouseEvent, type ReactNode } from 'react'
import {
  Accordion,
  AccordionGroup,
  Badge,
  Button,
  Chip,
  ConfirmDialog,
  ContextMenu,
  Icon,
  IconButton,
  IconToggle,
  Input,
  Kbd,
  Modal,
  SegmentedControl,
  Select,
  Spotlight,
  Tabs,
  Toggle,
  Tooltip,
  type SpotlightItem,
} from '@/ui/primitives'
import {
  Avatar,
  AvatarGroup,
  DragHandle,
  DurationBar,
  TypeIcon,
  WBBar,
  WBDonut,
  WBDot,
  WBDotGrid,
  WBGoalBars,
  WBIntensitySegment,
} from '@/ui/domain'
import { WB_KEYS, WB_LABELS, type WBKey } from '@/domain/wb'
import styles from './KitShowcase.module.css'

type Section = {
  id: string
  title: string
  description?: string
  children: ReactNode
}

function SectionBlock({ id, title, description, children }: Section) {
  return (
    <section id={id} className={styles.section}>
      <header className={styles.sectionHeader}>
        <h2 className={styles.sectionTitle}>{title}</h2>
        {description && <p className={styles.sectionDesc}>{description}</p>}
      </header>
      <div className={styles.sectionBody}>{children}</div>
    </section>
  )
}

function Row({ children }: { children: ReactNode }) {
  return <div className={styles.row}>{children}</div>
}

function Stack({ children }: { children: ReactNode }) {
  return <div className={styles.stack}>{children}</div>
}

export function KitShowcase() {
  const [selectValue, setSelectValue] = useState<'a' | 'b' | 'c'>('a')
  const [toggleOn, setToggleOn] = useState(true)
  const [fixiert, setFixiert] = useState(true)
  const [fixiertB, setFixiertB] = useState(false)
  const [segView, setSegView] = useState<'monat' | 'woche' | 'liste'>('monat')
  const [tab, setTab] = useState<'entwurf' | 'aktiv' | 'archiv'>('aktiv')
  const [inputValue, setInputValue] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [spotlightOpen, setSpotlightOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [wbValues, setWbValues] = useState<Record<WBKey, number>>({
    koerperlich: 0,
    gesellschaftlich: 0,
    geistig: 0,
    geistlich: 0,
  })

  const openMenu = (e: MouseEvent) => {
    e.preventDefault()
    setMenuPos({ x: e.clientX, y: e.clientY })
  }

  const allSpotlightItems: SpotlightItem[] = [
    {
      id: 'new',
      label: 'Neue Planung',
      description: 'Planung anlegen und Zeitraum wählen',
      section: 'Aktionen',
      icon: 'plus',
      shortcut: '⌘+N',
      onSelect: () => {},
    },
    {
      id: 'open',
      label: 'Planung öffnen',
      section: 'Navigation',
      icon: 'calendar',
      onSelect: () => {},
    },
    {
      id: 'settings',
      label: 'Einstellungen',
      section: 'Navigation',
      icon: 'settings',
      onSelect: () => {},
    },
  ]
  const spotlightItems = allSpotlightItems.filter((item) =>
    String(item.label).toLowerCase().includes(query.toLowerCase()),
  )

  const wbBarValues: Partial<Record<WBKey, number>> = {
    koerperlich: 45,
    gesellschaftlich: 60,
    geistig: 20,
    geistlich: 30,
  }

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>UI-Kit</h1>
        <p className={styles.pageDesc}>
          Sichtprüfung aller Primitive. Stand: Phasen 1 & 2.
        </p>
      </header>

      <SectionBlock
        id="buttons"
        title="Buttons"
        description="Primary, secondary, ghost, danger, dashed; drei Größen, mit/ohne Icon."
      >
        <Stack>
          <Row>
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Löschen</Button>
            <Button variant="dashed" icon="plus">
              Treffen hinzufügen
            </Button>
          </Row>
          <Row>
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
            <Button loading>Lädt…</Button>
            <Button icon="download" iconRight="chevron-down">
              Export
            </Button>
          </Row>
          <Row>
            <IconButton icon="settings" label="Einstellungen" />
            <IconButton icon="trash" label="Löschen" tone="danger" />
            <IconButton icon="plus" label="Neu" shape="square" />
          </Row>
        </Stack>
      </SectionBlock>

      <SectionBlock id="inputs" title="Inputs & Select">
        <Stack>
          <Row>
            <Input
              label="Name"
              placeholder="Gruppenleiter"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
            <Input label="Mit Adornment" adornment="Optional" placeholder="…" />
            <Input label="Fehler" error="Pflichtfeld" defaultValue="" />
            <Input sizeVariant="sm" label="Klein" placeholder="sm" />
          </Row>
          <Row>
            <Select
              label="Rhythmus"
              value={selectValue}
              onValueChange={setSelectValue}
              options={[
                { value: 'a', label: 'Wöchentlich' },
                { value: 'b', label: '14-täglich' },
                { value: 'c', label: 'Monatlich' },
              ]}
            />
            <Select
              label="Klein"
              sizeVariant="sm"
              value={selectValue}
              onValueChange={setSelectValue}
              options={[
                { value: 'a', label: 'A' },
                { value: 'b', label: 'B' },
                { value: 'c', label: 'C' },
              ]}
            />
          </Row>
        </Stack>
      </SectionBlock>

      <SectionBlock id="chips-badges" title="Chips, Badges, Kbd, Tooltip">
        <Stack>
          <Row>
            <Chip>Default</Chip>
            <Chip tone="accent" icon="link">
              Import
            </Chip>
            <Chip tone="ok">OK</Chip>
            <Chip tone="warn">Warnung</Chip>
            <Chip tone="err">Fehler</Chip>
            <Chip as="button" selected>
              Ausgewählt
            </Chip>
            <Chip onRemove={() => {}}>Entfernbar</Chip>
          </Row>
          <Row>
            <Badge tone="neutral">Entwurf</Badge>
            <Badge tone="accent">Aktiv</Badge>
            <Badge tone="ok">Abgeschlossen</Badge>
            <Badge tone="warn">Überfällig</Badge>
            <Badge tone="err">Abgebrochen</Badge>
            <Badge variant="outline" tone="accent">
              Outline
            </Badge>
            <Badge variant="solid" tone="neutral">
              Solid
            </Badge>
          </Row>
          <Row>
            <span>Spotlight öffnen mit</span>
            <Kbd keys="⌘+K" />
            <span>oder</span>
            <Kbd keys="Esc" />
            <Tooltip label="Zeitbalken-Einstellungen">
              <IconButton icon="info" label="Info" />
            </Tooltip>
          </Row>
        </Stack>
      </SectionBlock>

      <SectionBlock id="toggles" title="Toggle, IconToggle, Segmented, Tabs">
        <Stack>
          <Row>
            <span className={styles.wbLabel}>Fixieren (Kette)</span>
            <IconToggle
              pressed={fixiert}
              onPressedChange={setFixiert}
              iconPressed="link"
              iconUnpressed="link-open"
              label="Fixieren"
              labelPressed="Fixiert — bei Kaskaden unberührt"
              labelUnpressed="Nicht fixiert — folgt Kaskade"
            />
            <IconToggle
              pressed={fixiertB}
              onPressedChange={setFixiertB}
              iconPressed="link"
              iconUnpressed="link-open"
              label="Fixieren"
              tone="accent"
              sizeVariant="sm"
            />
            <span className={styles.mutedSmall}>
              klick zum Umschalten — Kette schließt/öffnet sich
            </span>
          </Row>
          <Row>
            <Toggle
              label="Switch (für andere Kontexte)"
              hint="z. B. „Importierte Aktivitäten anzeigen"
              checked={toggleOn}
              onCheckedChange={setToggleOn}
            />
            <Toggle
              sizeVariant="sm"
              label="Kompakt"
              checked={!toggleOn}
              onCheckedChange={(v) => setToggleOn(!v)}
            />
          </Row>
          <Row>
            <SegmentedControl
              value={segView}
              onValueChange={setSegView}
              options={[
                { value: 'monat', label: 'Monat', icon: 'grid' },
                { value: 'woche', label: 'Woche', icon: 'calendar' },
                { value: 'liste', label: 'Liste', icon: 'list' },
              ]}
            />
          </Row>
          <Row>
            <Tabs
              value={tab}
              onValueChange={setTab}
              items={[
                { value: 'entwurf', label: 'Entwurf', count: 1 },
                { value: 'aktiv', label: 'Aktiv', count: 3 },
                { value: 'archiv', label: 'Archiv', count: 12 },
              ]}
            />
          </Row>
          <Row>
            <Tabs
              variant="pill"
              value={tab}
              onValueChange={setTab}
              items={[
                { value: 'entwurf', label: 'Entwurf' },
                { value: 'aktiv', label: 'Aktiv' },
                { value: 'archiv', label: 'Archiv' },
              ]}
            />
          </Row>
        </Stack>
      </SectionBlock>

      <SectionBlock id="accordion" title="Accordion, AccordionGroup (exclusive)">
        <Stack>
          <div className={styles.subhead}>Einzel-Accordion (multi)</div>
          <Accordion title="Zeitbudget-Einstellungen" defaultOpen>
            <Stack>
              <Input label="Dauer" type="number" defaultValue={90} />
              <Input label="Stamm-Abzug" type="number" defaultValue={15} />
            </Stack>
          </Accordion>
          <Accordion
            title="Kaskade"
            trailing={<Badge tone="muted">3 Treffen betroffen</Badge>}
          >
            Details zur Kaskadenlogik werden hier angezeigt.
          </Accordion>

          <div className={styles.subhead}>
            AccordionGroup (exclusive) — nur eins offen gleichzeitig
          </div>
          <div className={styles.sidepanel}>
            <AccordionGroup
              mode="exclusive"
              defaultOpen="andacht"
              items={[
                {
                  id: 'andacht',
                  title: 'Andacht',
                  trailing: <Badge tone="muted">3/12</Badge>,
                  children: (
                    <Stack>
                      <Chip icon="book">Römerbrief 8</Chip>
                      <Chip icon="note">Material: Leinwand, Kaffee</Chip>
                    </Stack>
                  ),
                },
                {
                  id: 'abzeichen',
                  title: 'Abzeichen',
                  trailing: <Badge tone="muted">2 aktiv</Badge>,
                  children: (
                    <Stack>
                      <Chip>Pfadfinder-Knoten</Chip>
                      <Chip>Lagerfeuer</Chip>
                    </Stack>
                  ),
                },
                {
                  id: 'mitarbeiter',
                  title: 'Mitarbeiter',
                  trailing: <Badge tone="muted">4</Badge>,
                  children: (
                    <AvatarGroup
                      names={['Aaron Müller', 'Lena Schmidt', 'Tim Berger', 'Jana Kraus']}
                    />
                  ),
                },
                {
                  id: 'kontext',
                  title: 'Stamm-Kontext',
                  children: 'Stamm-Aktion „Herbstlager 2025" belegt 90 Min.',
                },
              ]}
            />
          </div>
        </Stack>
      </SectionBlock>

      <SectionBlock id="overlays" title="Modal, ConfirmDialog, Spotlight, ContextMenu">
        <Row>
          <Button onClick={() => setModalOpen(true)}>Modal öffnen</Button>
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Bestätigungs-Dialog
          </Button>
          <Button variant="secondary" onClick={() => setSpotlightOpen(true)}>
            Spotlight
          </Button>
          <Button variant="secondary" onClick={openMenu}>
            Rechtsklick-Menü (hier klicken)
          </Button>
        </Row>

        <Modal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          title="Programmpunkt bearbeiten"
          description="Nimm Änderungen an Dauer, WB-Tags und Verantwortlichen vor."
          footer={
            <>
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Abbrechen
              </Button>
              <Button onClick={() => setModalOpen(false)}>Speichern</Button>
            </>
          }
        >
          <Stack>
            <Input label="Name" defaultValue="Geländespiel" />
            <Input type="number" label="Dauer (Min.)" defaultValue={30} />
          </Stack>
        </Modal>

        <ConfirmDialog
          open={confirmOpen}
          onCancel={() => setConfirmOpen(false)}
          onConfirm={() => setConfirmOpen(false)}
          title="Treffen wirklich löschen?"
          description="Die nachfolgenden Treffen rücken in der Kaskade eins nach vorne."
          tone="danger"
          confirmLabel="Löschen"
        />

        <Spotlight
          open={spotlightOpen}
          onClose={() => setSpotlightOpen(false)}
          query={query}
          onQueryChange={setQuery}
          items={spotlightItems}
        />

        <ContextMenu
          open={menuPos !== null}
          onClose={() => setMenuPos(null)}
          position={menuPos}
          sections={[
            {
              id: 'edit',
              items: [
                {
                  id: 'rename',
                  label: 'Umbenennen',
                  icon: 'note',
                  onSelect: () => {},
                },
                {
                  id: 'duplicate',
                  label: 'Duplizieren',
                  icon: 'file',
                  shortcut: '⌘+D',
                  onSelect: () => {},
                },
              ],
            },
            {
              id: 'danger',
              items: [
                {
                  id: 'delete',
                  label: 'Löschen',
                  icon: 'trash',
                  tone: 'danger',
                  onSelect: () => {},
                },
              ],
            },
          ]}
        />
      </SectionBlock>

      <SectionBlock
        id="wb"
        title="WB-System"
        description="Die vier Wachstumsbereiche als Punkte, Bar, Donut und Intensitäts-Segment."
      >
        <Stack>
          <Row>
            {WB_KEYS.map((k) => (
              <span key={k} className={styles.wbLabel}>
                <WBDot wb={k} intensity={1} size={16} />
                {WB_LABELS[k]}
              </span>
            ))}
          </Row>
          <Row>
            <WBDotGrid tags={{ koerperlich: 1, gesellschaftlich: 0.5, geistig: 0.25, geistlich: 0 }} />
            <WBDotGrid
              tags={{ koerperlich: 1, gesellschaftlich: 0.5, geistig: 0 }}
              hideZero
              size={14}
            />
          </Row>
          <div className={styles.wbBarWrap}>
            <WBBar values={wbBarValues} height={10} />
          </div>
          <Row>
            <WBDonut values={wbBarValues} size={64} thickness={10}>
              2h
            </WBDonut>
            <WBDonut values={wbBarValues} size={48} thickness={8} />
            <WBDonut values={{ koerperlich: 1 }} size={40} thickness={7} />
          </Row>
          <div className={styles.subhead}>
            Ziel-Balken pro WB — Ist-Anteil mit markiertem Ziel-Intervall
          </div>
          <div className={styles.wbBarWrap}>
            <WBGoalBars
              data={{
                koerperlich: { share: 0.28, target: [0.2, 0.35] },
                gesellschaftlich: { share: 0.42, target: [0.2, 0.35] },
                geistig: { share: 0.12, target: [0.15, 0.25] },
                geistlich: { share: 0.18, target: [0.15, 0.25] },
              }}
            />
          </div>
          <Stack>
            {WB_KEYS.map((k) => (
              <Row key={k}>
                <span className={styles.wbLabel}>
                  <WBDot wb={k} />
                  {WB_LABELS[k]}
                </span>
                <WBIntensitySegment
                  wb={k}
                  value={wbValues[k]}
                  onChange={(v) =>
                    setWbValues((prev) => ({ ...prev, [k]: v }))
                  }
                />
              </Row>
            ))}
          </Stack>
        </Stack>
      </SectionBlock>

      <SectionBlock id="avatars" title="Avatars">
        <Stack>
          <Row>
            <Avatar name="Aaron Müller" />
            <Avatar name="Lena Schmidt" />
            <Avatar name="Tim Berger" size={32} />
            <Avatar name="Jana Kraus" size={40} />
            <Avatar name="Gast" tone="muted" />
            <Avatar name="Anton Brand" tone="brand" />
          </Row>
          <Row>
            <AvatarGroup
              names={['Aaron Müller', 'Lena Schmidt', 'Tim Berger', 'Jana Kraus', 'Max']}
              max={3}
            />
          </Row>
        </Stack>
      </SectionBlock>

      <SectionBlock id="duration" title="Zeitbalken">
        <Stack>
          {/* Zielintervall default [0.7, 0.9] = 52.5 – 67.5 min bei 75 Budget */}
          <div className={styles.durationWrap}>
            <DurationBar ist={40} verfuegbar={75} showLabel />
          </div>
          <div className={styles.durationWrap}>
            <DurationBar ist={55} verfuegbar={75} showLabel />
          </div>
          <div className={styles.durationWrap}>
            <DurationBar ist={65} verfuegbar={75} showLabel />
          </div>
          <div className={styles.durationWrap}>
            <DurationBar ist={72} verfuegbar={75} showLabel />
          </div>
          <div className={styles.durationWrap}>
            <DurationBar ist={90} verfuegbar={75} showLabel />
          </div>
          <div className={styles.durationWrap}>
            <DurationBar
              ist={60}
              verfuegbar={75}
              showLabel
              targetRange={[0.6, 1.0]}
            />
          </div>
        </Stack>
      </SectionBlock>

      <SectionBlock id="misc" title="DragHandle, TypeIcon">
        <Stack>
          <Row>
            <DragHandle />
            <span className={styles.mutedSmall}>← aktiv beim Drag</span>
          </Row>
          <Row>
            <TypeIcon type={{ kind: 'treffen', value: 'regulaer' }} />
            <TypeIcon type={{ kind: 'treffen', value: 'extra-geplant' }} />
            <TypeIcon type={{ kind: 'treffen', value: 'extra-aktion' }} />
            <TypeIcon type={{ kind: 'programmpunkt', value: 'konkret' }} />
            <TypeIcon type={{ kind: 'programmpunkt', value: 'abstrakt' }} />
            <TypeIcon type={{ kind: 'programmpunkt', value: 'wegezeit' }} />
            <TypeIcon type={{ kind: 'andacht' }} tone="accent" />
            <TypeIcon type={{ kind: 'stamm' }} />
          </Row>
        </Stack>
      </SectionBlock>

      <SectionBlock id="icons" title="Icons (vollständige Palette)">
        <div className={styles.iconGrid}>
          {(
            [
              'grid',
              'calendar',
              'list',
              'book',
              'settings',
              'plus',
              'minus',
              'x',
              'check',
              'chevron-down',
              'chevron-up',
              'chevron-right',
              'chevron-left',
              'search',
              'link',
              'link-open',
              'drag-handle',
              'clock',
              'note',
              'info',
              'warning',
              'trash',
              'upload',
              'download',
              'file',
              'user',
              'users',
            ] as const
          ).map((name) => (
            <div key={name} className={styles.iconCell} title={name}>
              <Icon name={name} size={18} />
              <span>{name}</span>
            </div>
          ))}
        </div>
      </SectionBlock>
    </div>
  )
}
