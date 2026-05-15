/**
 * AccordionGroup — stack of Accordion items with optional exclusive mode.
 * In 'exclusive' mode only one item can be open at a time (for the right-hand
 * Kontextleiste below the WB area). In 'multi' mode all items are independent.
 */
import {type ReactNode, useCallback, useState} from 'react'
import clsx from '../utils/clsx'
import {Accordion} from './Accordion'
import styles from './AccordionGroup.module.css'

export type AccordionGroupItem = {
  id: string
  title: ReactNode
  trailing?: ReactNode
  children: ReactNode
}

export type AccordionGroupProps = {
  items: AccordionGroupItem[]
  mode?: 'exclusive' | 'multi'
  /** Initially open id(s). For exclusive: single id. For multi: array. */
  defaultOpen?: string | string[]
  /** Optional controlled variant. */
  openIds?: string[]
  onOpenChange?: (openIds: string[]) => void
  className?: string
}

export function AccordionGroup({
  items,
  mode = 'multi',
  defaultOpen,
  openIds,
  onOpenChange,
  className,
}: AccordionGroupProps) {
  const initial: string[] =
    openIds ??
    (Array.isArray(defaultOpen)
      ? defaultOpen
      : defaultOpen
        ? [defaultOpen]
        : [])
  const [internal, setInternal] = useState<string[]>(initial)
  const current = openIds ?? internal

  const setOpen = useCallback(
    (id: string, open: boolean) => {
      let next: string[]
      if (mode === 'exclusive') {
        next = open ? [id] : []
      } else {
        next = open
          ? Array.from(new Set([...current, id]))
          : current.filter((v) => v !== id)
      }
      if (openIds === undefined) setInternal(next)
      onOpenChange?.(next)
    },
    [mode, current, openIds, onOpenChange],
  )

  return (
    <div className={clsx(styles.group, className)}>
      {items.map((item) => (
        <Accordion
          key={item.id}
          title={item.title}
          trailing={item.trailing}
          open={current.includes(item.id)}
          onOpenChange={(open) => setOpen(item.id, open)}
        >
          {item.children}
        </Accordion>
      ))}
    </div>
  )
}
