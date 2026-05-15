/**
 * Button — primary interactive control.
 *
 * variants:
 *  - 'primary': acc-color solid button (e.g. "Planung starten")
 *  - 'secondary': bg2 subtle button (e.g. Wizard "Zurück")
 *  - 'ghost': transparent, hover-bg (e.g. "Neu anlegen" rows)
 *  - 'danger': red, used in confirm dialogs
 *  - 'dashed': dashed border (e.g. "+ Mitarbeiter")
 *
 * sizes: sm, md (default), lg
 */
import type {ButtonHTMLAttributes, ReactNode} from 'react'
import clsx from '../utils/clsx'
import styles from './Button.module.css'
import {Icon, type IconName} from './Icon'

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dashed'
export type ButtonSize = 'sm' | 'md' | 'lg'

export type ButtonProps = {
  variant?: ButtonVariant
  size?: ButtonSize
  icon?: IconName
  iconRight?: IconName
  fullWidth?: boolean
  loading?: boolean
  children?: ReactNode
} & ButtonHTMLAttributes<HTMLButtonElement>

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  iconRight,
  fullWidth,
  loading,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={clsx(
        styles.btn,
        styles[`v-${variant}`],
        styles[`s-${size}`],
        fullWidth && styles.full,
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {icon && <Icon name={icon} size={size === 'sm' ? 12 : 14} />}
      {children && <span className={styles.label}>{children}</span>}
      {iconRight && <Icon name={iconRight} size={size === 'sm' ? 12 : 14} />}
    </button>
  )
}
