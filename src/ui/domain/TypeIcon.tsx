/**
 * TypeIcon — small badge showing the *type* of a Treffen or Programmpunkt.
 * Purely decorative icon; consumers should still supply a visible label.
 */
import type {ProgrammpunktKind, TreffenKind} from '@/domain/types'
import type {HTMLAttributes} from 'react'
import {Icon, type IconName} from '../primitives/Icon'
import clsx from '../utils/clsx'
import styles from './TypeIcon.module.css'

export type TypeIconKind =
  | { kind: 'treffen'; value: TreffenKind }
  | { kind: 'programmpunkt'; value: ProgrammpunktKind }
  | { kind: 'andacht' }
  | { kind: 'stamm' }

const TREFFEN_ICON: Record<TreffenKind, IconName> = {
  'regulaer': 'calendar',
  'extra-geplant': 'plus',
  'extra-aktion': 'users',
}

const TREFFEN_LABEL: Record<TreffenKind, string> = {
  'regulaer': 'Reguläres Treffen',
  'extra-geplant': 'Zusatztreffen',
  'extra-aktion': 'Stamm-Aktion',
}

const PROGRAMM_ICON: Record<ProgrammpunktKind, IconName> = {
  'konkret': 'note',
  'abstrakt': 'layers',
  'wegezeit': 'clock',
}

const PROGRAMM_LABEL: Record<ProgrammpunktKind, string> = {
  'konkret': 'Aktivität',
  'abstrakt': 'Platzhalter',
  'wegezeit': 'Wegezeit',
}

export type TypeIconProps = {
  type: TypeIconKind
  size?: number
  tone?: 'muted' | 'accent'
  hideLabel?: boolean
} & Omit<HTMLAttributes<HTMLSpanElement>, 'title'>

export function TypeIcon({
  type,
  size = 12,
  tone = 'muted',
  hideLabel,
  className,
  ...rest
}: TypeIconProps) {
  let icon: IconName
  let label: string
  switch (type.kind) {
    case 'treffen':
      icon = TREFFEN_ICON[type.value]
      label = TREFFEN_LABEL[type.value]
      break
    case 'programmpunkt':
      icon = PROGRAMM_ICON[type.value]
      label = PROGRAMM_LABEL[type.value]
      break
    case 'andacht':
      icon = 'book'
      label = 'Andacht'
      break
    case 'stamm':
      icon = 'users'
      label = 'Stamm-Kontext'
      break
  }

  return (
    <span
      className={clsx(styles.wrap, styles[`t-${tone}`], className)}
      title={label}
      aria-label={hideLabel ? label : undefined}
      {...rest}
    >
      <Icon name={icon} size={size} />
      {!hideLabel && <span className={styles.label}>{label}</span>}
    </span>
  )
}
