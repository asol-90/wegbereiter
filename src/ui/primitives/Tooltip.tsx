/**
 * Tooltip — lightweight CSS-only hover/focus tooltip.
 * Wraps a single child and positions a small floating label above it.
 */
import {cloneElement, isValidElement, type ReactElement, type ReactNode, useId, useState,} from 'react'
import clsx from '../utils/clsx'
import styles from './Tooltip.module.css'

export type TooltipProps = {
  label: ReactNode
  children: ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
  disabled?: boolean
}

export function Tooltip({
  label,
  children,
  placement = 'top',
  disabled,
}: TooltipProps) {
  const id = useId()
  const [open, setOpen] = useState(false)

  if (disabled || !isValidElement(children)) return children

  const childProps = (children.props ?? {}) as {
    onMouseEnter?: (e: unknown) => void
    onMouseLeave?: (e: unknown) => void
    onFocus?: (e: unknown) => void
    onBlur?: (e: unknown) => void
    'aria-describedby'?: string
  }

  const clone = cloneElement(children, {
    onMouseEnter: (e: unknown) => {
      childProps.onMouseEnter?.(e)
      setOpen(true)
    },
    onMouseLeave: (e: unknown) => {
      childProps.onMouseLeave?.(e)
      setOpen(false)
    },
    onFocus: (e: unknown) => {
      childProps.onFocus?.(e)
      setOpen(true)
    },
    onBlur: (e: unknown) => {
      childProps.onBlur?.(e)
      setOpen(false)
    },
    'aria-describedby': id,
  } as Record<string, unknown>)

  return (
    <span className={styles.wrap}>
      {clone}
      <span
        id={id}
        role="tooltip"
        className={clsx(
          styles.tip,
          styles[`p-${placement}`],
          open && styles.open,
        )}
      >
        {label}
      </span>
    </span>
  )
}
