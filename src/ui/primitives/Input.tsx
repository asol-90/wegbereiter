/**
 * Input — labeled text/number/date input. Use `size="sm"` for inline contexts.
 */
import type { InputHTMLAttributes, ReactNode } from 'react'
import clsx from '../utils/clsx'
import styles from './Input.module.css'

export type InputProps = {
  label?: string
  hint?: string
  error?: string
  /** Placed right of the label area, e.g. a tag or clear button. */
  adornment?: ReactNode
  sizeVariant?: 'sm' | 'md'
  /** Suppress the foot area entirely (no reserved space for hint/error). */
  noFoot?: boolean
} & InputHTMLAttributes<HTMLInputElement>

export function Input({
  label,
  hint,
  error,
  adornment,
  sizeVariant = 'md',
  noFoot,
  className,
  id,
  ...rest
}: InputProps) {
  const htmlId = id ?? rest.name
  return (
    <label className={clsx(styles.wrap, className)} htmlFor={htmlId}>
      {(label || adornment) && (
        <span className={styles.labelRow}>
          {label && <span className={styles.label}>{label}</span>}
          {adornment && <span className={styles.adornment}>{adornment}</span>}
        </span>
      )}
      <input
        id={htmlId}
        className={clsx(
          styles.input,
          styles[`s-${sizeVariant}`],
          error && styles.err,
        )}
        {...rest}
      />
      {!noFoot && (
        <span
          className={clsx(
            styles.foot,
            error ? styles.errText : hint ? styles.hint : styles.footEmpty,
          )}
        >
          {error ?? hint ?? ' '}
        </span>
      )}
    </label>
  )
}
