/**
 * SegmentedControl — inline toggle between a small set of mutually-exclusive
 * options. Used e.g. to switch kalender view (Monat/Woche/Liste).
 */
import clsx from '../utils/clsx'
import {Icon, type IconName} from './Icon'
import styles from './SegmentedControl.module.css'

export type SegmentedOption<T extends string> = {
  value: T
  label?: string
  icon?: IconName
  ariaLabel?: string
}

export type SegmentedControlProps<T extends string> = {
  options: SegmentedOption<T>[]
  value: T
  onValueChange: (value: T) => void
  sizeVariant?: 'sm' | 'md'
  ariaLabel?: string
  className?: string
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onValueChange,
  sizeVariant = 'md',
  ariaLabel,
  className,
}: SegmentedControlProps<T>) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={clsx(styles.group, styles[`s-${sizeVariant}`], className)}
    >
      {options.map((opt) => {
        const selected = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={opt.ariaLabel ?? opt.label}
            className={clsx(styles.seg, selected && styles.active)}
            onClick={() => onValueChange(opt.value)}
          >
            {opt.icon && <Icon name={opt.icon} size={14} />}
            {opt.label && <span>{opt.label}</span>}
          </button>
        )
      })}
    </div>
  )
}
