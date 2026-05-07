/**
 * Chip — small labeled pill, used for tags, filters, WB-Chips.
 * Supports optional leading icon/dot, trailing remove button, and selected state.
 */
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import clsx from '../utils/clsx'
import { Icon, type IconName } from './Icon'
import styles from './Chip.module.css'

type CommonProps = {
  children: ReactNode
  icon?: IconName
  leading?: ReactNode
  onRemove?: () => void
  selected?: boolean
  tone?: 'default' | 'accent' | 'ok' | 'warn' | 'err'
  sizeVariant?: 'sm' | 'md'
}

export type ChipProps = CommonProps &
  (
    | ({ as?: 'span' } & Omit<HTMLAttributes<HTMLSpanElement>, 'children'>)
    | ({ as: 'button' } & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>)
  )

export function Chip(props: ChipProps) {
  const {
    children,
    icon,
    leading,
    onRemove,
    selected,
    tone = 'default',
    sizeVariant = 'md',
    className,
    as = 'span',
    ...rest
  } = props as CommonProps & { as?: 'span' | 'button'; className?: string }

  const cls = clsx(
    styles.chip,
    styles[`t-${tone}`],
    styles[`s-${sizeVariant}`],
    selected && styles.selected,
    (as === 'button' || onRemove) && styles.interactive,
    className,
  )

  const content = (
    <>
      {leading && <span className={styles.leading}>{leading}</span>}
      {icon && !leading && <Icon name={icon} size={12} />}
      <span className={styles.label}>{children}</span>
      {onRemove && (
        <button
          type="button"
          aria-label="Entfernen"
          className={styles.remove}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <Icon name="x" size={10} />
        </button>
      )}
    </>
  )

  if (as === 'button') {
    return (
      <button
        type="button"
        className={cls}
        aria-pressed={selected}
        {...(rest as ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    )
  }

  return (
    <span className={cls} {...(rest as HTMLAttributes<HTMLSpanElement>)}>
      {content}
    </span>
  )
}
