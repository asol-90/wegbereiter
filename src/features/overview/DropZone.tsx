/**
 * DropZone — drag-and-drop area for importing JSON files.
 *
 * Wraps children and overlays a visual indicator when a file is being dragged
 * over the component. On drop, reads the file as text and calls onFileDrop.
 */
import {type DragEvent, type ReactNode, useCallback, useState} from 'react'
import styles from './DropZone.module.css'

export type DropZoneProps = {
  children: ReactNode
  /** Called with the file content as string. */
  onFileDrop: (content: string, fileName: string) => void
  /** Accepted file extension (default: '.json'). */
  accept?: string
}

export function DropZone({ children, onFileDrop, accept = '.json' }: DropZoneProps) {
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragOver(false)
  }, [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragOver(false)

      const file = e.dataTransfer.files[0]
      if (!file) return
      if (accept && !file.name.endsWith(accept)) return

      const reader = new FileReader()
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          onFileDrop(reader.result, file.name)
        }
      }
      reader.readAsText(file)
    },
    [onFileDrop, accept],
  )

  return (
    <div
      className={`${styles.root} ${dragOver ? styles.active : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {children}
      {dragOver && (
        <div className={styles.overlay}>
          <span className={styles.label}>Datei hier ablegen</span>
        </div>
      )}
    </div>
  )
}
