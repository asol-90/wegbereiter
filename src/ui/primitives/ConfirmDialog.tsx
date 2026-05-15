/**
 * ConfirmDialog — Modal convenience with confirm/cancel buttons and
 * optional destructive tone. Used for Kaskaden-Dialog, delete confirms, etc.
 */
import type {ReactNode} from 'react'
import {Button} from './Button'
import {Modal} from './Modal'

export type ConfirmDialogProps = {
  open: boolean
  onCancel: () => void
  onConfirm: () => void
  title: ReactNode
  description?: ReactNode
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'default' | 'danger'
  loading?: boolean
}

export function ConfirmDialog({
  open,
  onCancel,
  onConfirm,
  title,
  description,
  children,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  tone = 'default',
  loading,
}: ConfirmDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      {children}
    </Modal>
  )
}
