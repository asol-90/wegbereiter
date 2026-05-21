/**
 * Kopfzeile der Planungsliste mit Split-Button und Dropdown-Menü.
 *
 * Linker Button-Teil legt direkt eine neue Planung an, der Chevron
 * öffnet ein Menü mit „Neue Planung" und „Kontext laden".
 */
import { useState } from 'react'
import { ContextMenu, type MenuItem } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import styles from './Planungsliste.module.css'

export function PlanungslisteHeader({
  onNewPlanung, onLoadKontext,
}: {
  onNewPlanung: () => void
  onLoadKontext: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<{ x: number; y: number } | null>(null)

  const menuItems: MenuItem[] = [
    { id: 'planung', label: 'Neue Planung', icon: 'plus', onSelect: onNewPlanung },
    { id: 'kontext', label: 'Kontext laden', icon: 'upload', onSelect: onLoadKontext },
  ]

  return (
    <div className={styles.header}>
      <span className={styles.sectionLabel}>Planungen & Kontext</span>
      <div className={styles.headerActions}>
        <div className={styles.splitBtn}>
          <button
            type="button"
            className={styles.splitMain}
            onClick={onNewPlanung}
          >
            <Icon name="plus" size={12} />
            <span>Neu</span>
          </button>
          <button
            type="button"
            className={styles.splitChevron}
            onClick={(e) => {
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              setMenuAnchor({ x: rect.right, y: rect.bottom + 4 })
              setMenuOpen((prev) => !prev)
            }}
            aria-label="Weitere Optionen"
          >
            <Icon name="chevron-down" size={12} />
          </button>
        </div>
        {menuOpen && menuAnchor && (
          <ContextMenu
            open={menuOpen}
            sections={[{ id: 'main', items: menuItems }]}
            position={menuAnchor}
            onClose={() => setMenuOpen(false)}
          />
        )}
      </div>
    </div>
  )
}
