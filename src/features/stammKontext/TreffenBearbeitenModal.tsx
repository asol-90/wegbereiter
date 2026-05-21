/**
 * Modal to add/edit a single StammTreffen (date + Dauer + optional Anfang-/Endblock).
 */
import { useState } from 'react'
import { newId, type StammTreffenId } from '@/domain/ids'
import type { Aktivitaet, IsoDate, StammBlock, StammTreffen } from '@/domain/types'
import { Button, Modal } from '@/ui/primitives'
import { StammBlockPicker } from './StammBlockPicker'
import styles from './StammKontextPage.module.css'

function aktivitaetToBlock(a: Aktivitaet): StammBlock {
  return { name: a.name, typ: a.typ, untertyp: a.untertyp, dauerMin: a.zeitMin }
}

function mergeOptions(defaults: StammBlock[], extras: StammBlock[]): StammBlock[] {
  return [...defaults, ...extras.filter((b) => !defaults.some((d) => d.name === b.name))]
}

export type TreffenBearbeitenModalProps = {
  treffen?: StammTreffen
  defaultAnfangsBlock: StammBlock[]
  defaultEndBlock: StammBlock[]
  stammAktivitaeten: readonly Aktivitaet[]
  onSave: (t: StammTreffen) => void
  onClose: () => void
}

type OverrideSectionProps = {
  label: string
  active: boolean
  blocks: StammBlock[] | undefined
  defaults: StammBlock[]
  options: StammBlock[]
  onToggle: (active: boolean) => void
  onChange: (blocks: StammBlock[]) => void
}

function OverrideSection({ label, active, blocks, defaults, options, onToggle, onChange }: OverrideSectionProps) {
  return (
    <div className={styles.overrideSection}>
      <div className={styles.overrideSectionHeader}>
        <span className={styles.fieldLabel}>{label}</span>
        <div className={styles.overrideToggleGroup}>
          <button type="button"
            className={`${styles.overrideToggle} ${!active ? styles.overrideToggleActive : ''}`}
            onClick={() => onToggle(false)}
          >
            Standard
          </button>
          <button type="button"
            className={`${styles.overrideToggle} ${active ? styles.overrideToggleActive : ''}`}
            onClick={() => onToggle(true)}
          >
            Überschreiben
          </button>
        </div>
      </div>
      {active && (
        <StammBlockPicker blocks={blocks ?? defaults} availableBlocks={options} onChange={onChange} />
      )}
    </div>
  )
}

export function TreffenBearbeitenModal({
  treffen, defaultAnfangsBlock, defaultEndBlock, stammAktivitaeten, onSave, onClose,
}: TreffenBearbeitenModalProps) {
  const isNew = !treffen
  const today = new Date().toISOString().slice(0, 10) as IsoDate
  const [draft, setDraft] = useState<StammTreffen>(() =>
    treffen ?? { id: newId<StammTreffenId>(), datum: today, dauerMin: 90 },
  )
  const [showAnfangOverride, setShowAnfangOverride] = useState(draft.anfangsBlock !== undefined)
  const [showEndeOverride, setShowEndeOverride] = useState(draft.endBlock !== undefined)

  const stammBlocks = stammAktivitaeten.map(aktivitaetToBlock)
  const anfangOptions = mergeOptions(defaultAnfangsBlock, stammBlocks)
  const endeOptions = mergeOptions(defaultEndBlock, stammBlocks)

  function setAnfangActive(active: boolean) {
    setShowAnfangOverride(active)
    setDraft((d) => ({ ...d, anfangsBlock: active ? (d.anfangsBlock ?? [...defaultAnfangsBlock]) : undefined }))
  }

  function setEndeActive(active: boolean) {
    setShowEndeOverride(active)
    setDraft((d) => ({ ...d, endBlock: active ? (d.endBlock ?? [...defaultEndBlock]) : undefined }))
  }

  return (
    <Modal
      open onClose={onClose} size="sm"
      title={isNew ? 'Treffen hinzufügen' : 'Treffen bearbeiten'}
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
          <Button variant="primary" onClick={() => onSave(draft)}>
            {isNew ? 'Hinzufügen' : 'Speichern'}
          </Button>
        </div>
      }
    >
      <div className={styles.modalBody}>
        <div className={styles.treffenModalRow}>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Datum</label>
            <input type="date" className={styles.fieldInput} autoFocus
              value={draft.datum}
              onChange={(e) => setDraft((d) => ({ ...d, datum: e.target.value as IsoDate }))} />
          </div>
          <div className={styles.field}>
            <label className={styles.fieldLabel}>Dauer (Min)</label>
            <input type="number" className={styles.fieldInputSm}
              value={draft.dauerMin} min={15} max={480}
              onChange={(e) => setDraft((d) => ({ ...d, dauerMin: Math.max(15, +e.target.value || 90) }))} />
          </div>
        </div>

        <OverrideSection
          label="Anfangsblock"
          active={showAnfangOverride}
          blocks={draft.anfangsBlock}
          defaults={defaultAnfangsBlock}
          options={anfangOptions}
          onToggle={setAnfangActive}
          onChange={(b) => setDraft((d) => ({ ...d, anfangsBlock: b }))}
        />
        <OverrideSection
          label="Endblock"
          active={showEndeOverride}
          blocks={draft.endBlock}
          defaults={defaultEndBlock}
          options={endeOptions}
          onToggle={setEndeActive}
          onChange={(b) => setDraft((d) => ({ ...d, endBlock: b }))}
        />
      </div>
    </Modal>
  )
}
