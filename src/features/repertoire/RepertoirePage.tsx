/**
 * RepertoirePage — Repertoire-Verwaltung (Phase 12).
 *
 * SegmentedControl mit 4 Segmenten:
 *   Aktivitäten | Pfadfindertechnik | Andachtsreihen | Abzeichen
 *
 * Layout: Liste links (65 %), Detail/Edit-Panel rechts (35 %).
 */
import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import { Panels, Panel } from '@/features/appShell'
import { useRepertoire, useRepertoireActions } from './useRepertoire'
import { Icon } from '@/ui/primitives/Icon'
import { SegmentedControl } from '@/ui/primitives/SegmentedControl'
import { newId, type AktivitaetId, type AndachtsreiheId, type AbzeichenId } from '@/domain/ids'
import type { Aktivitaet, Andachtsreihe, Abzeichen } from '@/domain/types'
import {
  AKTIVITAET_TYPEN,
} from '@/domain/aktivitaetKatalog'
import { parseRepertoireImport } from './repertoireImport'
import styles from './RepertoirePage.module.css'
import { AktivitaetenListe } from './AktivitaetenListe'
import { AktivitaetDetail } from './AktivitaetDetail'
import { PfadfindertechnikListe } from './PfadfindertechnikListe'
import { AndachtsreihenListe } from './AndachtsreihenListe'
import { AndachtsreiheDetail } from './AndachtsreiheDetail'
import { AbzeichenListe } from './AbzeichenListe'
import { AbzeichenDetail } from './AbzeichenDetail'

// ─── Segment type ─────────────────────────────────────────────────────────

type RepertoireSegment = 'aktivitaeten' | 'pfadfindertechnik' | 'andachtsreihen' | 'abzeichen'

const SEGMENT_OPTIONS: { value: RepertoireSegment; label: string }[] = [
  { value: 'aktivitaeten', label: 'Aktivitäten' },
  { value: 'pfadfindertechnik', label: 'Pfadfindertechnik' },
  { value: 'andachtsreihen', label: 'Andachtsreihen' },
  { value: 'abzeichen', label: 'Abzeichen' },
]

/** Typen, die im Aktivitäten-Tab angezeigt werden (ohne Pfadfindertechnik + Wegezeit). */
const AKT_FILTERABLE_TYPEN = AKTIVITAET_TYPEN.filter(
  (t) => t !== 'wegezeit' && t !== 'pfadfindertechnik',
)

// ═══════════════════════════════════════════════════════════════════════════
// PAGE
// ═══════════════════════════════════════════════════════════════════════════

export function RepertoirePage() {
  const { aktivitaeten, andachtsreihen, abzeichen, loaded } = useRepertoire()
  const {
    save, remove, saveAndachtsreihe, removeAndachtsreihe: _removeAndachtsreihe,
    importAktivitaeten, importAndachtsreihen, importAbzeichen,
  } = useRepertoireActions()
  const [segment, setSegment] = useState<RepertoireSegment>('aktivitaeten')

  // ── Drag-over detection ──
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const dragCountRef = useRef(0)

  useEffect(() => {
    function onDragEnter(e: DragEvent) {
      if (e.dataTransfer?.types.includes('Files')) {
        dragCountRef.current++
        setIsDraggingFile(true)
      }
    }
    function onDragLeave(e: DragEvent) {
      if (!e.relatedTarget) {
        dragCountRef.current = 0
        setIsDraggingFile(false)
      }
    }
    function onDrop() {
      dragCountRef.current = 0
      setIsDraggingFile(false)
    }
    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDrop)
    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDrop)
    }
  }, [])

  // Selection state per segment
  const [selectedAktId, setSelectedAktId] = useState<AktivitaetId | null>(null)
  const [selectedPtId, setSelectedPtId] = useState<AktivitaetId | null>(null)
  const [selectedReiheId, setSelectedReiheId] = useState<AndachtsreiheId | null>(null)
  const [selectedAbzId, setSelectedAbzId] = useState<AbzeichenId | null>(null)

  // Lookups
  const selectedAkt = useMemo(
    () => aktivitaeten.find((a) => a.id === selectedAktId) ?? null,
    [aktivitaeten, selectedAktId],
  )
  const selectedPt = useMemo(
    () => aktivitaeten.find((a) => a.id === selectedPtId) ?? null,
    [aktivitaeten, selectedPtId],
  )
  const selectedReihe = useMemo(
    () => andachtsreihen.find((r) => r.id === selectedReiheId) ?? null,
    [andachtsreihen, selectedReiheId],
  )
  const selectedAbz = useMemo(
    () => abzeichen.find((a) => a.id === selectedAbzId) ?? null,
    [abzeichen, selectedAbzId],
  )

  // Handlers
  const handleSaveAkt = useCallback(async (a: Aktivitaet) => { await save(a) }, [save])

  const handleDeactivateAkt = useCallback(async (id: AktivitaetId) => {
    const akt = aktivitaeten.find((a) => a.id === id)
    if (!akt) return
    await save({ ...akt, deaktiviert: true })
    setSelectedAktId(null)
    setSelectedPtId(null)
  }, [aktivitaeten, save])

  const handleDeleteAkt = useCallback(async (id: AktivitaetId) => {
    await remove(id)
    setSelectedAktId(null)
    setSelectedPtId(null)
  }, [remove])

  const handleNewAkt = useCallback(async () => {
    const newAkt: Aktivitaet = {
      id: newId<AktivitaetId>(),
      name: 'Neue Aktivität',
      typ: 'sonstiges',
      wbTags: [],
      themenTags: [],
      zeitMin: 15,
      zeitMax: 30,
      quelle: 'eigene',
    }
    await save(newAkt)
    setSelectedAktId(newAkt.id)
  }, [save])

  const handleNewPt = useCallback(async () => {
    const newAkt: Aktivitaet = {
      id: newId<AktivitaetId>(),
      name: 'Neue Pfadfindertechnik',
      typ: 'pfadfindertechnik',
      wbTags: [],
      themenTags: [],
      zeitMin: 15,
      zeitMax: 30,
      quelle: 'eigene',
    }
    await save(newAkt)
    setSelectedPtId(newAkt.id)
  }, [save])

  const handleSaveReihe = useCallback(async (r: Andachtsreihe) => {
    await saveAndachtsreihe(r)
  }, [saveAndachtsreihe])

  const handleDeactivateReihe = useCallback(async (id: AndachtsreiheId) => {
    const r = andachtsreihen.find((r) => r.id === id)
    if (!r) return
    await saveAndachtsreihe({ ...r, deaktiviert: true })
    setSelectedReiheId(null)
  }, [andachtsreihen, saveAndachtsreihe])

  const handleNewReihe = useCallback(async () => {
    const newR: Andachtsreihe = {
      id: newId<AndachtsreiheId>(),
      name: 'Neue Andachtsreihe',
      art: 'reihe',
      quelle: 'eigene',
      einheiten: [],
    }
    await saveAndachtsreihe(newR)
    setSelectedReiheId(newR.id)
  }, [saveAndachtsreihe])

  const handleCreateFromAnforderung = useCallback(async (anf: Abzeichen['anforderungen'][number]) => {
    const newAkt: Aktivitaet = {
      id: newId<AktivitaetId>(),
      name: anf.name,
      typ: anf.typ,
      untertyp: anf.untertyp,
      wbTags: [],
      themenTags: [],
      zeitMin: anf.zeitMin,
      zeitMax: anf.zeitMax,
      stufenbezug: [anf.id],
      quelle: 'eigene',
    }
    await save(newAkt)
  }, [save])

  // ── File drop handler ──
  const [importFeedback, setImportFeedback] = useState<{ type: 'ok' | 'err'; message: string } | null>(null)

  const handleFileDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault()
    dragCountRef.current = 0
    setIsDraggingFile(false)

    const file = Array.from(e.dataTransfer.files).find((f) => f.name.endsWith('.json'))
    if (!file) {
      setImportFeedback({ type: 'err', message: 'Nur JSON-Dateien werden unterstützt.' })
      return
    }

    let data: unknown
    try {
      data = JSON.parse(await file.text())
    } catch {
      setImportFeedback({ type: 'err', message: 'Datei ist kein gültiges JSON.' })
      return
    }

    const outcome = parseRepertoireImport(data)
    if (outcome.kind === 'unknown') {
      setImportFeedback({ type: 'err', message: outcome.error })
      return
    }
    if (!outcome.result.ok) {
      setImportFeedback({ type: 'err', message: outcome.result.error })
      return
    }

    const { items, skipped } = outcome.result
    if (items.length === 0) {
      setImportFeedback({ type: 'err', message: 'Keine gültigen Einträge in der Datei.' })
      return
    }

    if (outcome.kind === 'aktivitaeten') {
      await importAktivitaeten(items as Aktivitaet[])
      setSegment(
        (items as Aktivitaet[]).some((a) => a.typ === 'pfadfindertechnik')
          ? 'pfadfindertechnik'
          : 'aktivitaeten',
      )
    } else if (outcome.kind === 'andachtsreihen') {
      await importAndachtsreihen(items as Andachtsreihe[])
      setSegment('andachtsreihen')
    } else if (outcome.kind === 'abzeichen') {
      await importAbzeichen(items as Abzeichen[])
      setSegment('abzeichen')
    }

    const skipNote = skipped > 0 ? `, ${skipped} übersprungen` : ''
    setImportFeedback({ type: 'ok', message: `${items.length} Einträge importiert${skipNote}.` })
    setTimeout(() => setImportFeedback(null), 4000)
  }, [importAktivitaeten, importAndachtsreihen, importAbzeichen])

  if (!loaded) return null

  // ── Render list + detail for current segment ──

  let listContent: React.ReactNode
  let detailContent: React.ReactNode

  switch (segment) {
    case 'aktivitaeten':
      listContent = (
        <AktivitaetenListe
          aktivitaeten={aktivitaeten}
          selectedId={selectedAktId}
          onSelect={setSelectedAktId}
          onNew={handleNewAkt}
        />
      )
      detailContent = selectedAkt ? (
        <AktivitaetDetail
          aktivitaet={selectedAkt}
          onSave={handleSaveAkt}
          onDeactivate={handleDeactivateAkt}
          onDelete={handleDeleteAkt}
          typOptions={AKT_FILTERABLE_TYPEN}
        />
      ) : (
        <div className={styles.emptyDetail}>
          <Icon name="book" size={24} strokeWidth={1.5} className={styles.emptyIcon} />
          <span>Aktivität auswählen</span>
        </div>
      )
      break

    case 'pfadfindertechnik':
      listContent = (
        <PfadfindertechnikListe
          aktivitaeten={aktivitaeten}
          selectedId={selectedPtId}
          onSelect={setSelectedPtId}
          onNew={handleNewPt}
        />
      )
      detailContent = selectedPt ? (
        <AktivitaetDetail
          aktivitaet={selectedPt}
          onSave={handleSaveAkt}
          onDeactivate={handleDeactivateAkt}
          onDelete={handleDeleteAkt}
          typOptions={['pfadfindertechnik'] as const}
        />
      ) : (
        <div className={styles.emptyDetail}>
          <Icon name="tool" size={24} strokeWidth={1.5} className={styles.emptyIcon} />
          <span>Pfadfindertechnik auswählen</span>
        </div>
      )
      break

    case 'andachtsreihen':
      listContent = (
        <AndachtsreihenListe
          reihen={andachtsreihen}
          selectedId={selectedReiheId}
          onSelect={setSelectedReiheId}
          onNew={handleNewReihe}
        />
      )
      detailContent = selectedReihe ? (
        <AndachtsreiheDetail
          reihe={selectedReihe}
          onSave={handleSaveReihe}
          onDeactivate={handleDeactivateReihe}
        />
      ) : (
        <div className={styles.emptyDetail}>
          <Icon name="book-open" size={24} strokeWidth={1.5} className={styles.emptyIcon} />
          <span>Andachtsreihe auswählen</span>
        </div>
      )
      break

    case 'abzeichen':
      listContent = (
        <AbzeichenListe
          abzeichen={abzeichen}
          selectedId={selectedAbzId}
          onSelect={setSelectedAbzId}
          aktivitaeten={aktivitaeten}
        />
      )
      detailContent = selectedAbz ? (
        <AbzeichenDetail
          abzeichen={selectedAbz}
          aktivitaeten={aktivitaeten}
          onCreateAktivitaet={handleCreateFromAnforderung}
        />
      ) : (
        <div className={styles.emptyDetail}>
          <Icon name="award" size={24} strokeWidth={1.5} className={styles.emptyIcon} />
          <span>Abzeichen auswählen</span>
        </div>
      )
      break
  }

  return (
    <Panels split="main-side">
      <Panel role="main" title="Repertoire">
        <div className={styles.segmentRow}>
          <SegmentedControl
            options={SEGMENT_OPTIONS}
            value={segment}
            onValueChange={setSegment}
            sizeVariant="sm"
            ariaLabel="Repertoire-Bereich"
          />
        </div>

        {importFeedback && (
          <div className={`${styles.importBanner} ${importFeedback.type === 'ok' ? styles.importBannerOk : styles.importBannerErr}`}>
            {importFeedback.message}
          </div>
        )}

        {isDraggingFile ? (
          <div
            className={styles.dropZone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleFileDrop}
          >
            <Icon name="upload" size={36} strokeWidth={1.2} className={styles.dropZoneIcon} />
            <span className={styles.dropZoneTitle}>JSON-Datei hier ablegen</span>
            <span className={styles.dropZoneSub}>Aktivitäten · Andachtsreihen · Abzeichen</span>
          </div>
        ) : (
          listContent
        )}
      </Panel>
      <Panel role="side">
        {detailContent}
      </Panel>
    </Panels>
  )
}
