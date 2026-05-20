import { PersonSimpleRun, Sparkle, Cross, UsersThree, type Icon } from '@phosphor-icons/react'
import { WB_CSS_VAR, WB_KEYS, WB_LABELS, type WBKey, type WBTag } from '@/domain/wb'
import styles from './WBIconStack.module.css'

const WB_ICON: Record<WBKey, Icon> = {
  koerperlich: PersonSimpleRun,
  gesellschaftlich: UsersThree,
  geistig: Sparkle,
  geistlich: Cross,
}

function intensityToOpacity(intensity: number): number {
  if (intensity <= 0) return 0.15
  return 0.3 + Math.min(intensity, 1) * 0.7
}

/**
 * Maps a continuous intensity [0..1] to 3 dot states across 6 visual levels:
 * ○○○ → ◐○○ → ●○○ → ●◐○ → ●●○ → ●●◐ → ●●●
 */
function intensityToDots(intensity: number): ('full' | 'half' | 'empty')[] {
  const level = Math.min(6, Math.round(Math.min(intensity, 1) * 6))
  return [
    level >= 2 ? 'full' : level >= 1 ? 'half' : 'empty',
    level >= 4 ? 'full' : level >= 3 ? 'half' : 'empty',
    level >= 6 ? 'full' : level >= 5 ? 'half' : 'empty',
  ]
}

export type WBIconItemProps = {
  wb: WBKey
  intensity?: number
  iconSize?: number
}

export function WBIconItem({ wb, intensity = 0, iconSize = 16 }: WBIconItemProps) {
  const opacity = intensityToOpacity(intensity)
  const dots = intensityToDots(intensity)
  const Ic = WB_ICON[wb]
  const colorVar = `var(${WB_CSS_VAR[wb]})`

  return (
    <div className={styles.stack} title={WB_LABELS[wb]}>
      <Ic size={iconSize} weight="duotone" style={{ color: colorVar, opacity }} />
      <div className={styles.dots}>
        {dots.map((state, i) => (
          <span
            key={i}
            className={styles.dot}
            style={
              state === 'full'
                ? { background: colorVar }
                : state === 'half'
                  ? {
                      background: `linear-gradient(90deg, ${colorVar} 50%, transparent 50%)`,
                      boxShadow: `inset 0 0 0 1.5px ${colorVar}`,
                    }
                  : { boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${colorVar} 50%, transparent)` }
            }
          />
        ))}
      </div>
    </div>
  )
}

export type WBToggleItemProps = {
  wb: WBKey
  selected: boolean
  disabled?: boolean
  /** Optional badge text shown in top-right (z.B. „H"/„N" für haupt-neben). */
  badge?: string
  onClick?: () => void
  iconSize?: number
  /** Horizontal (Icon links, Label rechts) oder vertikal (Icon oben, Label unten). */
  orientation?: 'horizontal' | 'vertical'
}

/** Toggle-Variante: anklickbarer Button mit Phosphor-Icon und WB-Label;
 *  bei selected erscheint eine farbige Outline + Hintergrund-Tinte. */
export function WBToggleItem({
  wb,
  selected,
  disabled,
  badge,
  onClick,
  iconSize = 18,
  orientation = 'horizontal',
}: WBToggleItemProps) {
  const Ic = WB_ICON[wb]
  const colorVar = `var(${WB_CSS_VAR[wb]})`
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      disabled={disabled}
      className={`${styles.toggle} ${orientation === 'vertical' ? styles.toggleVertical : styles.toggleHorizontal} ${selected ? styles.toggleSelected : ''}`}
      style={{ ['--wb-color' as string]: colorVar }}
      onClick={onClick}
    >
      <Ic size={iconSize} weight="duotone" style={{ color: colorVar }} />
      <span className={styles.toggleLabel}>{WB_LABELS[wb]}</span>
      {badge && <span className={styles.toggleBadge}>{badge}</span>}
    </button>
  )
}

export type WBIconStackProps = {
  tags: WBTag[]
  iconSize?: number
}

export function WBIconStack({ tags, iconSize = 16 }: WBIconStackProps) {
  const tagMap = new Map(tags.map((t) => [t.key, t.intensity]))
  return (
    <div className={styles.row}>
      {WB_KEYS.map((key) => (
        <WBIconItem key={key} wb={key} intensity={tagMap.get(key) ?? 0} iconSize={iconSize} />
      ))}
    </div>
  )
}
