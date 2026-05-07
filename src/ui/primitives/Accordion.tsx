/**
 * Accordion — expandable section using a native <details>/<summary>.
 *
 * Supports both uncontrolled (via `defaultOpen`) and controlled (via `open`
 * + `onOpenChange`) modes. In uncontrolled mode we set the initial state
 * via a mount effect and let the native element manage itself — passing
 * `open` on every render would fight the user's clicks. In controlled mode
 * we drive the element's `open` property in an effect whenever the prop
 * changes, so React never competes with the user inside the same frame.
 */
import {
  useCallback,
  useEffect,
  useRef,
  type DetailsHTMLAttributes,
  type ReactNode,
} from 'react'
import clsx from '../utils/clsx'
import { Icon } from './Icon'
import styles from './Accordion.module.css'

export type AccordionProps = {
  title: ReactNode
  /** Optional content right-aligned in the header row (e.g. chips, counts). */
  trailing?: ReactNode
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  children: ReactNode
} & Omit<DetailsHTMLAttributes<HTMLDetailsElement>, 'open' | 'title' | 'children'>

export function Accordion({
  title,
  trailing,
  defaultOpen,
  open,
  onOpenChange,
  children,
  className,
  ...rest
}: AccordionProps) {
  const ref = useRef<HTMLDetailsElement>(null)
  const controlled = open !== undefined

  // Set uncontrolled initial state on mount only.
  useEffect(() => {
    if (!controlled && ref.current) {
      ref.current.open = !!defaultOpen
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep DOM open-attribute in sync with the `open` prop when controlled.
  useEffect(() => {
    if (controlled && ref.current && ref.current.open !== open) {
      ref.current.open = !!open
    }
  }, [controlled, open])

  const handleToggle = useCallback(() => {
    const isOpen = ref.current?.open ?? false
    // In controlled mode, syncing the DOM to a new `open` prop via the effect
    // above also fires a native `toggle` event. If the DOM state now matches
    // the prop, this event is the echo of our own programmatic change — not
    // user input — so we must not report it back to the parent. Doing so
    // caused a double-click bug in exclusive AccordionGroups where clicking a
    // sibling item would close everything instead of switching.
    if (controlled && isOpen === open) return
    onOpenChange?.(isOpen)
  }, [controlled, open, onOpenChange])

  return (
    <details
      ref={ref}
      onToggle={handleToggle}
      className={clsx(styles.details, className)}
      {...rest}
    >
      <summary className={styles.summary}>
        <Icon name="chevron-right" size={12} className={styles.chev} />
        <span className={styles.title}>{title}</span>
        {trailing && <span className={styles.trailing}>{trailing}</span>}
      </summary>
      <div className={styles.body}>{children}</div>
    </details>
  )
}
