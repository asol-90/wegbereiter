import type { AbschlussKriterien, Kriterium, KriteriumStatus } from '@/domain/planungsAbschluss'
import { Icon, Modal } from '@/ui/primitives'
import styles from './KriterienOverlay.module.css'

type Props = {
  open: boolean
  onClose: () => void
  kriterien: AbschlussKriterien
}

export function KriterienOverlay({ open, onClose, kriterien }: Props) {
  const ziele = kriterien.kriterien.filter((k) => k.art === 'ziel')
  const hinweise = kriterien.kriterien.filter((k) => k.art === 'hinweis')

  return (
    <Modal open={open} onClose={onClose} title="Abschluss-Kriterien" size="sm">
      {ziele.length > 0 && (
        <section className={styles.section}>
          <div className={styles.artLabel}>Ziele</div>
          {ziele.map((k) => <KriteriumRow key={k.key} k={k} />)}
        </section>
      )}
      {hinweise.length > 0 && (
        <section className={styles.section}>
          <div className={styles.artLabel}>Hinweise</div>
          {hinweise.map((k) => <KriteriumRow key={k.key} k={k} />)}
        </section>
      )}
      {kriterien.kannAbschliessen && (
        <div className={styles.allOk}>
          <Icon name="check" size={14} />
          <span>Alle Pflicht-Kriterien erfüllt</span>
        </div>
      )}
    </Modal>
  )
}

function KriteriumRow({ k }: { k: Kriterium }) {
  return (
    <div className={styles.row}>
      <span className={styles.icon} data-status={k.status}>
        <StatusIcon status={k.status} />
      </span>
      <span className={styles.text}>{k.text}</span>
    </div>
  )
}

function StatusIcon({ status }: { status: KriteriumStatus }) {
  if (status === 'ok') return <Icon name="check" size={13} />
  if (status === 'warn') return <Icon name="warning" size={13} />
  return <Icon name="x" size={13} />
}
