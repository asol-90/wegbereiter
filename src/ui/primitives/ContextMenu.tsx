/**
 * ContextMenu — floating menu, positioned relative to an anchor rect or event.
 * The consumer controls open state and anchor position. Closes on outside
 * click, Escape, or item selection.
 */
import {type ReactNode, useCallback, useEffect, useMemo, useRef,} from 'react'
import clsx from '../utils/clsx'
import styles from './ContextMenu.module.css'
import {Icon, type IconName} from './Icon'

export type MenuItem = {
  id: string
  label: ReactNode
  icon?: IconName
  shortcut?: string
  tone?: 'default' | 'danger'
  disabled?: boolean
  onSelect: () => void
}

export type MenuSection = {
  id: string
  title?: string
  items: MenuItem[]
}

export type ContextMenuProps = {
  open: boolean
  onClose: () => void
  /** Position in viewport coordinates where the menu top-left should anchor. */
  position: { x: number; y: number } | null
  sections: MenuSection[]
  minWidth?: number
  className?: string
}

export function ContextMenu({
  open,
  onClose,
  position,
  sections,
  minWidth = 180,
  className,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleClick = (e: MouseEvent) => {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) onClose()
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // delay one tick so the opening click doesn't immediately close it
    const raf = requestAnimationFrame(() => {
      document.addEventListener('mousedown', handleClick)
    })
    document.addEventListener('keydown', handleKey)
    return () => {
      cancelAnimationFrame(raf)
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  const style = useMemo(() => {
    if (!position) return { display: 'none' as const }
    return {
      position: 'fixed' as const,
      top: position.y,
      left: position.x,
      minWidth,
    }
  }, [position, minWidth])

  const handleSelect = useCallback(
    (item: MenuItem) => {
      if (item.disabled) return
      item.onSelect()
      onClose()
    },
    [onClose],
  )

  if (!open || !position) return null

  return (
    <div
      ref={ref}
      role="menu"
      className={clsx(styles.menu, className)}
      style={style}
    >
      {sections.map((section, sIdx) => (
        <div key={section.id} className={styles.section}>
          {section.title && (
            <div className={styles.sectionTitle}>{section.title}</div>
          )}
          {section.items.map((item) => (
            <button
              key={item.id}
              role="menuitem"
              type="button"
              disabled={item.disabled}
              onClick={() => handleSelect(item)}
              className={clsx(
                styles.item,
                item.tone === 'danger' && styles.danger,
              )}
            >
              {item.icon && <Icon name={item.icon} size={14} />}
              <span className={styles.label}>{item.label}</span>
              {item.shortcut && (
                <span className={styles.shortcut}>{item.shortcut}</span>
              )}
            </button>
          ))}
          {sIdx < sections.length - 1 && <div className={styles.divider} />}
        </div>
      ))}
    </div>
  )
}
