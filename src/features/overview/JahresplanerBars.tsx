/**
 * Visual subcomponents for JahresplanerSidebar:
 * - KontextBar: a Stammkontext coverage bar in the ctx column
 * - PlanungsBlock: a Planung block (edit/delete actions, click to open)
 */
import type { Planung, StammKontext } from '@/domain/types'
import { IconButton } from '@/ui/primitives'
import clsx from '@/ui/utils/clsx'
import { formatKontextRange, rowToPercent } from './jahresplanerHelpers'
import styles from './JahresplanerSidebar.module.css'

export type KontextBarProps = {
  kontext: StammKontext
  span: { top: number; bottom: number }
  onHover?: (id: StammKontext['id'] | null) => void
  onPlanungHover?: (id: null) => void
}

export function KontextBar({ kontext: k, span, onHover, onPlanungHover }: KontextBarProps) {
  const topPct = rowToPercent(span.top)
  const heightPct = rowToPercent(span.bottom) - topPct
  const topRound = span.top > 0
  const bottomRound = span.bottom < 24
  return (
    <div
      className={clsx(
        styles.kontextBar,
        topRound && bottomRound && styles.roundedBoth,
        topRound && !bottomRound && styles.roundedTop,
        !topRound && bottomRound && styles.roundedBottom,
        !topRound && !bottomRound && styles.middle,
      )}
      style={{ top: `${topPct}%`, height: `${heightPct}%` }}
      onMouseEnter={() => { onHover?.(k.id); onPlanungHover?.(null) }}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className={styles.kontextTooltip}>
        <div className={styles.kontextTooltipTitle}>{k.thema}</div>
        <div className={styles.kontextTooltipRange}>{formatKontextRange(k)}</div>
      </div>
    </div>
  )
}

export type PlanungsBlockProps = {
  planung: Planung
  span: { top: number; bottom: number }
  isHighlighted: boolean
  isDimmed: boolean
  onClick: (p: Planung) => void
  onHover?: (id: Planung['id'] | null) => void
  onEdit: (p: Planung) => void
  onDelete: (p: Planung) => void
}

export function PlanungsBlock({
  planung: p, span, isHighlighted, isDimmed, onClick, onHover, onEdit, onDelete,
}: PlanungsBlockProps) {
  const topPct = rowToPercent(span.top)
  const heightPct = rowToPercent(span.bottom) - topPct
  const isDraft = p.status === 'entwurf'
  return (
    <div
      data-plan-block
      className={clsx(
        styles.planBlock,
        isHighlighted && styles.highlighted,
        isDimmed && styles.dimmed,
      )}
      style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 4)}%` }}
      onClick={() => onClick(p)}
      onMouseEnter={() => onHover?.(p.id)}
      onMouseLeave={() => onHover?.(null)}
    >
      <div className={clsx(styles.planStripe, isDraft ? styles.planStripeDraft : styles.planStripeFinal)} />
      <div className={styles.planHeader}>
        <span className={styles.planName}>{p.name}</span>
        <div className={styles.planActions}>
          <IconButton
            icon="edit" size={11} shape="circle"
            label={`Planung „${p.name}" bearbeiten`}
            className={styles.planActionBtn}
            onClick={(e) => { e.stopPropagation(); onEdit(p) }}
          />
          <IconButton
            icon="trash" size={11} shape="circle" tone="danger"
            label={`Planung „${p.name}" löschen`}
            className={styles.planActionBtn}
            onClick={(e) => { e.stopPropagation(); onDelete(p) }}
          />
        </div>
      </div>
      <span className={styles.planMeta}>{p.treffen.length} Treffen</span>
    </div>
  )
}
