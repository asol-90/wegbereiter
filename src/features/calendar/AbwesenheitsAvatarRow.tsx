/**
 * Avatar row at the top of AbwesenheitsSidebar.
 * Shows each team member as a clickable avatar with an inline edit popover
 * plus an "add member" affordance.
 */
import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { newId, type MitarbeiterId } from '@/domain/ids'
import type { Mitarbeiter } from '@/domain/types'
import { Avatar } from '@/ui/domain'
import { IconButton } from '@/ui/primitives'
import { PencilSimple } from '@phosphor-icons/react'
import clsx from '@/ui/utils/clsx'
import { ACCENT_HUE_SEQUENCE } from './abwesenheitsHelpers'
import { MemberPopover } from './MemberPopover'
import styles from './AbwesenheitsSidebar.module.css'

export type AvatarRowProps = {
  team: Mitarbeiter[]
  absentOnHoveredDate: Set<MitarbeiterId>
  onTeamUpdate?: (team: Mitarbeiter[]) => void
  onAbsenceCleanup?: (deletedMemberId: MitarbeiterId) => void
}

function AddMemberInput({
  team, onTeamUpdate, onCancel,
}: { team: Mitarbeiter[]; onTeamUpdate: (t: Mitarbeiter[]) => void; onCancel: () => void }) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function confirm() {
    const trimmed = name.trim()
    if (!trimmed) return
    const member: Mitarbeiter = {
      id: newId<MitarbeiterId>(),
      name: trimmed,
      accentHue: ACCENT_HUE_SEQUENCE[team.length % ACCENT_HUE_SEQUENCE.length],
    }
    onTeamUpdate([...team, member])
    setName('')
    onCancel()
  }

  return (
    <div className={styles.avatarAddInput}>
      <input
        ref={inputRef}
        autoFocus
        className={styles.memberInput}
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name"
        onKeyDown={(e) => {
          if (e.key === 'Enter') confirm()
          if (e.key === 'Escape') { setName(''); onCancel() }
        }}
        onBlur={() => { if (!name.trim()) onCancel() }}
      />
      {name.trim() && <IconButton icon="check" size={11} label="Bestätigen" onClick={confirm} />}
    </div>
  )
}

type AvatarSlotProps = {
  member: Mitarbeiter
  isHighlighted: boolean
  isEditing: boolean
  team: Mitarbeiter[]
  setEditingMemberId: Dispatch<SetStateAction<MitarbeiterId | null>>
  onTeamUpdate?: (team: Mitarbeiter[]) => void
  onAbsenceCleanup?: (deletedMemberId: MitarbeiterId) => void
}

function AvatarSlot({
  member, isHighlighted, isEditing, team, setEditingMemberId, onTeamUpdate, onAbsenceCleanup,
}: AvatarSlotProps) {
  return (
    <div className={clsx(styles.avatarSlot, isHighlighted && styles.highlighted)}>
      {onTeamUpdate ? (
        <button
          type="button"
          className={styles.avatarBtn}
          data-member-anchor={member.id}
          onClick={() => setEditingMemberId((prev) => prev === member.id ? null : member.id)}
          title={member.name}
        >
          <Avatar name={member.name} initials={member.initials} hue={member.accentHue} size={26} />
          <span className={styles.avatarEditBadge} aria-hidden="true">
            <PencilSimple size={9} weight="bold" />
          </span>
        </button>
      ) : (
        <Avatar name={member.name} initials={member.initials} hue={member.accentHue} size={26} />
      )}
      {isEditing && onTeamUpdate && (
        <MemberPopover
          member={member}
          canDelete={team.length > 1}
          onSave={(updated) => onTeamUpdate(team.map((m) => m.id === updated.id ? updated : m))}
          onDelete={() => {
            if (team.length > 1) {
              onTeamUpdate(team.filter((m) => m.id !== member.id))
              onAbsenceCleanup?.(member.id)
              setEditingMemberId(null)
            }
          }}
          onClose={() => setEditingMemberId(null)}
        />
      )}
    </div>
  )
}

export function AbwesenheitsAvatarRow({
  team, absentOnHoveredDate, onTeamUpdate, onAbsenceCleanup,
}: AvatarRowProps) {
  const [addingMember, setAddingMember] = useState(false)
  const [editingMemberId, setEditingMemberId] = useState<MitarbeiterId | null>(null)
  return (
    <div className={styles.avatarRow}>
      {team.map((m) => (
        <AvatarSlot
          key={m.id} member={m}
          isHighlighted={absentOnHoveredDate.has(m.id)}
          isEditing={editingMemberId === m.id}
          team={team}
          setEditingMemberId={setEditingMemberId}
          onTeamUpdate={onTeamUpdate}
          onAbsenceCleanup={onAbsenceCleanup}
        />
      ))}
      {onTeamUpdate && !addingMember && (
        <div className={styles.avatarAddSlot}>
          <IconButton icon="plus" size={12} label="Teammitglied hinzufügen"
            onClick={() => setAddingMember(true)} />
        </div>
      )}
      {onTeamUpdate && addingMember && (
        <AddMemberInput team={team} onTeamUpdate={onTeamUpdate} onCancel={() => setAddingMember(false)} />
      )}
    </div>
  )
}
