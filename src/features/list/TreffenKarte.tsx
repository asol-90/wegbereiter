/**
 * TreffenKarte — interactive meeting card for the Terminliste (§8.1 + §9).
 *
 * Composes head (date + title), meta column (WB + team) and the content
 * column (notiz, programmpunkte, stamm-blöcke, duration bar). Also acts as
 * drop target for the Kontextleiste — handled by useTreffenDrop.
 */
import type { TreffenId } from '@/domain/ids'
import type { Treffen } from '@/domain/types'
import clsx from '@/ui/utils/clsx'
import { TreffenKarteContent } from './TreffenKarteContent'
import { TreffenKarteHead } from './TreffenKarteHead'
import { TreffenKarteMeta } from './TreffenKarteMeta'
import type { StammBlocksForTreffen, TreffenKarteProps, TreffenMutations } from './treffenKarteTypes'
import { useTreffenDrop } from './useTreffenDrop'
import styles from './TreffenKarte.module.css'

export type { StammBlocksForTreffen, TreffenKarteProps, TreffenMutations }

function aggregateWB(treffen: Treffen): Map<string, number> {
  const map = new Map<string, number>()
  for (const pp of treffen.programm) {
    for (const tag of pp.wbTags) {
      const cur = map.get(tag.key) ?? 0
      map.set(tag.key, Math.max(cur, tag.intensity))
    }
  }
  return map
}

export function TreffenKarte({
  treffen, dauerMinuten, team, zeitbalkenSchwelle, mutations,
  onAddClick, onKonkretisieren, stammBlocks, abwesendeIds,
}: TreffenKarteProps) {
  const tid = treffen.id as TreffenId
  const { dragOver, handleDragOver, handleDragLeave, handleDrop } = useTreffenDrop(tid, mutations)
  const wbMap = aggregateWB(treffen)
  const teamIst = treffen.programm.reduce((sum, p) => sum + p.dauerMin, 0)
  const stammMinTotal = stammBlocks?.stammMin ?? 0
  const ist = teamIst + stammMinTotal
  const targetRange: [number, number] = [zeitbalkenSchwelle, Math.min(1, zeitbalkenSchwelle + 0.1)]

  return (
    <article
      className={clsx(styles.card, dragOver && styles.cardDragOver)}
      id={`treffen-${treffen.id}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <TreffenKarteHead treffen={treffen} tid={tid} mutations={mutations} />
      <div className={styles.body}>
        <TreffenKarteMeta
          treffen={treffen}
          tid={tid}
          team={team}
          mutations={mutations}
          abwesendeIds={abwesendeIds}
          wbMap={wbMap}
        />
        <TreffenKarteContent
          treffen={treffen}
          tid={tid}
          team={team}
          mutations={mutations}
          stammBlocks={stammBlocks}
          stammMinTotal={stammMinTotal}
          ist={ist}
          dauerMinuten={dauerMinuten}
          targetRange={targetRange}
          onAddClick={onAddClick}
          onKonkretisieren={onKonkretisieren}
        />
      </div>
    </article>
  )
}
