/**
 * Popovers shown above a day cell: treffen preview, stamm-aktion preview,
 * and the right-click-style context menu for adding/wiederanmelden.
 */
import type { IsoDate, StammAktion, StammTreffen, Treffen } from '@/domain/types'
import type { StammTreffenId } from '@/domain/ids'
import { WB_CSS_VAR, WB_KEYS } from '@/domain/wb'
import { IconButton } from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import { formatPreviewDate } from './dayCellHelpers'
import styles from './PlanungsKalender.module.css'

export type Band = { bg: string; isFirst: boolean; isLast: boolean }

export function BandSpans({ bands }: { bands: Band[] }) {
  return (
    <>
      {bands.map((b, i) => (
        <span
          key={i}
          className={clsx(
            styles.band,
            b.isFirst && !b.isLast && styles.bandFirst,
            b.isLast && !b.isFirst && styles.bandLast,
            b.isFirst && b.isLast && styles.bandCircle,
          )}
          style={{ background: b.bg }}
        />
      ))}
    </>
  )
}

export type TreffenPreviewProps = {
  treffen: Treffen
  open: boolean
  isStammTreffen: boolean
  onDetailClick?: (treffenId: string) => void
  onDeleteClick?: () => void
  onAbmeldenClick?: () => void
}

export function TreffenPreview({
  treffen, open, isStammTreffen, onDetailClick, onDeleteClick, onAbmeldenClick,
}: TreffenPreviewProps) {
  const actionClick = onAbmeldenClick ?? onDeleteClick
  const actionLabel = onAbmeldenClick ? 'Abmelden' : 'Treffen löschen'
  const actionTone: 'default' | 'danger' = onAbmeldenClick ? 'default' : 'danger'
  return (
    <div className={clsx(styles.preview, open && styles.previewOpen)}>
      {actionClick && (
        <div className={styles.previewCornerAction}>
          <IconButton icon="trash" size={12} label={actionLabel} tone={actionTone}
            onClick={(e) => { e.stopPropagation(); actionClick() }} />
        </div>
      )}
      <div className={styles.previewDate}>{formatPreviewDate(treffen.datum)}</div>
      <div className={styles.previewTitle}>{treffen.titel ?? (isStammTreffen ? 'Stammtreffen' : 'Treffen')}</div>
      <div className={styles.previewRow}>
        <span className={styles.previewLabel}>Wachstumsbereiche</span>
        <div className={styles.previewWb}>
          {WB_KEYS.map((key) => {
            const tag = treffen.programm.flatMap((p) => p.wbTags).find((t) => t.key === key)
            const isSoll = treffen.sollWB.includes(key)
            return (
              <div key={key} className={clsx(styles.previewWbSlot, isSoll && styles.previewWbSlotSoll)}>
                <span className={styles.previewWbDot}
                  style={{ background: `var(${WB_CSS_VAR[key]})`, opacity: tag ? tag.intensity : 0.15 }} />
              </div>
            )
          })}
        </div>
      </div>
      {onDetailClick && (
        <button className={styles.previewBtn}
          onClick={(e) => { e.stopPropagation(); onDetailClick(treffen.id) }}>
          Details
        </button>
      )}
    </div>
  )
}

export type StammAktionPreviewProps = {
  aktion: StammAktion
  open: boolean
  onAbmeldenClick?: () => void
}

export function StammAktionPreview({ aktion, open, onAbmeldenClick }: StammAktionPreviewProps) {
  const startLabel = formatPreviewDate(aktion.beginn)
  const endLabel = aktion.ende !== aktion.beginn ? ` – ${formatPreviewDate(aktion.ende)}` : ''
  return (
    <div className={clsx(styles.preview, open && styles.previewOpen)}>
      {onAbmeldenClick && (
        <div className={styles.previewCornerAction}>
          <IconButton icon="trash" size={12} label="Abmelden" tone="default"
            onClick={(e) => { e.stopPropagation(); onAbmeldenClick() }} />
        </div>
      )}
      <div className={styles.previewDate}>{startLabel}{endLabel}</div>
      <div className={styles.previewTitle}>{aktion.titel}</div>
      {aktion.ort && <div className={styles.previewSub}>{aktion.ort}</div>}
    </div>
  )
}

export type DayContextMenuProps = {
  open: boolean
  datum: IsoDate
  optedOutStamm: StammTreffen | undefined
  onAddTreffen?: (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => void
  onWiederAnmelden?: (stammId: StammTreffenId, datum: IsoDate) => void
}

export function DayContextMenu({
  open, datum, optedOutStamm, onAddTreffen, onWiederAnmelden,
}: DayContextMenuProps) {
  return (
    <div className={clsx(styles.contextMenu, open && styles.contextMenuOpen)}>
      <button className={styles.contextMenuItem}
        onClick={(e) => { e.stopPropagation(); onAddTreffen?.(datum, 'regulaer') }}>
        Treffen hinzufügen
      </button>
      <button className={styles.contextMenuItem}
        onClick={(e) => { e.stopPropagation(); onAddTreffen?.(datum, 'extra-aktion') }}>
        Aktion hinzufügen
      </button>
      {optedOutStamm && onWiederAnmelden && (
        <button className={clsx(styles.contextMenuItem, styles.contextMenuItemAccent)}
          onClick={(e) => { e.stopPropagation(); onWiederAnmelden(optedOutStamm.id, datum) }}>
          Wieder anmelden
        </button>
      )}
    </div>
  )
}
