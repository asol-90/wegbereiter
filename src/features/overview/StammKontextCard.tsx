/**
 * StammKontextCard — compact card showing a loaded Stammkontext in the sidebar.
 *
 * Visually distinct from PlanungsCards: uses a subtle accent background
 * and shows the theme, date range, and meeting/action counts.
 */
import { useState, type MouseEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { de } from 'date-fns/locale'
import type { StammKontext } from '@/domain/types'
import clsx from '@/ui/utils/clsx'
import { ConfirmDialog, IconButton } from '@/ui/primitives'
import { useStammKontextActions } from '@/features/stammKontext'
import styles from './StammKontextCard.module.css'

export type StammKontextCardProps = {
  kontext: StammKontext
  /** True when the Kontext's last date is before today. */
  past?: boolean
}

function formatDate(iso: string): string {
  try {
    return format(parseISO(iso), 'dd. MMM', { locale: de })
  } catch {
    return iso
  }
}

export function StammKontextCard({ kontext, past }: StammKontextCardProps) {
  const { remove } = useStammKontextActions()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  // Compute date range
  const allDates = [
    ...kontext.treffen.map((t) => t.datum),
    ...kontext.stammaktionen.map((a) => a.beginn),
    ...kontext.stammaktionen.map((a) => a.ende),
  ].sort()
  const rangeStart = allDates[0]
  const rangeEnd = allDates[allDates.length - 1]

  const treffenCount = kontext.treffen.length
  const aktionenCount = kontext.stammaktionen.length

  function handleDeleteClick(e: MouseEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (removing) return
    setRemoving(true)
    try {
      await remove(kontext.id)
      setConfirmOpen(false)
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className={clsx(styles.wrap, past && styles.past)}>
      <div className={styles.card}>
        <div className={styles.label}>Stammkontext</div>
        <div className={styles.thema}>{kontext.thema}</div>
        {rangeStart && rangeEnd && (
          <div className={styles.range}>
            {formatDate(rangeStart)} – {formatDate(rangeEnd)}
            {rangeEnd.slice(0, 4) !== rangeStart.slice(0, 4)
              ? ` ${rangeEnd.slice(0, 4)}`
              : ` ${rangeStart.slice(0, 4)}`}
          </div>
        )}
        <div className={styles.counts}>
          {treffenCount} Treffen
          {aktionenCount > 0 && ` · ${aktionenCount} Aktion${aktionenCount !== 1 ? 'en' : ''}`}
        </div>
      </div>
      <IconButton
        icon="trash"
        label={`Stammkontext „${kontext.thema}" entfernen`}
        tone="danger"
        size={12}
        shape="circle"
        className={styles.deleteBtn}
        onClick={handleDeleteClick}
      />
      <ConfirmDialog
        open={confirmOpen}
        onCancel={() => !removing && setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title="Stammkontext entfernen?"
        description={
          <>
            Der Stammkontext „<strong>{kontext.thema}</strong>" wird entfernt.
            Planungen, die diesen Kontext verwenden, verlieren ihre Referenz
            auf die Stamm-Treffen.
          </>
        }
        confirmLabel="Entfernen"
        cancelLabel="Abbrechen"
        tone="danger"
        loading={removing}
      />
    </div>
  )
}
