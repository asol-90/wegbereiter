/**
 * Planungsliste — rechte Spalte der Startseite (concept §6).
 *
 * - Lädt die Planungen aus dem Store + StammKontexte.
 * - Rendert PlanungsCards + StammKontext-Karten.
 * - Top-Button öffnet den Neue-Planung-Dialog oder Kontext-Import.
 * - DropZone um die gesamte Spalte für JSON-Import.
 */
import { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ContextMenu, type MenuItem } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import { usePlanungen } from '@/features/planungen'
import { useStammKontext, useStammKontextActions } from '@/features/stammKontext'
import type { PlanungId } from '@/domain/ids'
import type { Planung } from '@/domain/types'
import { parseStammDatei, StammParseError, detectFileType } from '@/domain/stammParser'
import { checkOverlap, clipKontext } from '@/domain/stammOverlap'
import type { StammKontext, Aktivitaet } from '@/domain/types'
import { isoToday } from '@/domain/dateUtils'
import { repertoireStore } from '@/features/repertoire/repertoireStore'
import { NewPlanungWizard } from './NewPlanungWizard'
import { PlanungsCard } from './PlanungsCard'
import { StammKontextCard } from './StammKontextCard'
import { StammImportDialog } from './StammImportDialog'
import { DropZone } from './DropZone'
import styles from './Planungsliste.module.css'

export type PlanungslisteProps = {
  /** Year currently displayed in the Jahreskalender. */
  displayYear: number
  /** ID of a planung to visually highlight (cross-hover with Jahreskalender). */
  highlightedPlanungId?: PlanungId | null
  onPlanungHover?: (id: PlanungId | null) => void
}

/** Does a Planung have any Treffen in the given year, or does its zeitraum overlap it? */
function planungInYear(p: Planung, year: number): boolean {
  const prefix = `${year}`
  if (p.treffen.some((t) => t.datum.startsWith(prefix))) return true
  return p.zeitraum.start <= `${year}-12-31` && p.zeitraum.ende >= `${year}-01-01`
}

/** Does a Kontext have any Treffen or Aktionen in the given year? */
function kontextInYear(k: StammKontext, year: number): boolean {
  const prefix = `${year}`
  return (
    k.treffen.some((t) => t.datum.startsWith(prefix)) ||
    k.stammaktionen.some((a) => a.beginn.startsWith(prefix) || a.ende.startsWith(prefix))
  )
}

/** Is a Planung's last Treffen before today? */
function planungIsPast(p: Planung, today: string): boolean {
  if (p.treffen.length === 0) return false
  const last = p.treffen[p.treffen.length - 1]
  return last!.datum < today
}

/** Is a Kontext's last date before today? */
function kontextIsPast(k: StammKontext, today: string): boolean {
  const allDates = [
    ...k.treffen.map((t) => t.datum),
    ...k.stammaktionen.map((a) => a.ende),
  ]
  if (allDates.length === 0) return false
  return allDates.every((d) => d < today)
}

export function Planungsliste({
  displayYear,
  highlightedPlanungId,
  onPlanungHover,
}: PlanungslisteProps) {
  const { loaded, planungen } = usePlanungen()
  const { kontexte } = useStammKontext()
  const today = isoToday()

  // Filter by displayed year
  const yearPlanungen = useMemo(
    () => planungen.filter((p) => planungInYear(p, displayYear)),
    [planungen, displayYear],
  )
  const yearKontexte = useMemo(
    () => kontexte.filter((k) => kontextInYear(k, displayYear)),
    [kontexte, displayYear],
  )
  const stammActions = useStammKontextActions()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)
  const navigate = useNavigate()

  // Import state
  const [parseError, setParseError] = useState<string | null>(null)
  const [pendingImport, setPendingImport] = useState<{
    kontext: StammKontext
    aktivitaeten: Aktivitaet[]
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileDrop = useCallback((content: string, _fileName: string) => {
    setParseError(null)
    const fileType = detectFileType(content)
    if (fileType === 'stammkontext') {
      try {
        const result = parseStammDatei(content)
        setPendingImport(result)
      } catch (e) {
        setParseError(
          e instanceof StammParseError
            ? e.message
            : 'Die Datei konnte nicht gelesen werden.',
        )
      }
    } else {
      setParseError('Unbekanntes Dateiformat. Erwartet: Stammkontext-JSON.')
    }
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          handleFileDrop(reader.result, file.name)
        }
      }
      reader.readAsText(file)
      // Reset input so the same file can be selected again
      e.target.value = ''
    },
    [handleFileDrop],
  )

  const handleConfirmImport = useCallback(async () => {
    if (!pendingImport) return
    const { kontext: incoming, aktivitaeten: incomingAktivitaeten } = pendingImport

    for (const existing of kontexte) {
      const result = checkOverlap(existing, incoming)
      if (result.kind === 'overlap') {
        const clipped = clipKontext(existing, result.overlapStart)
        if (clipped) {
          await stammActions.update(clipped)
        } else {
          await stammActions.remove(existing.id)
        }
      }
    }

    await stammActions.importKontext(incoming)

    for (const a of incomingAktivitaeten) {
      await repertoireStore.saveAktivitaet(a)
    }

    setPendingImport(null)
  }, [pendingImport, kontexte, stammActions])

  const menuItems: MenuItem[] = [
    {
      id: 'planung',
      label: 'Neue Planung',
      icon: 'plus',
      onSelect: () => setDialogOpen(true),
    },
    {
      id: 'kontext',
      label: 'Kontext laden',
      icon: 'upload',
      onSelect: () => fileInputRef.current?.click(),
    },
  ]

  return (
    <DropZone onFileDrop={handleFileDrop}>
      <div className={styles.root}>
        <div className={styles.header}>
          <span className={styles.sectionLabel}>Planungen & Kontext</span>
          <div className={styles.headerActions}>
            <div className={styles.splitBtn}>
              <button
                type="button"
                className={styles.splitMain}
                onClick={() => setDialogOpen(true)}
              >
                <Icon name="plus" size={12} />
                <span>Neu</span>
              </button>
              <button
                type="button"
                className={styles.splitChevron}
                onClick={(e) => {
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                  setMenuAnchor({ x: rect.right, y: rect.bottom + 4 })
                  setMenuOpen((prev) => !prev)
                }}
                aria-label="Weitere Optionen"
              >
                <Icon name="chevron-down" size={12} />
              </button>
            </div>
            {menuOpen && menuAnchor && (
              <ContextMenu
                open={menuOpen}
                sections={[{ id: 'main', items: menuItems }]}
                position={menuAnchor}
                onClose={() => setMenuOpen(false)}
              />
            )}
          </div>
        </div>

        {/* StammKontext cards (filtered by year) */}
        {yearKontexte.length > 0 && (
          <div className={styles.kontextSection}>
            {yearKontexte.map((k) => (
              <StammKontextCard
                key={k.id}
                kontext={k}
                past={kontextIsPast(k, today)}
              />
            ))}
          </div>
        )}

        {/* Parse error banner */}
        {parseError && (
          <div className={styles.error}>
            <span>{parseError}</span>
            <button
              className={styles.errorDismiss}
              onClick={() => setParseError(null)}
              aria-label="Schließen"
            >
              ×
            </button>
          </div>
        )}

        <div className={styles.list}>
          {!loaded && <p className={styles.hint}>Lade Planungen…</p>}
          {loaded && yearPlanungen.length === 0 && yearKontexte.length === 0 && (
            <p className={styles.emptyYear}>
              Keine Planungen oder Kontexte in {displayYear}.
            </p>
          )}
          {loaded && yearPlanungen.length === 0 && yearKontexte.length > 0 && (
            <p className={styles.emptyYear}>
              Stammkontext vorhanden. Lege jetzt eine Planung an.
            </p>
          )}
          {loaded &&
            yearPlanungen.map((p) => (
              <PlanungsCard
                key={p.id}
                planung={p}
                to={`/planung/${p.id}/kalender`}
                highlighted={highlightedPlanungId === p.id}
                past={planungIsPast(p, today)}
                onMouseEnter={() => onPlanungHover?.(p.id)}
                onMouseLeave={() => onPlanungHover?.(null)}
              />
            ))}
        </div>

        {/* Hidden file input for "Kontext laden" menu action */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

        {/* Import preview dialog */}
        {pendingImport && (
          <StammImportDialog
            open
            kontext={pendingImport.kontext}
            aktivitaeten={pendingImport.aktivitaeten}
            onConfirm={handleConfirmImport}
            onCancel={() => setPendingImport(null)}
          />
        )}

        <NewPlanungWizard
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          onCreated={(p) => navigate(`/planung/${p.id}/kalender`)}
        />
      </div>
    </DropZone>
  )
}
