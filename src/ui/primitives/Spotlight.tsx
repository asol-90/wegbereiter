/**
 * Spotlight — global ⌘K command palette.
 *
 * Dumb/controlled: consumer owns `open`, `query`, and the currently-filtered
 * `items`. The component handles rendering, keyboard navigation, and selection.
 */
import {type ReactNode, useCallback, useEffect, useRef, useState,} from 'react'
import clsx from '../utils/clsx'
import {Icon, type IconName} from './Icon'
import {Kbd} from './Kbd'
import styles from './Spotlight.module.css'

export type SpotlightItem = {
  id: string
  label: ReactNode
  description?: ReactNode
  section?: string
  icon?: IconName
  shortcut?: string
  /** Optional trailing element (e.g. chevron for drill-down). */
  trailing?: ReactNode
  onSelect: () => void
}

export type SpotlightProps = {
  open: boolean
  onClose: () => void
  query: string
  onQueryChange: (query: string) => void
  items: SpotlightItem[]
  placeholder?: string
  emptyState?: ReactNode
}

export function Spotlight({
  open,
  onClose,
  query,
  onQueryChange,
  items,
  placeholder = 'Suchen oder Befehl eingeben…',
  emptyState,
}: SpotlightProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setActiveIdx(0)
  }, [query, items.length])

  const select = useCallback(
    (item: SpotlightItem) => {
      item.onSelect()
    },
    [],
  )

  useEffect(() => {
    if (!open) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIdx((i) => (items.length ? (i + 1) % items.length : 0))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIdx((i) =>
          items.length ? (i - 1 + items.length) % items.length : 0,
        )
      } else if (e.key === 'Enter') {
        const item = items[activeIdx]
        if (item) {
          e.preventDefault()
          select(item)
        }
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, items, activeIdx, onClose, select])

  if (!open) return null

  // Group by section while preserving order.
  const groups: { title?: string; items: SpotlightItem[] }[] = []
  let currentTitle: string | undefined = undefined
  for (const item of items) {
    if (!groups.length || item.section !== currentTitle) {
      currentTitle = item.section
      groups.push({ title: item.section, items: [item] })
    } else {
      groups[groups.length - 1]!.items.push(item)
    }
  }

  let runningIdx = 0

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.panel}
        onMouseDown={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Spotlight-Suche"
      >
        <div className={styles.searchRow}>
          <Icon name="search" size={14} className={styles.searchIcon} />
          <input
            ref={inputRef}
            className={styles.search}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={placeholder}
            autoComplete="off"
            spellCheck={false}
          />
          <Kbd keys="Esc" />
        </div>

        <div className={styles.list}>
          {items.length === 0 && (
            <div className={styles.empty}>
              {emptyState ?? 'Keine Treffer.'}
            </div>
          )}
          {groups.map((g, gi) => (
            <div key={`${g.title ?? 'section'}-${gi}`} className={styles.group}>
              {g.title && <div className={styles.groupTitle}>{g.title}</div>}
              {g.items.map((item) => {
                const idx = runningIdx++
                const active = idx === activeIdx
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={clsx(styles.item, active && styles.active)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => select(item)}
                  >
                    {item.icon && <Icon name={item.icon} size={14} />}
                    <span className={styles.labelCol}>
                      <span className={styles.label}>{item.label}</span>
                      {item.description && (
                        <span className={styles.desc}>{item.description}</span>
                      )}
                    </span>
                    {item.shortcut && <Kbd keys={item.shortcut} />}
                    {item.trailing}
                  </button>
                )
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
