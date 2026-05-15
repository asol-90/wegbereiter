import type { Abzeichen, Aktivitaet, Andachtsreihe, Planung, StammKontext } from '@/domain/types'
import { downloadPlanungIcal } from '@/features/planungen/planungIcalExport'
import { downloadPlanungJson } from '@/features/planungen/planungJsonExport'
import { downloadPlanungPdf } from '@/features/planungen/planungPdfExport'
import { Icon, Modal } from '@/ui/primitives'
import type { IconName } from '@/ui/primitives/Icon'
import { useState } from 'react'
import styles from './ExportDialog.module.css'

type Props = {
  open: boolean
  onClose: () => void
  planung: Planung
  aktivitaeten: readonly Aktivitaet[]
  andachtsreihen: Andachtsreihe[]
  abzeichen: Abzeichen[]
  stammKontext: StammKontext | null
  stammAktivitaeten: readonly Aktivitaet[]
}

export function ExportDialog({
  open,
  onClose,
  planung,
  aktivitaeten,
  andachtsreihen,
  abzeichen,
  stammKontext,
  stammAktivitaeten,
}: Props) {
  const [pdfLoading, setPdfLoading] = useState(false)

  function handleJson() {
    downloadPlanungJson(planung, aktivitaeten, andachtsreihen, abzeichen, stammKontext)
    onClose()
  }

  function handleIcal() {
    downloadPlanungIcal(planung)
    onClose()
  }

  async function handlePdf() {
    setPdfLoading(true)
    try {
      await downloadPlanungPdf(planung, andachtsreihen, abzeichen, stammKontext, stammAktivitaeten)
      onClose()
    } finally {
      setPdfLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Planung exportieren" size="sm">
      <div className={styles.options}>
        <ExportOption
          icon="file-text"
          label="JSON-Export"
          description="Vollständige Daten · reimportierbar"
          onClick={handleJson}
        />
        <ExportOption
          icon="file"
          label="PDF-Export"
          description="Druckbares Dokument · Treffenliste + Zielstatus"
          onClick={handlePdf}
          loading={pdfLoading}
        />
        <ExportOption
          icon="calendar"
          label="Kalender-Export"
          description="iCal-Format · ganztägige Einträge"
          onClick={handleIcal}
        />
      </div>
    </Modal>
  )
}

function ExportOption({
  icon,
  label,
  description,
  onClick,
  loading,
}: {
  icon: IconName
  label: string
  description: string
  onClick: () => void
  loading?: boolean
}) {
  return (
    <button className={styles.option} onClick={onClick} disabled={loading}>
      <span className={styles.optionIcon}>
        <Icon name={loading ? 'download' : icon} size={16} />
      </span>
      <span className={styles.optionContent}>
        <span className={styles.optionLabel}>{label}</span>
        <span className={styles.optionDesc}>{description}</span>
      </span>
      {!loading && <Icon name="download" size={14} className={styles.optionArrow} />}
    </button>
  )
}
