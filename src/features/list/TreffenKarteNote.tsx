/**
 * TreffenKarteNote — inline notiz editor (closed/open states).
 */
import { useCallback, useState } from 'react'
import { Icon } from '@/ui/primitives/Icon'
import clsx from '@/ui/utils/clsx'
import type { TreffenId } from '@/domain/ids'
import type { Treffen } from '@/domain/types'
import type { TreffenMutations } from './treffenKarteTypes'
import styles from './TreffenKarte.module.css'

export type TreffenKarteNoteProps = {
  treffen: Treffen
  tid: TreffenId
  mutations: TreffenMutations
}

export function TreffenKarteNote({ treffen, tid, mutations }: TreffenKarteNoteProps) {
  const [noteOpen, setNoteOpen] = useState(false)
  const [localNotiz, setLocalNotiz] = useState(treffen.notiz ?? '')

  const commitNotiz = useCallback(() => {
    const trimmed = localNotiz.trim()
    if (trimmed !== (treffen.notiz ?? '')) {
      mutations.setNotiz(tid, trimmed)
    }
  }, [localNotiz, treffen.notiz, mutations, tid])

  if (noteOpen) {
    return (
      <div className={styles.noteExpanded}>
        <Icon name="file" size={13} className={styles.noteIcon} />
        <textarea
          className={styles.noteTextarea}
          value={localNotiz}
          onChange={(e) => setLocalNotiz(e.target.value)}
          onBlur={() => {
            setNoteOpen(false)
            commitNotiz()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setLocalNotiz(treffen.notiz ?? '')
              setNoteOpen(false)
            }
          }}
          placeholder="Notiz hinzufügen"
          autoFocus
        />
      </div>
    )
  }

  return (
    <div
      className={styles.note}
      onClick={() => {
        setLocalNotiz(treffen.notiz ?? '')
        setNoteOpen(true)
      }}
    >
      <Icon name="file" size={13} className={styles.noteIcon} />
      <span
        className={clsx(styles.noteText, !treffen.notiz && styles.noteTextPlaceholder)}
      >
        {treffen.notiz || 'Notiz hinzufügen'}
      </span>
    </div>
  )
}
