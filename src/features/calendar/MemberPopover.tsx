/**
 * Inline popover for editing a single team member's name + accent color.
 * Closes (and saves on Enter / outside-click) — used in AbwesenheitsSidebar.
 */
import { useEffect, useRef, useState } from 'react'
import type { Mitarbeiter } from '@/domain/types'
import clsx from '@/ui/utils/clsx'
import { ACCENT_HUE_SEQUENCE } from './abwesenheitsHelpers'
import styles from './AbwesenheitsSidebar.module.css'

export type MemberPopoverProps = {
  member: Mitarbeiter
  canDelete: boolean
  onSave: (m: Mitarbeiter) => void
  onDelete: () => void
  onClose: () => void
}

function hasChanged(member: Mitarbeiter, name: string, hue: number): boolean {
  return name !== member.name || hue !== (member.accentHue ?? 0)
}

export function MemberPopover({ member, canDelete, onSave, onDelete, onClose }: MemberPopoverProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [name, setName] = useState(member.name)
  const [hue, setHue] = useState<number>(member.accentHue ?? 0)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (ref.current?.contains(target)) return
      if (target.closest(`[data-member-anchor="${member.id}"]`)) return
      const trimmed = name.trim()
      if (trimmed && hasChanged(member, trimmed, hue)) {
        onSave({ ...member, name: trimmed, accentHue: hue })
      }
      onClose()
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [name, hue, member, onSave, onClose])

  function commit() {
    const trimmed = name.trim()
    if (!trimmed) return onClose()
    if (hasChanged(member, trimmed, hue)) onSave({ ...member, name: trimmed, accentHue: hue })
    onClose()
  }

  return (
    <div ref={ref} className={styles.memberPopover} role="dialog" aria-label="Mitarbeiter bearbeiten">
      <input
        autoFocus
        className={styles.memberPopoverInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') onClose()
        }}
        placeholder="Name"
      />
      <div className={styles.memberPopoverHueRow}>
        {ACCENT_HUE_SEQUENCE.map((h) => (
          <button
            key={h}
            type="button"
            className={clsx(styles.memberPopoverHueDot, hue === h && styles.memberPopoverHueDotActive)}
            style={{ background: `hsl(${h}, 55%, 60%)` }}
            onClick={() => setHue(h)}
            aria-label={`Farbe ${h}°`}
            aria-pressed={hue === h}
          />
        ))}
      </div>
      <div className={styles.memberPopoverFooter}>
        <button
          type="button"
          className={styles.memberPopoverDelete}
          onClick={onDelete}
          disabled={!canDelete}
          title={canDelete ? 'Mitarbeiter entfernen' : 'Mindestens ein Mitarbeiter muss bleiben'}
        >
          Entfernen
        </button>
        <button type="button" className={styles.memberPopoverSave} onClick={commit}>
          Übernehmen
        </button>
      </div>
    </div>
  )
}
