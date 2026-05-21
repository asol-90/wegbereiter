/**
 * Trigger a callback when a mousedown happens outside the given element.
 * No-op while `active` is false to avoid registering listeners we don't need.
 */
import { useEffect, type RefObject } from 'react'

export function useOutsideClick(
  ref: RefObject<HTMLElement | null>,
  active: boolean,
  onOutside: () => void,
) {
  useEffect(() => {
    if (!active) return
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) onOutside()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [ref, active, onOutside])
}
