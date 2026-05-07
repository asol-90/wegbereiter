/**
 * DragHandle — a small grip icon used for drag-sortable list rows.
 * Renders only the visual; wire it into @dnd-kit's listeners at the
 * call site.
 */
import type { HTMLAttributes } from 'react'
import clsx from '../utils/clsx'
import { Icon } from '../primitives/Icon'
import styles from './DragHandle.module.css'

export type DragHandleProps = {
  size?: number
  ariaLabel?: string
} & HTMLAttributes<HTMLSpanElement>

export function DragHandle({
  size = 14,
  ariaLabel = 'Ziehen zum Umsortieren',
  className,
  ...rest
}: DragHandleProps) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      className={clsx(styles.handle, className)}
      {...rest}
    >
      <Icon name="drag-handle" size={size} />
    </span>
  )
}
