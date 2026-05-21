/**
 * Termin-Vorschau list inside WizardStep1Team. Renders one row per Treffen
 * or Aktion, with a collapse-after-N expand affordance.
 */
import { Badge } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import type { IsoDate, StammKontext } from '@/domain/types'
import { stammAbzugFuerTreffen } from '@/domain/zeitbudget'
import { formatTerminDate, formatDateRange, type PreviewItem } from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

const VISIBLE_HEAD = 6
const VISIBLE_TAIL = 1

function SkipIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="5" x2="19" y2="19" />
      <circle cx="12" cy="12" r="10" />
    </svg>
  )
}

function CheckSmallIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12l4 4L19 6" />
    </svg>
  )
}

type AktionRowProps = { item: Extract<PreviewItem, { kind: 'aktion' }> }

function AktionRow({ item }: AktionRowProps) {
  const a = item.aktion
  const isMultiDay = a.beginn !== a.ende
  const isExtern = item.bereich !== 'Stamm'
  return (
    <div className={`${styles.terminRow} ${styles.terminRowAktion} ${isExtern ? styles.terminRowExtern : ''}`}>
      <span className={`${styles.terminDate} ${styles.terminDateKontext}`}>
        {isMultiDay ? formatDateRange(a.beginn, a.ende) : formatTerminDate(a.beginn)}
      </span>
      <span className={styles.terminLabel}>
        <strong>{a.titel}</strong>
        {a.ort && <span className={styles.terminOrt}> · {a.ort}</span>}
      </span>
      <span className={styles.terminRight}>
        <span className={`${styles.aktionChip} ${isExtern ? styles.aktionChipExtern : styles.aktionChipStamm}`}>
          {item.bereich}
        </span>
      </span>
    </div>
  )
}

type TreffenRowProps = {
  item: Extract<PreviewItem, { kind: 'treffen' }>
  dauer: number
  activeKontext: StammKontext | undefined
  isOutsideKontext: (iso: IsoDate) => boolean
  isHoliday: (iso: IsoDate) => { ferien?: string; feiertag?: string } | null
  reinstated: Set<IsoDate>
  toggleReinstated: (iso: IsoDate) => void
}

type RowState = {
  iso: IsoDate
  isKontext: boolean
  holLabel: string | null
  isSkipped: boolean
  isReinstated: boolean
  hasHoliday: boolean
  teamMin: number
  abzug: number
}

function computeRowState(args: TreffenRowProps): RowState {
  const { item, dauer, activeKontext, isOutsideKontext, isHoliday, reinstated } = args
  const { iso, source } = item
  const isKontext = source === 'kontext'
  const hol = source === 'generated' && isOutsideKontext(iso) ? isHoliday(iso) : null
  const isReinstated = !!hol && reinstated.has(iso)
  const stammTreffen = isKontext && activeKontext
    ? activeKontext.treffen.find((t) => t.datum === iso)
    : undefined
  const abzug = stammTreffen ? stammAbzugFuerTreffen(stammTreffen, activeKontext!) : 0
  return {
    iso, isKontext,
    holLabel: hol ? (hol.feiertag ?? hol.ferien ?? null) : null,
    hasHoliday: !!hol,
    isSkipped: !!hol && !isReinstated,
    isReinstated,
    abzug,
    teamMin: (stammTreffen?.dauerMin ?? dauer) - abzug,
  }
}

function TreffenRowRight({
  state, toggleReinstated,
}: { state: RowState; toggleReinstated: (iso: IsoDate) => void }) {
  if (state.hasHoliday) {
    return (
      <button type="button"
        className={`${styles.terminToggle} ${state.isSkipped ? styles.terminToggleSkipped : styles.terminToggleActive}`}
        title={state.isSkipped ? 'Findet statt' : 'Entfällt'}
        onClick={() => toggleReinstated(state.iso)}
      >
        {state.isSkipped ? <SkipIcon /> : <CheckSmallIcon />}
      </button>
    )
  }
  return <Badge tone="neutral" sizeVariant="sm">{state.isKontext ? 'Stamm' : 'Regel'}</Badge>
}

function TreffenRow(props: TreffenRowProps) {
  const state = computeRowState(props)
  return (
    <div className={`${styles.terminRow} ${state.isSkipped ? styles.terminSkipped : ''} ${state.isReinstated ? styles.terminReinstated : ''}`}>
      <span className={`${styles.terminDate} ${state.isKontext ? styles.terminDateKontext : ''}`}>
        {formatTerminDate(state.iso)}
      </span>
      <span className={styles.terminLabel}>
        {state.isKontext
          ? <span className={styles.terminBudgetInfo}>{state.teamMin} Min Team · {state.abzug} Min Stamm</span>
          : <span>{props.dauer} min</span>}
      </span>
      <span className={styles.terminRight}>
        {state.holLabel && <span className={styles.terminBadgeFerien}>{state.holLabel}</span>}
        <TreffenRowRight state={state} toggleReinstated={props.toggleReinstated} />
      </span>
    </div>
  )
}

type CollapseRowProps = {
  hiddenCount: number
  hiddenHolidayCount: number
  onExpand: () => void
}

function CollapseRow({ hiddenCount, hiddenHolidayCount, onExpand }: CollapseRowProps) {
  return (
    <div className={styles.terminRowCollapsed} onClick={onExpand}>
      <span className={styles.terminDate}>…</span>
      <span className={styles.terminLabel}>
        {hiddenCount} weitere anzeigen
        {hiddenHolidayCount > 0 && (
          <span className={styles.collapsedWarn}>
            <Icon name="warning" size={12} />
            {hiddenHolidayCount} in Ferien
          </span>
        )}
      </span>
      <span />
    </div>
  )
}

export type TerminPreviewProps = {
  mergedItems: PreviewItem[]
  terminListExpanded: boolean
  setTerminListExpanded: (v: boolean) => void
  dauer: number
  activeKontext: StammKontext | undefined
  isOutsideKontext: (iso: IsoDate) => boolean
  isHoliday: (iso: IsoDate) => { ferien?: string; feiertag?: string } | null
  reinstated: Set<IsoDate>
  toggleReinstated: (iso: IsoDate) => void
}

function countHiddenHolidays(
  hiddenItems: PreviewItem[],
  isOutsideKontext: (iso: IsoDate) => boolean,
  isHoliday: (iso: IsoDate) => { ferien?: string; feiertag?: string } | null,
): number {
  return hiddenItems.filter(
    (it) => it.kind === 'treffen' && it.source === 'generated'
      && isOutsideKontext(it.iso) && !!isHoliday(it.iso),
  ).length
}

export function WizardStep1TerminPreview(props: TerminPreviewProps) {
  const { mergedItems, terminListExpanded, setTerminListExpanded } = props

  if (mergedItems.length === 0) {
    return <div className={styles.terminListEmpty}>Keine Treffen im gewählten Zeitraum.</div>
  }

  const canCollapse = mergedItems.length > VISIBLE_HEAD + VISIBLE_TAIL + 1
  const shouldCollapse = canCollapse && !terminListExpanded
  const hiddenCount = shouldCollapse ? mergedItems.length - VISIBLE_HEAD - VISIBLE_TAIL : 0
  const visibleItems = shouldCollapse
    ? [...mergedItems.slice(0, VISIBLE_HEAD), ...mergedItems.slice(-VISIBLE_TAIL)]
    : mergedItems

  const rendered = visibleItems.map((item) => {
    if (item.kind === 'aktion') return <AktionRow key={item.aktion.id} item={item} />
    return <TreffenRow key={item.iso}
      item={item}
      dauer={props.dauer}
      activeKontext={props.activeKontext}
      isOutsideKontext={props.isOutsideKontext}
      isHoliday={props.isHoliday}
      reinstated={props.reinstated}
      toggleReinstated={props.toggleReinstated}
    />
  })

  if (shouldCollapse) {
    const hidden = mergedItems.slice(VISIBLE_HEAD, mergedItems.length - VISIBLE_TAIL)
    rendered.splice(VISIBLE_HEAD, 0, (
      <CollapseRow
        key="__collapsed"
        hiddenCount={hiddenCount}
        hiddenHolidayCount={countHiddenHolidays(hidden, props.isOutsideKontext, props.isHoliday)}
        onExpand={() => setTerminListExpanded(true)}
      />
    ))
  }

  return <div className={styles.terminList}>{rendered}</div>
}
