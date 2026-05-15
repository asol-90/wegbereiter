import { PersonSimpleRun, Sparkle, Cross, UsersThree, type Icon } from '@phosphor-icons/react'
import { WB_CSS_VAR, WB_KEYS, WB_LABELS, WB_STEPS, type WBKey, type WBTag } from '@/domain/wb'
import styles from './WBIconRow.module.css'

const WB_ICON: Record<WBKey, Icon> = {
  koerperlich: PersonSimpleRun,
  gesellschaftlich: UsersThree,
  geistig: Sparkle,
  geistlich: Cross,
}

function intensityToOpacity(intensity: number): number {
  if (intensity <= 0) return 0.15
  if (intensity <= 0.33) return 0.4
  if (intensity <= 0.66) return 0.7
  return 1.0
}

function nextStep(current: number): number {
  const idx = WB_STEPS.findIndex((s) => s.value === current)
  return WB_STEPS[(idx + 1) % WB_STEPS.length].value
}

export type WBIconRowProps = {
  tags: WBTag[]
  size?: number
  /** When provided, icons become clickable and cycle through intensities. */
  onChange?: (tags: WBTag[]) => void
}

export function WBIconRow({ tags, size = 18, onChange }: WBIconRowProps) {
  const tagMap = new Map(tags.map((t) => [t.key, t.intensity]))

  function handleClick(key: WBKey) {
    if (!onChange) return
    const current = tagMap.get(key) ?? 0
    const next = nextStep(current)
    const updated = tags.filter((t) => t.key !== key)
    if (next > 0) updated.push({ key, intensity: next })
    onChange(updated)
  }

  return (
    <div className={styles.row}>
      {WB_KEYS.map((key) => {
        const intensity = tagMap.get(key) ?? 0
        const opacity = intensityToOpacity(intensity)
        const Icon = WB_ICON[key]
        const label = WB_LABELS[key]
        const stepLabel = WB_STEPS.find((s) => s.value === intensity)?.label ?? '–'
        return (
          <span
            key={key}
            className={styles.icon}
            data-interactive={onChange ? true : undefined}
            style={{ opacity, color: `var(${WB_CSS_VAR[key]})` }}
            onClick={onChange ? () => handleClick(key) : undefined}
            title={`${label}: ${stepLabel}`}
            aria-label={`${label}: ${stepLabel}`}
            role={onChange ? 'button' : undefined}
            tabIndex={onChange ? 0 : undefined}
            onKeyDown={
              onChange
                ? (e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault()
                      handleClick(key)
                    }
                  }
                : undefined
            }
          >
            <Icon size={size} weight="regular" color="currentColor" />
          </span>
        )
      })}
    </div>
  )
}
