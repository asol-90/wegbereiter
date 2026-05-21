/**
 * TreffenKarteMeta — left column of TreffenKarte: WB-Slots and team avatars.
 */
import type { MitarbeiterId, TreffenId } from '@/domain/ids'
import type { Mitarbeiter, Treffen } from '@/domain/types'
import { WB_KEYS } from '@/domain/wb'
import { Avatar } from '@/ui/domain/Avatar'
import { WBIconItem } from '@/ui/domain/WBIconStack'
import clsx from '@/ui/utils/clsx'
import type { TreffenMutations } from './treffenKarteTypes'
import styles from './TreffenKarte.module.css'

export type TreffenKarteMetaProps = {
  treffen: Treffen
  tid: TreffenId
  team: Mitarbeiter[]
  mutations: TreffenMutations
  abwesendeIds?: Set<MitarbeiterId>
  wbMap: Map<string, number>
}

export function TreffenKarteMeta({ treffen, tid, team, mutations, abwesendeIds, wbMap }: TreffenKarteMetaProps) {
  return (
    <div className={styles.metaCol}>
      <div>
        <div className={styles.blockLabel}>Wachstumsbereich</div>
        <div className={styles.wbDots}>
          {WB_KEYS.map((key) => {
            const intensity = wbMap.get(key) ?? 0
            const isSoll = treffen.sollWB.includes(key)
            return (
              <div
                key={key}
                className={clsx(styles.wbSlot, isSoll && styles.wbSlotSoll)}
                onClick={() => mutations.toggleSollWB(tid, key)}
                title={`Soll-WB ${isSoll ? 'entfernen' : 'setzen'}: ${key}`}
              >
                <WBIconItem wb={key} intensity={intensity} />
              </div>
            )
          })}
        </div>
      </div>
      {team.length > 0 && (
        <div>
          <div className={styles.blockLabel}>Mitarbeiter</div>
          <div style={{ display: 'flex', gap: 0 }}>
            {team.map((m, i) => {
              const isAbsent = abwesendeIds?.has(m.id) ?? false
              return (
                <Avatar
                  key={m.id}
                  name={m.name}
                  initials={m.initials}
                  size={28}
                  tone={isAbsent ? 'muted' : 'auto'}
                  style={{
                    marginLeft: i > 0 ? -6 : 0,
                    opacity: isAbsent ? 0.35 : 1,
                    textDecoration: isAbsent ? 'line-through' : undefined,
                  }}
                  title={isAbsent ? `${m.name} (abwesend)` : m.name}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
