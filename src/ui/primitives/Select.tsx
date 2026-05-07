/**
 * Select — native <select> with custom styling that matches Input.
 */
import type { SelectHTMLAttributes } from 'react'
import clsx from '../utils/clsx'
import { Icon } from './Icon'
import styles from './Select.module.css'

export type SelectOption<T extends string> = {
  value: T
  label: string
  disabled?: boolean
}

export type SelectProps<T extends string> = {
  label?: string
  hint?: string
  error?: string
  options: SelectOption<T>[]
  value: T
  onValueChange: (value: T) => void
  sizeVariant?: 'sm' | 'md'
} & Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange'>

export function Select<T extends string>({
  label,
  hint,
  error,
  options,
  value,
  onValueChange,
  sizeVariant = 'md',
  className,
  id,
  name,
  ...rest
}: SelectProps<T>) {
  const htmlId = id ?? name
  return (
    <label className={clsx(styles.wrap, className)} htmlFor={htmlId}>
      {label && <span className={styles.label}>{label}</span>}
      <span className={styles.selectWrap}>
        <select
          id={htmlId}
          name={name}
          value={value}
          onChange={(e) => onValueChange(e.target.value as T)}
          className={clsx(
            styles.select,
            styles[`s-${sizeVariant}`],
            error && styles.err,
          )}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={opt.disabled}>
              {opt.label}
            </option>
          ))}
        </select>
        <Icon name="chevron-down" size={12} className={styles.chev} />
      </span>
      <span
        className={clsx(
          styles.foot,
          error ? styles.errText : hint ? styles.hint : styles.footEmpty,
        )}
      >
        {error ?? hint ?? '\u00A0'}
      </span>
    </label>
  )
}
