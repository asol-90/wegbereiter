/**
 * Small display + card components used by StammKontextEditorPanel.
 * Pulled out so the panel itself stays focused on orchestration.
 */
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import { parseIso } from '@/domain/dateUtils'
import type {
  Aktivitaet, IsoDate, StammAktion, StammBlock, StammTreffen,
} from '@/domain/types'
import type { AktivitaetId, StammAktionId } from '@/domain/ids'
import { TYP_LABELS, UNTERTYP_LABELS } from '@/domain/aktivitaetKatalog'
import { Icon } from '@/ui/primitives/Icon'
import { IconButton } from '@/ui/primitives/IconButton'
import type { AktionGruppe } from './StammKontextEditorPanel'
import styles from './StammKontextEditorPanel.module.css'

function formatDatum(iso: IsoDate): string {
  return format(parseIso(iso), 'dd. MMM yyyy', { locale: de })
}

function sumDauer(blocks: StammBlock[]): number {
  return blocks.reduce((sum, b) => sum + b.dauerMin, 0)
}

// ─── ThemaDisplay ───────────────────────────────────────────────────────────

export type ThemaDisplayProps = {
  thema: string
  themaBeschreibung?: string
  themenTag?: string
  bearbeitungsNotiz?: string
  onEdit: () => void
}

export function ThemaDisplay({
  thema, themaBeschreibung, themenTag, bearbeitungsNotiz, onEdit,
}: ThemaDisplayProps) {
  return (
    <div className={styles.displaySection}>
      <div className={styles.displayContent}>
        <span className={styles.displayTitle}>
          {thema || <em className={styles.placeholder}>Kein Thema</em>}
        </span>
        {themaBeschreibung && <span className={styles.displayMeta}>{themaBeschreibung}</span>}
        {themenTag && <span className={styles.displayTag}>#{themenTag}</span>}
        {bearbeitungsNotiz && <span className={styles.displayNotiz}>{bearbeitungsNotiz}</span>}
      </div>
      <IconButton icon="edit" label="Thema bearbeiten" onClick={onEdit} />
    </div>
  )
}

// ─── StammzeitDisplay ───────────────────────────────────────────────────────

function BlocksLine({ blocks }: { blocks: StammBlock[] }) {
  if (blocks.length === 0) return <span className={styles.displayMeta}>–</span>
  return (
    <span className={styles.displayMeta}>
      {blocks.map((b, i) => (
        <span key={i}>
          {b.name || '–'} ({b.dauerMin} Min)
          {i < blocks.length - 1 ? ' · ' : ''}
        </span>
      ))}
    </span>
  )
}

export type StammzeitDisplayProps = {
  anfangsBlock: StammBlock[]
  endBlock: StammBlock[]
  onEdit: () => void
}

export function StammzeitDisplay({ anfangsBlock, endBlock, onEdit }: StammzeitDisplayProps) {
  return (
    <div className={styles.displaySection}>
      <div className={styles.displayContent}>
        <div className={styles.stammzeitDisplayRow}>
          <span className={styles.displayLabel}>Anfang:</span>
          <BlocksLine blocks={anfangsBlock} />
        </div>
        <div className={styles.stammzeitDisplayRow}>
          <span className={styles.displayLabel}>Ende:</span>
          <BlocksLine blocks={endBlock} />
        </div>
      </div>
      <IconButton icon="edit" label="Stammzeit bearbeiten" onClick={onEdit} />
    </div>
  )
}

// ─── TreffenCard ────────────────────────────────────────────────────────────

export type TreffenCardProps = {
  treffen: StammTreffen
  defaultAnfangsBlock: StammBlock[]
  defaultEndBlock: StammBlock[]
  onEdit: () => void
  onRemove: () => void
}

export function TreffenCard({
  treffen, defaultAnfangsBlock, defaultEndBlock, onEdit, onRemove,
}: TreffenCardProps) {
  const anfangBlocks = treffen.anfangsBlock ?? defaultAnfangsBlock
  const endeBlocks = treffen.endBlock ?? defaultEndBlock
  const anfangDauer = sumDauer(anfangBlocks)
  const endeDauer = sumDauer(endeBlocks)
  const total = treffen.dauerMin || 1
  const mitteDauer = Math.max(0, total - anfangDauer - endeDauer)
  const segments: Array<['Anfang' | 'Mitte' | 'Ende', number]> = [
    ['Anfang', (anfangDauer / total) * 100],
    ['Mitte', (mitteDauer / total) * 100],
    ['Ende', (endeDauer / total) * 100],
  ]
  const segmentClass = {
    Anfang: styles.stammzeitBarAnfang,
    Mitte: styles.stammzeitBarMitte,
    Ende: styles.stammzeitBarEnde,
  }
  return (
    <div className={styles.treffenCard}>
      <div className={styles.treffenCardTop}>
        <span className={styles.treffenCardDate}>{formatDatum(treffen.datum)}</span>
        <span className={styles.treffenCardDauer}>{treffen.dauerMin} Min</span>
      </div>
      <div className={styles.stammzeitBar}>
        {segments.filter(([, pct]) => pct > 0).map(([name, pct]) => (
          <div key={name} className={segmentClass[name]} style={{ flexBasis: `${pct}%` }} />
        ))}
      </div>
      <div className={styles.treffenCardActions}>
        <IconButton icon="edit" label="Bearbeiten" size={12} onClick={onEdit} />
        <IconButton icon="trash" label="Entfernen" tone="danger" size={12} onClick={onRemove} />
      </div>
    </div>
  )
}

// ─── AktionCard + AktionenGroup ─────────────────────────────────────────────

export type AktionCardProps = {
  aktion: StammAktion
  onEdit: () => void
  onRemove: () => void
}

export function AktionCard({ aktion, onEdit, onRemove }: AktionCardProps) {
  const dateStr = aktion.beginn === aktion.ende
    ? formatDatum(aktion.beginn)
    : `${formatDatum(aktion.beginn)} – ${formatDatum(aktion.ende)}`
  return (
    <div className={styles.aktionCard}>
      <span className={styles.aktionCardTitle}>
        {aktion.titel || <em className={styles.placeholder}>Kein Titel</em>}
      </span>
      <span className={styles.aktionCardDate}>{dateStr}</span>
      <div className={styles.aktionCardActions}>
        <IconButton icon="edit" label="Bearbeiten" size={12} onClick={onEdit} />
        <IconButton icon="trash" label="Entfernen" tone="danger" size={12} onClick={onRemove} />
      </div>
    </div>
  )
}

export type AktionenGroupProps = {
  title: string
  addLabel: string
  gruppe: AktionGruppe
  aktionen: StammAktion[]
  onAdd: (gruppe: AktionGruppe) => void
  onEdit: (aktion: StammAktion, gruppe: AktionGruppe) => void
  onRemove: (id: StammAktionId) => void
}

export function AktionenGroup({
  title, addLabel, gruppe, aktionen, onAdd, onEdit, onRemove,
}: AktionenGroupProps) {
  return (
    <div className={styles.aktionenGroup}>
      <span className={styles.aktionenSubheading}>{title}</span>
      {aktionen.length > 0 && (
        <div className={styles.aktionCardList}>
          {aktionen.map((a) => (
            <AktionCard
              key={a.id} aktion={a}
              onEdit={() => onEdit(a, gruppe)}
              onRemove={() => onRemove(a.id)}
            />
          ))}
        </div>
      )}
      <button type="button" className={styles.addRowBtn} onClick={() => onAdd(gruppe)}>
        <Icon name="plus" size={12} />
        <span>{addLabel} hinzufügen</span>
      </button>
    </div>
  )
}

// ─── AktivitaetCard ─────────────────────────────────────────────────────────

export type AktivitaetCardProps = {
  aktivitaet: Aktivitaet
  onEdit: () => void
  onRemove: (id: AktivitaetId) => void
}

export function AktivitaetCard({ aktivitaet, onEdit, onRemove }: AktivitaetCardProps) {
  return (
    <div className={styles.aktivitaetCard}>
      <div className={styles.aktivitaetCardHeader}>
        <span className={styles.aktivitaetCardName}>
          {aktivitaet.name || <em className={styles.placeholder}>Kein Name</em>}
        </span>
        <div className={styles.aktivitaetCardActions}>
          <IconButton icon="edit" label="Bearbeiten" size={12} onClick={onEdit} />
          <IconButton icon="trash" label="Entfernen" tone="danger" size={12}
            onClick={() => onRemove(aktivitaet.id)} />
        </div>
      </div>
      <span className={styles.aktivitaetCardMeta}>
        {TYP_LABELS[aktivitaet.typ]}
        {aktivitaet.untertyp && ` · ${UNTERTYP_LABELS[aktivitaet.untertyp]}`}
        {' · '}{aktivitaet.zeitMin}–{aktivitaet.zeitMax} Min
      </span>
    </div>
  )
}
