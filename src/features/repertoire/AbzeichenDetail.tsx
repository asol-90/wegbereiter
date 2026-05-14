import { useMemo } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import type { Abzeichen, Aktivitaet } from '@/domain/types'
import { TYP_LABELS, UNTERTYP_LABELS } from '@/domain/aktivitaetKatalog'
import { ALTERSSTUFE_LABELS } from '@/domain/abzeichenKatalog'
import styles from './RepertoirePage.module.css'

export function AbzeichenDetail({
  abzeichen,
  aktivitaeten,
  onCreateAktivitaet,
}: {
  abzeichen: Abzeichen
  aktivitaeten: readonly Aktivitaet[]
  onCreateAktivitaet: (anf: Abzeichen['anforderungen'][number]) => void
}) {
  // Check which Anforderungen already have a linked Aktivität
  const anforderungStatus = useMemo(() => {
    const map = new Map<string, boolean>()
    for (const anf of abzeichen.anforderungen) {
      const hasAkt = aktivitaeten.some(
        (a) => a.stufenbezug?.includes(anf.id) && !a.deaktiviert,
      )
      map.set(anf.id as string, hasAkt)
    }
    return map
  }, [abzeichen, aktivitaeten])

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <span className={styles.detailTitle}>
          <Icon name="award" size={14} />
          {abzeichen.name}
        </span>
        <span className={styles.detailQuelle}>
          {ALTERSSTUFE_LABELS[abzeichen.altersstufe]}
        </span>
      </div>

      <div className={styles.detailBody}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Anforderungen</span>
        </div>
        <div className={styles.anforderungenList}>
          {abzeichen.anforderungen.map((anf) => {
            const imRepertoire = anforderungStatus.get(anf.id as string) ?? false
            return (
              <div key={anf.id} className={styles.anforderungRow}>
                <div className={styles.anforderungInfo}>
                  <span className={styles.anforderungName}>{anf.name}</span>
                  <span className={styles.anforderungMeta}>
                    {TYP_LABELS[anf.typ]}
                    {anf.untertyp && ` · ${UNTERTYP_LABELS[anf.untertyp]}`}
                    {' · '}
                    {anf.zeitMin}–{anf.zeitMax} min
                  </span>
                </div>
                {imRepertoire ? (
                  <span className={styles.statusBadgeGreen}>Im Repertoire</span>
                ) : (
                  <button
                    className={styles.statusBadgeBtn}
                    onClick={() => onCreateAktivitaet(anf)}
                  >
                    Ins Repertoire
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
