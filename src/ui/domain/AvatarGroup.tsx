/**
 * AvatarGroup — overlapping row of Avatars with optional overflow counter.
 */
import clsx from '../utils/clsx'
import { Avatar } from './Avatar'
import styles from './AvatarGroup.module.css'

export type AvatarGroupProps = {
  names: string[]
  max?: number
  size?: number
  className?: string
}

export function AvatarGroup({
  names,
  max = 4,
  size = 24,
  className,
}: AvatarGroupProps) {
  const visible = names.slice(0, max)
  const overflow = names.length - visible.length
  const overlap = Math.round(size * 0.35)
  return (
    <span
      className={clsx(styles.group, className)}
      style={{ gap: -overlap }}
    >
      {visible.map((name, i) => (
        <Avatar
          key={`${name}-${i}`}
          name={name}
          size={size}
          style={{ zIndex: max - i }}
        />
      ))}
      {overflow > 0 && (
        <span
          className={styles.more}
          style={{
            width: size,
            height: size,
            fontSize: Math.max(9, Math.round(size * 0.4)),
          }}
          title={names.slice(max).join(', ')}
        >
          +{overflow}
        </span>
      )}
    </span>
  )
}
