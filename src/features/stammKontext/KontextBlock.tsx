/**
 * Einzelner Kontext-Block in der KontextSidebar-Timeline.
 *
 * Rundet die Ecken je nachdem, ob der Block am Jahresanfang/-ende
 * abgeschnitten wird, und bietet Klick (→ navigieren) + Löschen.
 */
import type { StammKontext } from '@/domain/types'
import { Icon } from '@/ui/primitives/Icon'
import clsx from '@/ui/utils/clsx'
import { formatKontextRange } from './kontextBlockHelpers'
import { rowToPercent } from './useKontextDragSelect'
import styles from './KontextSidebar.module.css'

export function KontextBlock({
  kontext, span, isActive, onOpen, onDelete,
}: {
  kontext: StammKontext
  span: { top: number; bottom: number }
  isActive: boolean
  onOpen: () => void
  onDelete: () => void
}) {
  const topPct = rowToPercent(span.top)
  const heightPct = rowToPercent(span.bottom) - topPct
  const topRound = span.top > 0
  const bottomRound = span.bottom < 24

  return (
    <div
      className={clsx(
        styles.kontextBlock,
        isActive && styles.active,
        topRound && bottomRound && styles.roundedBoth,
        topRound && !bottomRound && styles.roundedTop,
        !topRound && bottomRound && styles.roundedBottom,
        !topRound && !bottomRound && styles.middle,
      )}
      style={{ top: `${topPct}%`, height: `${Math.max(heightPct, 4)}%` }}
      onClick={onOpen}
    >
      <span className={styles.kontextName}>{kontext.thema || '(ohne Thema)'}</span>
      <span className={styles.kontextRange}>{formatKontextRange(kontext)}</span>
      <button
        type="button"
        className={styles.kontextDeleteBtn}
        title="Stammkontext löschen"
        onClick={(e) => {
          e.stopPropagation()
          if (window.confirm('Stammkontext wirklich löschen?')) {
            onDelete()
          }
        }}
      >
        <Icon name="trash" size={11} />
      </button>
    </div>
  )
}
