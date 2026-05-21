/**
 * Planungsliste — rechte Spalte der Startseite (concept §6).
 *
 * - Lädt die Planungen aus dem Store + StammKontexte.
 * - Rendert PlanungsCards + StammKontext-Karten.
 * - Top-Button öffnet den Neue-Planung-Dialog oder Kontext-Import.
 * - DropZone um die gesamte Spalte für JSON-Import.
 */
import {isoToday} from '@/domain/dateUtils'
import type {PlanungId} from '@/domain/ids'
import type {Planung, StammKontext} from '@/domain/types'
import {usePlanungen} from '@/features/planungen'
import {useStammKontext} from '@/features/stammKontext'
import {useMemo, useRef, useState} from 'react'
import {useNavigate} from 'react-router-dom'
import {DropZone} from './DropZone'
import {NewPlanungWizard} from './NewPlanungWizard'
import {PlanungsCard} from './PlanungsCard'
import {PlanungslisteHeader} from './PlanungslisteHeader'
import styles from './Planungsliste.module.css'
import {StammImportDialog} from './StammImportDialog'
import {StammKontextCard} from './StammKontextCard'
import {useStammKontextImport} from './useStammKontextImport'

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

  const yearPlanungen = useMemo(
    () => planungen.filter((p) => planungInYear(p, displayYear)),
    [planungen, displayYear],
  )
  const yearKontexte = useMemo(
    () => kontexte.filter((k) => kontextInYear(k, displayYear)),
    [kontexte, displayYear],
  )

  const [dialogOpen, setDialogOpen] = useState(false)
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    parseError, setParseError, pendingImport, setPendingImport,
    handleFileDrop, handleFileInput, handleConfirmImport,
  } = useStammKontextImport()

  return (
    <DropZone onFileDrop={handleFileDrop}>
      <div className={styles.root}>
        <PlanungslisteHeader
          onNewPlanung={() => setDialogOpen(true)}
          onLoadKontext={() => fileInputRef.current?.click()}
        />

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

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileInput}
          style={{ display: 'none' }}
        />

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
