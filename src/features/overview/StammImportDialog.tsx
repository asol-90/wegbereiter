/**
 * StammImportDialog — preview + confirm dialog for importing a Stammkontext.
 *
 * Shows the parsed context (thema, dates, meetings, actions) and warns
 * about overlaps with existing contexts. "Übernehmen" persists the import.
 */
import { useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import { Modal, Button, Badge, ConfirmDialog } from '@/ui/primitives'
import type { StammKontext } from '@/domain/types'
import type { Aktivitaet } from '@/domain/types'
import { checkOverlap, type OverlapResult } from '@/domain/stammOverlap'
import { useStammKontext } from '@/features/stammKontext'
import styles from './StammImportDialog.module.css'

export type StammImportDialogProps = {
  open: boolean
  kontext: StammKontext
  aktivitaeten: Aktivitaet[]
  onConfirm: () => void
  onCancel: () => void
}

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'd. MMMM yyyy', { locale: de })
  } catch {
    return iso
  }
}

export function StammImportDialog({
  open,
  kontext,
  aktivitaeten,
  onConfirm,
  onCancel,
}: StammImportDialogProps) {
  const { kontexte } = useStammKontext()

  // Check for overlaps with existing contexts
  const overlaps = useMemo(() => {
    const results: Array<{ existing: StammKontext; overlap: OverlapResult & { kind: 'overlap' } }> = []
    for (const existing of kontexte) {
      const result = checkOverlap(existing, kontext)
      if (result.kind === 'overlap') {
        results.push({ existing, overlap: result })
      }
    }
    return results
  }, [kontexte, kontext])

  // Date range from treffen + aktionen
  const allDates = [
    ...kontext.treffen.map((t) => t.datum),
    ...kontext.stammaktionen.map((a) => a.beginn),
    ...kontext.stammaktionen.map((a) => a.ende),
  ].sort()
  const rangeStart = allDates[0]
  const rangeEnd = allDates[allDates.length - 1]

  return (
    <Modal open={open} onClose={onCancel} title="Stammkontext importieren" size="md">
      <div className={styles.content}>
        {/* Theme */}
        <section className={styles.section}>
          <h3 className={styles.thema}>{kontext.thema}</h3>
          {kontext.themaBeschreibung && (
            <p className={styles.beschreibung}>{kontext.themaBeschreibung}</p>
          )}
        </section>

        {/* Meta */}
        <section className={styles.meta}>
          {rangeStart && rangeEnd && (
            <span className={styles.metaItem}>
              {formatDate(rangeStart)} – {formatDate(rangeEnd)}
            </span>
          )}
          <span className={styles.metaItem}>
            {kontext.treffen.length} Treffen
          </span>
          {kontext.stammaktionen.length > 0 && (
            <span className={styles.metaItem}>
              {kontext.stammaktionen.length} Stammaktion{kontext.stammaktionen.length !== 1 ? 'en' : ''}
            </span>
          )}
          {aktivitaeten.length > 0 && (
            <span className={styles.metaItem}>
              {aktivitaeten.length} Aktivität{aktivitaeten.length !== 1 ? 'en' : ''} fürs Repertoire
            </span>
          )}
        </section>

        {/* Stammaktionen list */}
        {kontext.stammaktionen.length > 0 && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Stammaktionen</h4>
            <ul className={styles.itemList}>
              {kontext.stammaktionen.map((a) => (
                <li key={a.id} className={styles.item}>
                  <strong>{a.titel}</strong>
                  <span className={styles.itemMeta}>
                    {formatDate(a.beginn)}
                    {a.beginn !== a.ende && ` – ${formatDate(a.ende)}`}
                    {a.ort && ` · ${a.ort}`}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Stamm-Blöcke summary */}
        {(kontext.defaultAnfangsBlock.length > 0 || kontext.defaultEndBlock.length > 0) && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Stammzeit pro Treffen</h4>
            <div className={styles.bloecke}>
              {kontext.defaultAnfangsBlock.length > 0 && (
                <div className={styles.block}>
                  <Badge tone="neutral" size="sm">Anfang</Badge>
                  <span>
                    {kontext.defaultAnfangsBlock.map((b) => `${b.name} (${b.dauerMin} Min)`).join(', ')}
                  </span>
                </div>
              )}
              {kontext.defaultEndBlock.length > 0 && (
                <div className={styles.block}>
                  <Badge tone="neutral" size="sm">Ende</Badge>
                  <span>
                    {kontext.defaultEndBlock.map((b) => `${b.name} (${b.dauerMin} Min)`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Bearbeitungsnotiz */}
        {kontext.bearbeitungsNotiz && (
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Notiz vom Stammführer</h4>
            <p className={styles.notiz}>{kontext.bearbeitungsNotiz}</p>
          </section>
        )}

        {/* Overlap warnings */}
        {overlaps.length > 0 && (
          <section className={styles.warning}>
            <h4 className={styles.warningTitle}>Überlappung mit bestehendem Kontext</h4>
            {overlaps.map(({ existing, overlap }) => (
              <p key={existing.id} className={styles.warningText}>
                Der bestehende Kontext „{existing.thema}" wird ab{' '}
                <strong>{formatDate(overlap.overlapStart)}</strong> durch den
                neuen Kontext ersetzt. Treffen und Aktionen des alten Kontexts
                nach diesem Datum werden entfernt.
              </p>
            ))}
          </section>
        )}
      </div>

      <div className={styles.actions}>
        <Button variant="ghost" onClick={onCancel}>
          Abbrechen
        </Button>
        <Button variant="primary" onClick={onConfirm}>
          Übernehmen
        </Button>
      </div>
    </Modal>
  )
}
