/**
 * IconToggle — two-state icon button. Unlike the Toggle switch (which is
 * semantically a checkbox), this is a pressable button whose *visual* state
 * is conveyed by swapping the icon (and optionally the color).
 *
 * Primary use: Treffen "Fixieren" mit Kette offen/zu.
 */
import type {ButtonHTMLAttributes} from 'react'
import clsx from '../utils/clsx'
import {Icon, type IconName} from './Icon'
import styles from './IconToggle.module.css'

export type IconToggleProps = {
  pressed: boolean
  onPressedChange: (pressed: boolean) => void
  iconPressed: IconName
  iconUnpressed: IconName
  label: string
  /** Optional override of the tooltip text when pressed/unpressed. */
  labelPressed?: string
  labelUnpressed?: string
  size?: number
  sizeVariant?: 'sm' | 'md'
  /** Accent color when pressed. Default uses --t1. */
  tone?: 'default' | 'accent'
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'>

export function IconToggle({
  pressed,
  onPressedChange,
  iconPressed,
  iconUnpressed,
  label,
  labelPressed,
  labelUnpressed,
  size = 14,
  sizeVariant = 'md',
  tone = 'default',
  className,
  ...rest
}: IconToggleProps) {
  const shown = pressed
    ? (labelPressed ?? label)
    : (labelUnpressed ?? label)
  return (
    <button
      type="button"
      role="switch"
      aria-checked={pressed}
      aria-label={shown}
      title={shown}
      onClick={() => onPressedChange(!pressed)}
      className={clsx(
        styles.btn,
        styles[`s-${sizeVariant}`],
        styles[`t-${tone}`],
        pressed && styles.pressed,
        className,
      )}
      {...rest}
    >
      <Icon name={pressed ? iconPressed : iconUnpressed} size={size} />
    </button>
  )
}
