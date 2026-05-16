import { pruefePlanung, type AbschlussKriterien, type Kriterium, type KriteriumStatus } from '@/domain/planungsAbschluss'
import type { Abzeichen, Aktivitaet, Andachtsreihe, Planung, StammKontext } from '@/domain/types'
import { usePlanungenActions } from '@/features/planungen'
import { Button, Icon } from '@/ui/primitives'
import { SealWarning } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import { ExportDialog } from './ExportDialog'
import styles from './AbschlussSektion.module.css'

type SealTone = 'ok' | 'warn' | 'block'

function sealToneFor(kriterien: AbschlussKriterien): SealTone {
  if (!kriterien.kannAbschliessen) return 'block'
  if (kriterien.kriterien.some((k) => k.status === 'warn')) return 'warn'
  return 'ok'
}

type Props = {
  planung: Planung
  andachtsreihen: Andachtsreihe[]
  abzeichen: Abzeichen[]
  stammKontext: StammKontext | null
  stammAktivitaeten: readonly Aktivitaet[]
  alleAktivitaeten: readonly Aktivitaet[]
}

export function AbschlussSektion({
  planung,
  andachtsreihen,
  abzeichen,
  stammKontext,
  stammAktivitaeten,
  alleAktivitaeten,
}: Props) {
  const { update } = usePlanungenActions()
  const [exportOpen, setExportOpen] = useState(false)

  const kriterien = useMemo(
    () => pruefePlanung(planung, andachtsreihen, abzeichen, stammKontext, stammAktivitaeten),
    [planung, andachtsreihen, abzeichen, stammKontext, stammAktivitaeten],
  )

  async function handleAbschliessen() {
    if (!kriterien.kannAbschliessen) return
    await update({ ...planung, status: 'abgeschlossen' })
    setExportOpen(true)
  }

  async function handleZuruecksetzen() {
    await update({ ...planung, status: 'aktiv' })
  }

  return (
    <>
      <div className={styles.root}>
        <hr className={styles.sep} />

        {planung.status === 'abgeschlossen' ? (
          <AbgeschlossenBanner onReset={handleZuruecksetzen} />
        ) : (
          <AbschliessenSplitButton kriterien={kriterien} onAbschliessen={handleAbschliessen} />
        )}

        <Button
          variant="secondary"
          size="sm"
          fullWidth
          icon="download"
          onClick={() => setExportOpen(true)}
        >
          Exportieren
        </Button>
      </div>

      <ExportDialog
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        planung={planung}
        aktivitaeten={alleAktivitaeten}
        andachtsreihen={andachtsreihen}
        abzeichen={abzeichen}
        stammKontext={stammKontext}
        stammAktivitaeten={stammAktivitaeten}
      />
    </>
  )
}

// ─── Split button: main action + hover-info zone ──────────────────────────────

function AbschliessenSplitButton({
  kriterien,
  onAbschliessen,
}: {
  kriterien: AbschlussKriterien
  onAbschliessen: () => void
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const disabled = !kriterien.kannAbschliessen
  const tone = sealToneFor(kriterien)

  return (
    <div className={styles.splitWrap}>
      <button
        className={styles.splitMain}
        disabled={disabled}
        onClick={onAbschliessen}
        title={disabled ? 'Noch offene Pflicht-Kriterien' : undefined}
      >
        Planung abschließen
        <Icon name="arrow-right" size={12} />
      </button>

      <div className={styles.splitDivider} />

      <div
        className={`${styles.splitInfo} ${styles[`splitInfo_${tone}`]}`}
        onMouseEnter={() => setPopoverOpen(true)}
        onMouseLeave={() => setPopoverOpen(false)}
        aria-label={tone === 'block' ? 'Pflicht-Kriterien offen' : tone === 'warn' ? 'Hinweise zu offenen Punkten' : 'Alle Kriterien erfüllt'}
      >
        <SealWarning size={14} weight={tone === 'ok' ? 'regular' : 'fill'} />

        {popoverOpen && <KriterienPopover kriterien={kriterien} />}
      </div>
    </div>
  )
}

// ─── Hover-triggered criteria popover ────────────────────────────────────────

function KriterienPopover({ kriterien }: { kriterien: AbschlussKriterien }) {
  const ziele = kriterien.kriterien.filter((k) => k.art === 'ziel')
  const hinweise = kriterien.kriterien.filter((k) => k.art === 'hinweis')

  return (
    <div className={styles.popover}>
      {ziele.length > 0 && (
        <section>
          <div className={styles.popoverGroup}>Ziele</div>
          {ziele.map((k) => <PopoverRow key={k.key} k={k} />)}
        </section>
      )}
      {hinweise.length > 0 && (
        <section>
          <div className={styles.popoverGroup}>Hinweise</div>
          {hinweise.map((k) => <PopoverRow key={k.key} k={k} />)}
        </section>
      )}
      {kriterien.kannAbschliessen && (
        <div className={styles.popoverAllOk}>
          <Icon name="check" size={11} />
          <span>Alle Pflicht-Kriterien erfüllt</span>
        </div>
      )}
    </div>
  )
}

function PopoverRow({ k }: { k: Kriterium }) {
  return (
    <div className={styles.popoverRow}>
      <span className={styles.popoverIcon} data-status={k.status}>
        <PopoverStatusIcon status={k.status} />
      </span>
      <span className={styles.popoverText}>{k.text}</span>
    </div>
  )
}

function PopoverStatusIcon({ status }: { status: KriteriumStatus }) {
  if (status === 'ok') return <Icon name="check" size={11} />
  if (status === 'warn') return <Icon name="warning" size={11} />
  return <Icon name="x" size={11} />
}

// ─── Abgeschlossen banner ─────────────────────────────────────────────────────

function AbgeschlossenBanner({ onReset }: { onReset: () => void }) {
  return (
    <div className={styles.doneBanner}>
      <Icon name="check" size={14} className={styles.doneIcon} />
      <span className={styles.doneLabel}>Planung abgeschlossen</span>
      <button className={styles.resetBtn} onClick={onReset} title="Zurück zu aktiv">
        <Icon name="x" size={12} />
      </button>
    </div>
  )
}
