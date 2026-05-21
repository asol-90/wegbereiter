/**
 * Icon — generic SVG renderer for the catalog in iconCatalog.
 *
 * Add new icons to iconCatalog (data only); this file stays the renderer.
 */
import type { SVGProps } from 'react'
import { ICONS, type IconName } from './iconCatalog'

export type { IconName } from './iconCatalog'

export type IconProps = {
  name: IconName
  size?: number | string
  strokeWidth?: number
  title?: string
} & Omit<SVGProps<SVGSVGElement>, 'children' | 'width' | 'height'>

export function Icon({
  name,
  size = 16,
  strokeWidth = 2,
  title,
  ...rest
}: IconProps) {
  const content = ICONS[name]
  if (!content) {
    if (import.meta.env.DEV) console.warn(`[Icon] unknown name: "${name}"`)
    return null
  }
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={!title || undefined}
      {...rest}
    >
      {content}
    </svg>
  )
}
