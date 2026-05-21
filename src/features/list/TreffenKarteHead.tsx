/**
 * TreffenKarteHead — date cell with lock toggle plus inline title input.
 */
import { useCallback, useRef, useState } from 'react'
import clsx from '@/ui/utils/clsx'
import type { TreffenId } from '@/domain/ids'
import type { Treffen } from '@/domain/types'
import type { TreffenMutations } from './treffenKarteTypes'
import styles from './TreffenKarte.module.css'

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

function formatDate(iso: string) {
  const d = new Date(iso)
  return {
    weekday: WEEKDAY_SHORT[d.getDay()],
    day: d.getDate(),
    month: (d.getMonth() + 1).toString().padStart(2, '0'),
  }
}

function LockOpen() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

function LockClosed() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

export type TreffenKarteHeadProps = {
  treffen: Treffen
  tid: TreffenId
  mutations: TreffenMutations
}

export function TreffenKarteHead({ treffen, tid, mutations }: TreffenKarteHeadProps) {
  const { weekday, day, month } = formatDate(treffen.datum)
  const [localTitel, setLocalTitel] = useState(treffen.titel ?? '')
  const titelRef = useRef<HTMLInputElement>(null)

  const commitTitel = useCallback(() => {
    const trimmed = localTitel.trim()
    if (trimmed !== (treffen.titel ?? '')) {
      mutations.setTitel(tid, trimmed)
    }
  }, [localTitel, treffen.titel, mutations, tid])

  return (
    <div className={styles.head}>
      <div className={styles.dateCell}>
        <button
          className={clsx(styles.lock, treffen.fixiert && styles.lockActive)}
          title={treffen.fixiert ? 'Fixierung aufheben' : 'Termin festhalten'}
          onClick={() => mutations.toggleFixiert(tid)}
        >
          {treffen.fixiert ? <LockClosed /> : <LockOpen />}
        </button>
        <span className={styles.weekday}>{weekday}</span>
        <span className={styles.dayNum}>
          {day}
          <span className={styles.month}>.{month}.</span>
        </span>
      </div>
      <input
        ref={titelRef}
        className={styles.titleInput}
        value={localTitel}
        onChange={(e) => setLocalTitel(e.target.value)}
        onBlur={commitTitel}
        onKeyDown={(e) => {
          if (e.key === 'Enter') titelRef.current?.blur()
        }}
        placeholder="Titel hinzufügen"
      />
    </div>
  )
}
