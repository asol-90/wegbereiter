import React from 'react'
import { Star } from '@phosphor-icons/react'
import {
  Badge,
  Input,
  Select,
  type SelectOption,
} from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import { WEEKDAYS, type IsoDate, type Mitarbeiter, type StammAktion, type StammKontext, type Weekday } from '@/domain/types'
import type { MitarbeiterId } from '@/domain/ids'
import { stammAbzugFuerTreffen } from '@/domain/zeitbudget'
import {
  WEEKDAY_LABELS,
  RHYTHMUS_LABELS,
  formatTerminDate,
  formatDateRange,
  formatDateShort,
  type BisPreset,
  type PreviewItem,
  type RhythmusKey,
} from './newPlanungWizardUtils'
import styles from './NewPlanungWizard.module.css'

// ─── Local constants ──────────────────────────────────────────────────────────

const WEEKDAY_OPTIONS: SelectOption<Weekday>[] = WEEKDAYS.map((w) => ({
  value: w,
  label: WEEKDAY_LABELS[w],
}))

const RHYTHMUS_OPTIONS: SelectOption<RhythmusKey>[] = [
  { value: 'weekly', label: 'wöchentlich' },
  { value: 'biweekly', label: '14-tägig' },
  { value: 'monthly', label: 'monatlich' },
]

const VISIBLE_HEAD = 6
const VISIBLE_TAIL = 1

// ─── Inline icons ─────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

export type WizardStep1TeamProps = {
  weekday: Weekday
  setWeekday: (w: Weekday) => void
  rhythmusK: RhythmusKey
  setRhythmusK: (r: RhythmusKey) => void
  dauer: number
  setDauer: (d: number) => void
  editingRhythmus: boolean
  setEditingRhythmus: (v: boolean) => void
  start: IsoDate
  setStart: (s: IsoDate) => void
  ende: IsoDate
  setEnde: (e: IsoDate) => void
  setEndeWasAutoSet: (v: boolean) => void
  startReason: string | null
  endeReason: string | null
  bisPresets: BisPreset[]
  bisPresetOpen: boolean
  setBisPresetOpen: React.Dispatch<React.SetStateAction<boolean>>
  bisPresetRef: React.RefObject<HTMLDivElement | null>
  team: Mitarbeiter[]
  newTeamName: string
  setNewTeamName: (n: string) => void
  addTeamMember: (name: string) => void
  removeTeamMember: (id: MitarbeiterId) => void
  activeMeetingCount: number
  stammaktionenInRange: StammAktion[]
  mergedItems: PreviewItem[]
  terminListExpanded: boolean
  setTerminListExpanded: (v: boolean) => void
  isOutsideKontext: (iso: IsoDate) => boolean
  isHoliday: (iso: IsoDate) => { ferien?: string; feiertag?: string } | null
  reinstated: Set<IsoDate>
  toggleReinstated: (iso: IsoDate) => void
  activeKontext: StammKontext | undefined
  error: string | null
  teamWarn: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function WizardStep1Team({
  weekday,
  setWeekday,
  rhythmusK,
  setRhythmusK,
  dauer,
  setDauer,
  editingRhythmus,
  setEditingRhythmus,
  start,
  setStart,
  ende,
  setEnde,
  setEndeWasAutoSet,
  startReason,
  endeReason,
  bisPresets,
  bisPresetOpen,
  setBisPresetOpen,
  bisPresetRef,
  team,
  newTeamName,
  setNewTeamName,
  addTeamMember,
  removeTeamMember,
  activeMeetingCount,
  stammaktionenInRange,
  mergedItems,
  terminListExpanded,
  setTerminListExpanded,
  isOutsideKontext,
  isHoliday,
  reinstated,
  toggleReinstated,
  activeKontext,
  error,
  teamWarn,
}: WizardStep1TeamProps) {
  function renderTerminPreview() {
    if (mergedItems.length === 0) {
      return (
        <div className={styles.terminListEmpty}>
          Keine Treffen im gewählten Zeitraum.
        </div>
      )
    }

    const canCollapse = mergedItems.length > VISIBLE_HEAD + VISIBLE_TAIL + 1
    const shouldCollapse = canCollapse && !terminListExpanded
    const hiddenCount = shouldCollapse ? mergedItems.length - VISIBLE_HEAD - VISIBLE_TAIL : 0

    const visibleItems = shouldCollapse
      ? [...mergedItems.slice(0, VISIBLE_HEAD), ...mergedItems.slice(-VISIBLE_TAIL)]
      : mergedItems

    const rows = visibleItems.map((item) => {
      if (item.kind === 'aktion') {
        const a = item.aktion
        const isMultiDay = a.beginn !== a.ende
        const isExtern = item.bereich !== 'Stamm'
        return (
          <div key={a.id} className={`${styles.terminRow} ${styles.terminRowAktion} ${isExtern ? styles.terminRowExtern : ''}`}>
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

      const { iso, source } = item
      const hol = source === 'generated' && isOutsideKontext(iso) ? isHoliday(iso) : null
      const isSkipped = !!hol && !reinstated.has(iso)
      const isReinstatedRow = !!hol && reinstated.has(iso)
      const isKontext = source === 'kontext'

      const stammTreffen = isKontext && activeKontext
        ? activeKontext.treffen.find((t) => t.datum === iso)
        : undefined
      const abzug = stammTreffen ? stammAbzugFuerTreffen(stammTreffen, activeKontext!) : 0
      const teamMin = (stammTreffen?.dauerMin ?? dauer) - abzug

      const holLabel = hol?.feiertag ?? hol?.ferien

      return (
        <div
          key={iso}
          className={`${styles.terminRow} ${isSkipped ? styles.terminSkipped : ''} ${isReinstatedRow ? styles.terminReinstated : ''}`}
        >
          <span className={`${styles.terminDate} ${isKontext ? styles.terminDateKontext : ''}`}>
            {formatTerminDate(iso)}
          </span>
          <span className={styles.terminLabel}>
            {isKontext
              ? <span className={styles.terminBudgetInfo}>{teamMin} Min Team · {abzug} Min Stamm</span>
              : <span>{dauer} min</span>
            }
          </span>
          <span className={styles.terminRight}>
            {holLabel && (
              <span className={styles.terminBadgeFerien}>{holLabel}</span>
            )}
            {hol && (
              <button
                type="button"
                className={`${styles.terminToggle} ${isSkipped ? styles.terminToggleSkipped : styles.terminToggleActive}`}
                title={isSkipped ? 'Findet statt' : 'Entfällt'}
                onClick={() => toggleReinstated(iso)}
              >
                {isSkipped ? <SkipIcon /> : <CheckSmallIcon />}
              </button>
            )}
            {!hol && (
              <Badge tone="neutral" sizeVariant="sm">
                {isKontext ? 'Stamm' : 'Regel'}
              </Badge>
            )}
          </span>
        </div>
      )
    })

    // Insert collapse row — check if hidden items contain holiday decisions
    if (shouldCollapse) {
      const hiddenItems = mergedItems.slice(VISIBLE_HEAD, mergedItems.length - VISIBLE_TAIL)
      const hiddenHolidayCount = hiddenItems.filter(
        (it) => it.kind === 'treffen' && it.source === 'generated'
          && isOutsideKontext(it.iso) && isHoliday(it.iso),
      ).length

      rows.splice(VISIBLE_HEAD, 0, (
        <div
          key="__collapsed"
          className={styles.terminRowCollapsed}
          onClick={() => setTerminListExpanded(true)}
        >
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
      ))
    }

    return (
      <div className={styles.terminList}>
        {rows}
      </div>
    )
  }

  return (
    <div className={styles.section}>
      <span className={styles.sectionLabel}>Zeitraum</span>
      {/* Rhythmus + Dauer — info text above Von/Bis */}
      {!editingRhythmus ? (
        <div className={styles.rhythmusInfo}>
          <div className={styles.rhythmusInfoRow}>
            <span>
              <span className={styles.rhythmusInfoLabel}>Rhythmus</span>
              {WEEKDAY_LABELS[weekday]}, {RHYTHMUS_LABELS[rhythmusK]}
            </span>
            <span className={styles.rhythmusInfoSep}>·</span>
            <span>
              <span className={styles.rhythmusInfoLabel}>Dauer</span>
              {dauer} Min
            </span>
          </div>
          <button
            type="button"
            className={styles.editBtn}
            onClick={() => setEditingRhythmus(true)}
            title="Bearbeiten"
          >
            <Icon name="edit" size={13} />
          </button>
        </div>
      ) : (
        <div className={styles.rhythmusEdit}>
          <div className={styles.rhythmusEditFields}>
            <Select<Weekday>
              label="Wochentag"
              options={WEEKDAY_OPTIONS}
              value={weekday}
              onValueChange={setWeekday}
            />
            <Select<RhythmusKey>
              label="Rhythmus"
              options={RHYTHMUS_OPTIONS}
              value={rhythmusK}
              onValueChange={setRhythmusK}
            />
            <Input
              label="Dauer (Min)"
              type="number"
              min={15}
              step={5}
              value={dauer}
              onChange={(e) => setDauer(Number.parseInt(e.target.value, 10) || 0)}
            />
          </div>
          <button
            type="button"
            className={styles.editBtnDone}
            onClick={() => setEditingRhythmus(false)}
            title="Fertig"
          >
            <Icon name="check" size={14} />
          </button>
        </div>
      )}

      {/* Von / Bis */}
      <div className={styles.dateRow}>
        <div className={styles.dateField}>
          <Input
            label="Von"
            type="date"
            value={start}
            onChange={(e) => { setStart(e.target.value); setEndeWasAutoSet(false) }}
            required
            noFoot
          />
          {startReason && (
            <p className={styles.dateReason}>{startReason}</p>
          )}
        </div>
        <div className={styles.dateField}>
          <div className={styles.bisField} ref={bisPresetRef}>
            <Input
              label="Bis"
              type="date"
              value={ende}
              onChange={(e) => { setEnde(e.target.value); setEndeWasAutoSet(false) }}
              required
              noFoot
            />
            {bisPresets.length > 0 && (
              <button
                type="button"
                className={styles.presetBtn}
                onClick={() => setBisPresetOpen((o) => !o)}
                title="Bis-Vorschläge"
                aria-label="Bis-Vorschläge"
              >
                <Star size={18} weight="duotone" />
              </button>
            )}
            {bisPresetOpen && bisPresets.length > 0 && (
              <div className={styles.presetDropdown}>
                {bisPresets.map((p) => (
                  <button
                    key={p.iso}
                    type="button"
                    className={styles.presetOption}
                    onClick={() => {
                      setEnde(p.iso)
                      setEndeWasAutoSet(false)
                      setBisPresetOpen(false)
                    }}
                  >
                    <span>{p.label}</span>
                    <span className={styles.presetDate}>{formatDateShort(p.iso)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {endeReason && (
            <p className={styles.dateReason}>{endeReason}</p>
          )}
        </div>
      </div>

      {/* Team section */}
      <div className={styles.teamSection}>
        <span className={styles.kontextSectionLabel}>Mitarbeiter</span>
        <p className={`${styles.teamHint} ${teamWarn ? styles.teamHintWarn : ''}`}>
          Mindestens einen Mitarbeiter hinzufügen.
        </p>
        <div className={`${styles.teamChips} ${teamWarn ? styles.teamChipsWarn : ''}`}>
          {team.map((member) => (
            <div
              key={member.id}
              className={styles.teamChip}
            >
              <div
                className={styles.teamAvatar}
                style={{ backgroundColor: `hsl(${member.accentHue ?? 0}, 70%, 50%)` }}
              >
                {member.initials}
              </div>
              <span>{member.name}</span>
              <button
                type="button"
                className={styles.teamRemove}
                onClick={() => removeTeamMember(member.id)}
                title="Entfernen"
              >
                ×
              </button>
            </div>
          ))}
          <input
            type="text"
            className={styles.teamInlineInput}
            placeholder="Name hinzufügen…"
            value={newTeamName}
            onChange={(e) => setNewTeamName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTeamName.trim()) {
                e.preventDefault()
                addTeamMember(newTeamName)
              }
            }}
          />
        </div>
      </div>

      {/* Termin-Vorschau */}
      <span className={styles.sectionLabel}>
        Termine ({activeMeetingCount - stammaktionenInRange.length} Treffen{stammaktionenInRange.length > 0 ? ` · ${stammaktionenInRange.length} Aktion${stammaktionenInRange.length !== 1 ? 'en' : ''}` : ''})
      </span>
      {renderTerminPreview()}

      {error && <p className={styles.error}>{error}</p>}
    </div>
  )
}
