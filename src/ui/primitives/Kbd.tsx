/**
 * Kbd — renders a keyboard shortcut hint, e.g. ⌘K or "Esc".
 * Accepts either a string of keys separated by "+" or explicit children.
 */
import type { HTMLAttributes } from 'react'
import clsx from '../utils/clsx'
import styles from './Kbd.module.css'

export type KbdProps = {
  keys?: string
} & HTMLAttributes<HTMLSpanElement>

export function Kbd({ keys, children, className, ...rest }: KbdProps) {
  const parts = keys ? keys.split('+').map((k) => k.trim()) : null
  return (
    <span className={clsx(styles.kbd, className)} {...rest}>
      {parts
        ? parts.map((k, i) => (
            <kbd key={`${k}-${i}`} className={styles.key}>
              {k}
            </kbd>
          ))
        : children}
    </span>
  )
}
