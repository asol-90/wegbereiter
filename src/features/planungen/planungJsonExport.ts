/**
 * JSON export for a Planung — includes all referenced Aktivitäten,
 * Andachtsreihen, Abzeichen, and StammKontext so the file is self-contained.
 */
import type { Abzeichen, Aktivitaet, Andachtsreihe, Planung, StammKontext } from '@/domain/types'

type PlanungExportFile = {
  typ: 'planung-export'
  version: 1
  exportiertAm: string
  planung: Planung
  aktivitaeten: readonly Aktivitaet[]
  andachtsreihen: readonly Andachtsreihe[]
  abzeichen: readonly Abzeichen[]
  stammKontext: StammKontext | null
}

export function downloadPlanungJson(
  planung: Planung,
  aktivitaeten: readonly Aktivitaet[],
  andachtsreihen: readonly Andachtsreihe[],
  abzeichen: readonly Abzeichen[],
  stammKontext: StammKontext | null,
): void {
  const referencedIds = new Set<string>()
  for (const t of planung.treffen)
    for (const pp of t.programm)
      if (pp.kind === 'konkret') referencedIds.add(pp.aktivitaetId as string)

  const file: PlanungExportFile = {
    typ: 'planung-export',
    version: 1,
    exportiertAm: new Date().toISOString(),
    planung,
    aktivitaeten: aktivitaeten.filter((a) => referencedIds.has(a.id as string)),
    andachtsreihen,
    abzeichen,
    stammKontext,
  }

  const json = JSON.stringify(file, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  triggerDownload(blob, buildFilename(planung, 'json'))
}

function buildFilename(planung: Planung, ext: string): string {
  const slug = planung.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
  const date = planung.zeitraum.start.slice(0, 10)
  return `planung-${slug || 'export'}-${date}.${ext}`
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
