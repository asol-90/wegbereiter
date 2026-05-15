/**
 * PDF export — generates and downloads a PDF for a Planung.
 * The actual Document component lives in PlanungPdfDocument.tsx.
 */
import type { Abzeichen, Aktivitaet, Andachtsreihe, Planung, StammKontext } from '@/domain/types'
import { pdf } from '@react-pdf/renderer'
import { PlanungPdfDocument } from './PlanungPdfDocument'

export async function downloadPlanungPdf(
  planung: Planung,
  andachtsreihen: readonly Andachtsreihe[],
  abzeichen: readonly Abzeichen[],
  stammKontext: StammKontext | null,
  stammAktivitaeten: readonly Aktivitaet[],
): Promise<void> {
  const blob = await pdf(
    <PlanungPdfDocument
      planung={planung}
      andachtsreihen={andachtsreihen}
      abzeichen={abzeichen}
      stammKontext={stammKontext}
      stammAktivitaeten={stammAktivitaeten}
    />,
  ).toBlob()

  const slug = planung.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
  const date = planung.zeitraum.start.slice(0, 10)
  const filename = `planung-${slug || 'export'}-${date}.pdf`

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
