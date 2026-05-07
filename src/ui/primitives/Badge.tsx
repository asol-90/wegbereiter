/**
 * Badge — small, non-interactive status label. Used for counts, statuses
 * ("Entwurf"/"Aktiv"/"Archiviert"), and contextual flags.
 */
import type { HTMLAttributes, ReactNode } from 'react'
import clsx from '../utils/clsx'
import styles from './Badge.module.css'

export type BadgeProps = {
  children: ReactNode
  tone?: 'neutral' | 'accent' | 'ok' | 'warn' | 'err' | 'muted'
  variant?: 'soft' | 'outline' | 'solid'
  sizeVariant?: 'sm' | 'md'
} & HTMLAttributes<HTMLSpanElement>

export function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  sizeVariant = 'sm',
  className,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={clsx(
        styles.badge,
        styles[`t-${tone}`],
        styles[`v-${variant}`],
        styles[`s-${sizeVariant}`],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  )
}
