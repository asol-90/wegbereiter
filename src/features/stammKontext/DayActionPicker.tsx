/**
 * Modal shown when the user clicks an empty calendar day in the
 * Stammkontext editor. Lets them pick what to add (Treffen / Stamm-Aktion /
 * Distrikt-Aktion).
 */
import { parseIso } from '@/domain/dateUtils'
import type { IsoDate } from '@/domain/types'
import { Button, Modal } from '@/ui/primitives'
import { Icon } from '@/ui/primitives/Icon'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'
import type { AktionGruppe } from './StammKontextEditorPanel'
import styles from './StammKontextPage.module.css'

function formatDatum(iso: IsoDate): string {
  return format(parseIso(iso), 'dd. MMM yyyy', { locale: de })
}

export type DayActionPickerProps = {
  datum: IsoDate
  onAddTreffen: () => void
  onAddAktion: (gruppe: AktionGruppe) => void
  onClose: () => void
}

type Option = {
  icon: 'calendar' | 'map'
  title: string
  desc: string
  onPick: (close: () => void) => void
}

export function DayActionPicker({ datum, onAddTreffen, onAddAktion, onClose }: DayActionPickerProps) {
  const options: Option[] = [
    {
      icon: 'calendar', title: 'Treffen', desc: 'Regulärer Stammtermin',
      onPick: (close) => { onAddTreffen(); close() },
    },
    {
      icon: 'map', title: 'Stamm-Aktion', desc: 'Lager, Stammversammlung o. Ä.',
      onPick: (close) => { onAddAktion('stamm'); close() },
    },
    {
      icon: 'map', title: 'Distrikt-Aktion', desc: 'Veranstaltung auf Distrikt-Ebene',
      onPick: (close) => { onAddAktion('distrikt'); close() },
    },
  ]
  return (
    <Modal
      open onClose={onClose} title={formatDatum(datum)} size="sm"
      footer={
        <div className={styles.modalFooter}>
          <Button variant="ghost" onClick={onClose}>Abbrechen</Button>
        </div>
      }
    >
      <div className={styles.dayPickerBody}>
        <p className={styles.dayPickerHint}>Was soll an diesem Tag hinzugefügt werden?</p>
        {options.map((opt) => (
          <button
            key={opt.title}
            type="button"
            className={styles.dayPickerOption}
            onClick={() => opt.onPick(onClose)}
          >
            <Icon name={opt.icon} size={16} />
            <div>
              <span className={styles.dayPickerOptionTitle}>{opt.title}</span>
              <span className={styles.dayPickerOptionDesc}>{opt.desc}</span>
            </div>
          </button>
        ))}
      </div>
    </Modal>
  )
}
