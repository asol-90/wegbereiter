/**
 * Team chips + inline "Name hinzufügen" input in WizardStep1Team.
 */
import type { Mitarbeiter } from '@/domain/types'
import type { MitarbeiterId } from '@/domain/ids'
import styles from './NewPlanungWizard.module.css'

export type TeamSectionProps = {
  team: Mitarbeiter[]
  newTeamName: string
  setNewTeamName: (n: string) => void
  addTeamMember: (name: string) => void
  removeTeamMember: (id: MitarbeiterId) => void
  teamWarn: boolean
}

export function WizardStep1TeamSection({
  team, newTeamName, setNewTeamName, addTeamMember, removeTeamMember, teamWarn,
}: TeamSectionProps) {
  return (
    <div className={styles.teamSection}>
      <span className={styles.kontextSectionLabel}>Mitarbeiter</span>
      <p className={`${styles.teamHint} ${teamWarn ? styles.teamHintWarn : ''}`}>
        Mindestens einen Mitarbeiter hinzufügen.
      </p>
      <div className={`${styles.teamChips} ${teamWarn ? styles.teamChipsWarn : ''}`}>
        {team.map((member) => (
          <div key={member.id} className={styles.teamChip}>
            <div className={styles.teamAvatar}
              style={{ backgroundColor: `hsl(${member.accentHue ?? 0}, 70%, 50%)` }}>
              {member.initials}
            </div>
            <span>{member.name}</span>
            <button type="button" className={styles.teamRemove}
              onClick={() => removeTeamMember(member.id)} title="Entfernen">
              ×
            </button>
          </div>
        ))}
        <input
          type="text"
          className={styles.teamInlineInput}
          placeholder="Name hinzufügen…"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && newTeamName.trim()) {
              e.preventDefault()
              addTeamMember(newTeamName)
            }
          }}
        />
      </div>
    </div>
  )
}
