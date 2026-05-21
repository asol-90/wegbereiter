/**
 * DayCell — renders one calendar day. Dispatches to a sub-renderer depending
 * on what occupies the day:
 *   - Stammaktion day (multi-day blocked event)
 *   - Own Treffen day (may also be a Stammtermin)
 *   - Empty day (right-click context menu)
 */
import type { FerienCacheEntry, IsoDate, StammAktion, StammTreffen, Treffen } from '@/domain/types'
import type { StammAktionId, StammTreffenId, TreffenId } from '@/domain/ids'
import { classifyDay } from '@/features/overview/monthGrid'
import clsx from '@/ui/utils/clsx'
import {
  BAND_STAMM, buildBands, stammLineOffsets, textColorForBands, type Band,
} from './dayCellHelpers'
import { BandSpans, DayContextMenu, StammAktionPreview, TreffenPreview } from './DayCellPopovers'
import type { CalendarCell, TreffenLookup } from './planungskalenderGrid'
import styles from './PlanungsKalender.module.css'

type DayCellInner = Extract<CalendarCell, { kind: 'day' }>

export type DayCellProps = {
  cell: DayCellInner
  ferien: FerienCacheEntry | null | undefined
  treffenLookup: TreffenLookup
  allStammAktionen: StammAktion[]
  allExternAktionen: StammAktion[]
  today: string
  stammTreffenHere?: StammTreffen
  anyStammTreffenHere?: StammTreffen
  optedOutStammTreffenHere?: StammTreffen
  stammAktionHere?: StammAktion
  isRangeHighlighted?: boolean
  activePreviewId: string | null
  contextMenuDate: IsoDate | null
  onPreviewToggle: (id: string) => void
  onContextMenuToggle: (date: IsoDate) => void
  onTreffenDoubleClick?: (id: string) => void
  onTreffenHover?: (datum: IsoDate | null) => void
  onDeleteStart: (treffenId: TreffenId, hasProgramm: boolean) => void
  onStammAbmelden?: (stammId: StammTreffenId | StammAktionId, treffenId: TreffenId | null) => void
  onStammWiederAnmelden?: (stammId: StammTreffenId, datum: IsoDate) => void
  onAddTreffen?: (datum: IsoDate, kind: 'regulaer' | 'extra-aktion') => void
}

type CellShell = {
  cell: DayCellInner
  isRangeHighlighted?: boolean
  title?: string
}

function cellWrapperClass({ cell, isRangeHighlighted }: CellShell, base: string) {
  return clsx(
    base,
    cell.shaded && styles.shade,
    !cell.inZeitraum && styles.outside,
    cell.monthLabel && styles.ml,
    isRangeHighlighted && styles.rangeHighlight,
  )
}

function MonthLabel({ cell }: { cell: DayCellInner }) {
  return cell.monthLabel ? <span className={styles.mlLabel}>{cell.monthLabel}</span> : null
}

// ─── Stammaktion day ────────────────────────────────────────────────────────

function StammAktionDay(props: DayCellProps & { bands: Band[]; stammAktion: StammAktion }) {
  const { cell, bands, stammAktion, activePreviewId, onPreviewToggle, onStammAbmelden, isRangeHighlighted } = props
  const offsets = stammLineOffsets(cell.iso, cell.weekday, stammAktion)
  const isOpen = activePreviewId === stammAktion.id
  return (
    <div className={cellWrapperClass({ cell, isRangeHighlighted }, styles.anc)} title={stammAktion.titel}>
      <MonthLabel cell={cell} />
      <BandSpans bands={bands.filter((b) => b.bg !== BAND_STAMM)} />
      <div className={styles.stammLine} style={{ left: offsets.left, right: offsets.right }} />
      <div className={clsx(styles.stammAncBox, isOpen && styles.stammAncBoxActive)}
        onClick={() => onPreviewToggle(stammAktion.id)}>
        {cell.day}
      </div>
      <StammAktionPreview aktion={stammAktion} open={isOpen}
        onAbmeldenClick={onStammAbmelden ? () => onStammAbmelden(stammAktion.id, null) : undefined} />
    </div>
  )
}

// ─── Treffen day ────────────────────────────────────────────────────────────

type TreffenDayExtras = {
  treffen: Treffen
  bands: Band[]
  isAnyStammDate: boolean
  title: string | undefined
}

function TreffenDay(props: DayCellProps & TreffenDayExtras) {
  const {
    cell, treffen, bands, isAnyStammDate, title, isRangeHighlighted,
    activePreviewId, stammTreffenHere, onPreviewToggle,
    onTreffenDoubleClick, onTreffenHover, onDeleteStart, onStammAbmelden,
  } = props
  const isOpen = activePreviewId === treffen.id
  const isStammTreffen = !!stammTreffenHere
  const isEigenAktion = treffen.kind === 'extra-aktion'
  const visibleBands = isAnyStammDate ? bands.filter((b) => b.bg !== BAND_STAMM) : bands

  return (
    <div className={cellWrapperClass({ cell, isRangeHighlighted }, styles.anc)} title={title}>
      <MonthLabel cell={cell} />
      <BandSpans bands={visibleBands} />
      <div
        className={clsx(
          isEigenAktion ? styles.aktionAncBox : styles.ancBox,
          isOpen && styles.ancBoxActive,
          isRangeHighlighted && styles.ancBoxHighlighted,
        )}
        onClick={() => onPreviewToggle(treffen.id)}
        onDoubleClick={() => onTreffenDoubleClick?.(treffen.id)}
        onMouseEnter={() => onTreffenHover?.(cell.iso)}
        onMouseLeave={() => onTreffenHover?.(null)}
      >
        {isAnyStammDate ? <span className={styles.ancDayStamm}>{cell.day}</span> : cell.day}
      </div>
      <TreffenPreview
        treffen={treffen}
        open={isOpen}
        isStammTreffen={isStammTreffen}
        onDetailClick={onTreffenDoubleClick}
        onDeleteClick={!isStammTreffen ? () => onDeleteStart(treffen.id as TreffenId, treffen.programm.length > 0) : undefined}
        onAbmeldenClick={isStammTreffen && stammTreffenHere
          ? () => onStammAbmelden?.(stammTreffenHere.id, treffen.id as TreffenId)
          : undefined}
      />
    </div>
  )
}

// ─── Empty day ──────────────────────────────────────────────────────────────

type EmptyDayExtras = {
  bands: Band[]
  bandTextColor: string | undefined
  title: string | undefined
  isWeekend: boolean
  isToday: boolean
}

function EmptyDay(props: DayCellProps & EmptyDayExtras) {
  const {
    cell, bands, bandTextColor, title, isWeekend, isToday, isRangeHighlighted,
    contextMenuDate, optedOutStammTreffenHere, onContextMenuToggle,
    onAddTreffen, onStammWiederAnmelden,
  } = props
  const isContextOpen = contextMenuDate === cell.iso
  const canInteract = cell.inZeitraum
  return (
    <div
      className={clsx(
        styles.d,
        cell.shaded && styles.shade,
        !cell.inZeitraum && styles.outside,
        isWeekend && !bandTextColor && styles.we,
        isToday && styles.today,
        cell.monthLabel && styles.ml,
        canInteract && styles.dClickable,
        isRangeHighlighted && styles.rangeHighlight,
      )}
      title={title}
      onClick={canInteract ? () => onContextMenuToggle(cell.iso) : undefined}
    >
      <MonthLabel cell={cell} />
      <BandSpans bands={bands} />
      <span className={styles.dLabel}
        style={bandTextColor && !isToday ? { color: bandTextColor } : undefined}>
        {cell.day}
      </span>
      {canInteract && (
        <DayContextMenu
          open={isContextOpen}
          datum={cell.iso}
          optedOutStamm={optedOutStammTreffenHere}
          onAddTreffen={onAddTreffen}
          onWiederAnmelden={onStammWiederAnmelden}
        />
      )}
    </div>
  )
}

// ─── Dispatch ────────────────────────────────────────────────────────────────

export function DayCell(props: DayCellProps) {
  const {
    cell, ferien, treffenLookup, allStammAktionen, allExternAktionen, today,
    stammAktionHere, anyStammTreffenHere,
  } = props
  const cls = classifyDay(cell.iso, ferien)
  const treffen = treffenLookup.get(cell.iso)
  const isWeekend = cell.weekday >= 5
  const isToday = cell.iso === today
  const isFerienOrFeiertag = !!(cls.ferien || cls.feiertag)
  const anyStammAktHere = allStammAktionen.find((a) => cell.iso >= a.beginn && cell.iso <= a.ende)
  const externAktHere = allExternAktionen.find((a) => cell.iso >= a.beginn && cell.iso <= a.ende)
  const isAnyStammDate = !!anyStammTreffenHere && !stammAktionHere

  const bands = buildBands({
    iso: cell.iso,
    isFerienOrFeiertag,
    ferienFirst: !!cls.ferienFirst,
    ferienLast: !!cls.ferienLast,
    stammAkt: anyStammAktHere,
    isStammDate: isAnyStammDate,
    externAkt: externAktHere,
  })
  const bandTextColor = textColorForBands(bands, isWeekend)
  const titleAttr = anyStammAktHere?.titel ?? cls.feiertag?.name ?? cls.ferien?.name

  if (stammAktionHere) {
    return <StammAktionDay {...props} bands={bands} stammAktion={stammAktionHere} />
  }
  if (treffen) {
    return <TreffenDay {...props} treffen={treffen} bands={bands} isAnyStammDate={isAnyStammDate} title={titleAttr} />
  }
  return (
    <EmptyDay {...props}
      bands={bands} bandTextColor={bandTextColor}
      title={titleAttr} isWeekend={isWeekend} isToday={isToday}
    />
  )
}
