/**
 * Footer — app-shell footer with centered Legend and settings button.
 *
 * The Legend provides a visual color key for the organizational hierarchy:
 * Distrikt and Region (denim-blue), Bundesland (ferien/holiday color),
 * Stamm (forest green), Teilstamm (forest green), Team (planning purple).
 * Distrikt, Region, and Stamm are hard-coded constants for this Stamm.
 */
import {BUNDESLAND_LABELS} from '@/domain/types'
import {useGlobalConfig} from '@/features/globalConfig'
import {IconButton} from '@/ui/primitives'
import {useState} from 'react'
import styles from './Footer.module.css'
import {SettingsModal} from './SettingsModal'

const DISTRIKT = 'Distrikt Ost'
const REGION = 'O3'
const STAMM = 'Stamm 642'

type ChipColor = 'denim' | 'ferien' | 'stamm' | 'planung'

function LegendChip({ color, label }: { color: ChipColor; label: string }) {
  return (
    <span className={styles.chip}>
      <span className={styles.pill} data-color={color} />
      <span className={styles.chipLabel}>{label}</span>
    </span>
  )
}

export function Footer() {
  const { config } = useGlobalConfig()
  const [settingsOpen, setSettingsOpen] = useState(false)

  const bundeslandLabel = config.bundesland
    ? BUNDESLAND_LABELS[config.bundesland]
    : null

  return (
    <div className={styles.root}>
      <div className={styles.legend}>
        <LegendChip color="denim" label={DISTRIKT} />
        <LegendChip color="denim" label={`Region ${REGION}`} />
        {bundeslandLabel && <LegendChip color="ferien" label={bundeslandLabel} />}
        <LegendChip color="stamm" label={STAMM} />
        {config.teilstamm && <LegendChip color="stamm" label={config.teilstamm} />}
        {config.teamname && <LegendChip color="planung" label={config.teamname} />}
      </div>
      <div className={styles.settingsBtn}>
        <IconButton
          icon="settings"
          label="Einstellungen"
          size={16}
          onClick={() => setSettingsOpen(true)}
        />
      </div>
      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
    </div>
  )
}
