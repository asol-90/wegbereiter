/**
 * PlanungsCard — card representation of a Planung in the Planungsliste.
 *
 * Layout (from jahresansicht-wireframes.html):
 *   ┌──────────────────────────────┐
 *   │ ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ (color bar)  │
 *   │ Name (serif)               ×  │
 *   │ Zeitraum · Kurzstatus         │
 *   └──────────────────────────────┘
 *
 * The top bar is solid when the Planung is finalised (= status 'aktiv' or
 * 'archiviert'), dashed when still in 'entwurf'.
 *
 * A hover-visible trash IconButton in the top-right corner opens a
 * ConfirmDialog (tone='danger') that removes the Planung via the store.
 * The button lives outside the Link element so we don't nest interactive
 * elements; its higher z-index intercepts the click before the Link
 * navigates.
 */
import {parseIso} from '@/domain/dateUtils'
import type {Planung} from '@/domain/types'
import {usePlanungenActions} from '@/features/planungen'
import {ConfirmDialog, IconButton} from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import {format} from 'date-fns'
import {de} from 'date-fns/locale'
import {type MouseEvent, useState} from 'react'
import {Link} from 'react-router-dom'
import styles from './PlanungsCard.module.css'

export type PlanungsCardProps = {
  planung: Planung
  /** If set, the card is rendered as a Link to this path. */
  to?: string
  /** Visual-only highlight state (for cross-hover with Jahreskalender). */
  highlighted?: boolean
  /** True when the Planung's last Treffen is before today. */
  past?: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

export function PlanungsCard({
  planung,
  to,
  highlighted,
  past,
  onMouseEnter,
  onMouseLeave,
}: PlanungsCardProps) {
  const { remove } = usePlanungenActions()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const isDraft = planung.status === 'entwurf'
  const range = formatZeitraum(planung.zeitraum.start, planung.zeitraum.ende)
  const status = formatStatus(planung)
  const body = (
    <>
      <div className={clsx(styles.bar, isDraft ? styles.barDashed : styles.barSolid)} />
      <div className={styles.title}>{planung.name}</div>
      <div className={styles.range}>{range}</div>
      <div className={styles.status}>{status}</div>
    </>
  )

  const className = clsx(styles.card, highlighted && styles.highlighted, past && styles.past)

  function handleDeleteClick(e: MouseEvent<HTMLButtonElement>) {
    // Prevent bubbling into the Link beneath us.
    e.preventDefault()
    e.stopPropagation()
    setConfirmOpen(true)
  }

  async function handleConfirm() {
    if (removing) return
    setRemoving(true)
    try {
      await remove(planung.id)
      setConfirmOpen(false)
    } finally {
      setRemoving(false)
    }
  }

  const cardInner = to ? (
    <Link to={to} className={clsx(className, styles.link)}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  )

  return (
    <div
      className={styles.wrap}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {cardInner}
      <IconButton
        icon="trash"
        label={`Planung „${planung.name}" löschen`}
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
        title="Planung löschen?"
        description={
          <>
            Die Planung „<strong>{planung.name}</strong>" und alle zugehörigen
            Treffen werden unwiederbringlich gelöscht.
          </>
        }
        confirmLabel="Löschen"
        cancelLabel="Abbrechen"
        tone="danger"
        loading={removing}
      />
    </div>
  )
}

function formatZeitraum(start: string, ende: string): string {
  const s = parseIso(start)
  const e = parseIso(ende)
  const startYear = format(s, 'yyyy')
  const endeYear = format(e, 'yyyy')
  if (startYear === endeYear) {
    return `${format(s, 'dd. MMM', { locale: de })} – ${format(e, 'dd. MMM yyyy', { locale: de })}`
  }
  return `${format(s, 'dd. MMM yyyy', { locale: de })} – ${format(e, 'dd. MMM yyyy', { locale: de })}`
}

function formatStatus(p: Planung): string {
  const n = p.treffen.length
  const label = statusLabel(p.status)
  return `${label} · ${n} ${n === 1 ? 'Treffen' : 'Treffen'}`
}

function statusLabel(status: Planung['status']): string {
  switch (status) {
    case 'entwurf':
      return 'Entwurf'
    case 'aktiv':
      return 'aktiv'
    case 'archiviert':
      return 'archiviert'
  }
}
