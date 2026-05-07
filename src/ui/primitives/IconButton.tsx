/**
 * IconButton — circular or square button with only an icon. Used for
 * settings buttons, closing modals, delete × on list items.
 */
import type { ButtonHTMLAttributes } from 'react'
import clsx from '../utils/clsx'
import { Icon, type IconName } from './Icon'
import styles from './IconButton.module.css'

export type IconButtonProps = {
  icon: IconName
  size?: number
  label: string
  tone?: 'default' | 'danger'
  shape?: 'circle' | 'square'
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function IconButton({
  icon,
  size = 14,
  label,
  tone = 'default',
  shape = 'circle',
  className,
  ...rest
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={clsx(
        styles.btn,
        styles[`t-${tone}`],
        styles[`sh-${shape}`],
        className,
      )}
      {...rest}
    >
      <Icon name={icon} size={size} />
    </button>
  )
}
