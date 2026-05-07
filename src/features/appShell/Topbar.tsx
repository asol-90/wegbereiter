/**
 * Topbar — the toolbar at the top of the AppShell. Contains the NavToggle,
 * the Repertoire button, a small meta area (Stamm-status / Bundesland), and
 * a settings cog.
 *
 * Keeping this a thin presentational component: it derives its state from
 * the URL via useNavPosition and delegates click targets to the toggle
 * children. No business logic here.
 */
import { useState } from 'react'
import { IconButton } from '@/ui/primitives'
import { BUNDESLAND_LABELS } from '@/domain/types'
import { useGlobalConfig } from '@/features/globalConfig'
import styles from './Topbar.module.css'
import { NavToggle } from './NavToggle'
import { RepertoireToggle } from './RepertoireToggle'
import { SettingsModal } from './SettingsModal'
import { useNavPosition } from './useNavPosition'

export function Topbar() {
  const nav = useNavPosition()
  const { config } = useGlobalConfig()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const bundeslandLabel = config.bundesland
    ? BUNDESLAND_LABELS[config.bundesland]
    : undefined

  return (
    <div className={styles.root}>
      <NavToggle position={nav.position} planungId={nav.planungId} />
      <RepertoireToggle active={nav.repertoireActive} />
      <span className={styles.spacer} />
      <span className={styles.meta}>
        {bundeslandLabel && (
          <span className={styles.metaLabel}>{bundeslandLabel}</span>
        )}
      </span>
      <IconButton
        icon="settings"
        label="Einstellungen"
        size={16}
        onClick={() => setSettingsOpen(true)}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
