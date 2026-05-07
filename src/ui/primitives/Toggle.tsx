/**
 * Toggle — accessible switch (checkbox semantics) with optional label.
 */
import type { InputHTMLAttributes, ReactNode } from 'react'
import clsx from '../utils/clsx'
import styles from './Toggle.module.css'

export type ToggleProps = {
  label?: ReactNode
  hint?: ReactNode
  sizeVariant?: 'sm' | 'md'
  checked: boolean
  onCheckedChange: (checked: boolean) => void
} & Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'checked' | 'onChange' | 'size'>

export function Toggle({
  label,
  hint,
  sizeVariant = 'md',
  checked,
  onCheckedChange,
  className,
  disabled,
  id,
  name,
  ...rest
}: ToggleProps) {
  const htmlId = id ?? name
  return (
    <label
      className={clsx(
        styles.wrap,
        styles[`s-${sizeVariant}`],
        disabled && styles.disabled,
        className,
      )}
      htmlFor={htmlId}
    >
      <input
        type="checkbox"
        role="switch"
        id={htmlId}
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onCheckedChange(e.target.checked)}
        className={styles.input}
        {...rest}
      />
      <span className={styles.track} aria-hidden>
        <span className={styles.thumb} />
      </span>
      {(label || hint) && (
        <span className={styles.text}>
          {label && <span className={styles.label}>{label}</span>}
          {hint && <span className={styles.hint}>{hint}</span>}
        </span>
      )}
    </label>
  )
}
