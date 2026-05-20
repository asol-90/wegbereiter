/**
 * Avatar — circular initials badge for team members. Color is derived
 * deterministically from the name so the same person always gets the same tint.
 */
import type {HTMLAttributes} from 'react'
import clsx from '../utils/clsx'
import styles from './Avatar.module.css'

export type AvatarProps = {
  name: string
  size?: number
  initials?: string
  tone?: 'auto' | 'brand' | 'muted'
  /** Optional HSL-Hue (0..360). Wird verwendet, statt aus dem Namen zu hashen. */
  hue?: number
} & Omit<HTMLAttributes<HTMLSpanElement>, 'color'>

const PALETTE = [
  'var(--wb-k)',
  'var(--wb-g)',
  'var(--wb-i)',
  'var(--wb-s)',
  'var(--acc)',
]

function hash(input: string): number {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0
  }
  return Math.abs(h)
}

function deriveInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[parts.length - 1]![0]!).toUpperCase()
}

export function Avatar({
  name,
  size = 24,
  initials,
  tone = 'auto',
  hue,
  className,
  style,
  ...rest
}: AvatarProps) {
  const text = initials ?? deriveInitials(name)
  const color =
    tone === 'muted'
      ? 'var(--t3)'
      : tone === 'brand'
        ? 'var(--acc)'
        : hue != null
          ? `hsl(${hue}, 55%, 45%)`
          : PALETTE[hash(name) % PALETTE.length]
  const background = hue != null
    ? `hsl(${hue}, 55%, 82%)`
    : `color-mix(in srgb, ${color} 18%, var(--bg2))`
  return (
    <span
      className={clsx(styles.avatar, className)}
      title={name}
      aria-label={name}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(9, Math.round(size * 0.42)),
        background,
        color,
        ...style,
      }}
      {...rest}
    >
      {text}
    </span>
  )
}
