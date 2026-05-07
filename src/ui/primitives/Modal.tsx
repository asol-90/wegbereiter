/**
 * Modal — centered dialog with optional header/footer slots.
 * Uses native <dialog> for backdrop + focus-trap semantics.
 */
import {
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
  type MouseEvent,
} from 'react'
import clsx from '../utils/clsx'
import { IconButton } from './IconButton'
import styles from './Modal.module.css'

export type ModalProps = {
  open: boolean
  onClose: () => void
  title?: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  closeOnBackdropClick?: boolean
  hideCloseButton?: boolean
  className?: string
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = 'md',
  closeOnBackdropClick = true,
  hideCloseButton,
  className,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    if (open && !dlg.open) dlg.showModal()
    if (!open && dlg.open) dlg.close()
  }, [open])

  useEffect(() => {
    const dlg = ref.current
    if (!dlg) return
    const handleCancel = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    dlg.addEventListener('cancel', handleCancel)
    return () => dlg.removeEventListener('cancel', handleCancel)
  }, [onClose])

  const handleBackdropClick = useCallback(
    (e: MouseEvent<HTMLDialogElement>) => {
      if (!closeOnBackdropClick) return
      if (e.target === ref.current) onClose()
    },
    [closeOnBackdropClick, onClose],
  )

  return (
    <dialog
      ref={ref}
      className={clsx(styles.dialog, styles[`s-${size}`], className)}
      onClick={handleBackdropClick}
    >
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        {(title || !hideCloseButton) && (
          <header className={styles.header}>
            <div className={styles.heading}>
              {title && <h2 className={styles.title}>{title}</h2>}
              {description && <p className={styles.desc}>{description}</p>}
            </div>
            {!hideCloseButton && (
              <IconButton
                icon="x"
                label="Schließen"
                shape="circle"
                onClick={onClose}
              />
            )}
          </header>
        )}
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </dialog>
  )
}
