/**
 * iCal export — one VCALENDAR with one all-day VEVENT per Treffen.
 * No package needed; pure string generation.
 */
import type { Planung, Treffen } from '@/domain/types'

export function downloadPlanungIcal(planung: Planung): void {
  const cal = buildCalendar(planung)
  const blob = new Blob([cal], { type: 'text/calendar;charset=utf-8' })
  const slug = planung.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').slice(0, 40)
  const date = planung.zeitraum.start.slice(0, 10)
  triggerDownload(blob, `planung-${slug || 'export'}-${date}.ics`)
}

function buildCalendar(planung: Planung): string {
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stammtreff Planer//DE',
    `X-WR-CALNAME:${fold(planung.name)}`,
    'X-WR-TIMEZONE:Europe/Berlin',
    'CALSCALE:GREGORIAN',
  ]

  for (const treffen of planung.treffen) {
    lines.push(...buildEvent(treffen, planung))
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

function buildEvent(treffen: Treffen, planung: Planung): string[] {
  // All-day event: DTSTART;VALUE=DATE, DTEND = next day
  const dtstart = treffen.datum.replace(/-/g, '')
  const dtend = nextDay(treffen.datum)

  const summary = treffen.titel
    ? `${treffen.titel} — Stammtreff`
    : 'Stammtreff'

  const beschreibung = buildDescription(treffen, planung)

  return [
    'BEGIN:VEVENT',
    `UID:${treffen.id}@stammtreff-planer`,
    `SUMMARY:${fold(summary)}`,
    `DTSTART;VALUE=DATE:${dtstart}`,
    `DTEND;VALUE=DATE:${dtend}`,
    `DESCRIPTION:${fold(beschreibung)}`,
    'END:VEVENT',
  ]
}

function buildDescription(treffen: Treffen, planung: Planung): string {
  const parts: string[] = []

  const beschreibung = treffen.notiz ?? treffen.aktionBeschreibung
  if (beschreibung) {
    parts.push(beschreibung, '')
  }

  parts.push('Programm:')
  for (const pp of treffen.programm) {
    const verantw = formatVerantwortlicher(pp.verantwortlicherId, pp.gastName, planung)
    parts.push(`• ${pp.name} (${pp.dauerMin} min) — ${verantw}`)
  }

  if (treffen.programm.length === 0) {
    parts.push('(kein Programm)')
  }

  return parts.join('\n')
}

function formatVerantwortlicher(
  id: string | undefined,
  gastName: string | undefined,
  planung: Planung,
): string {
  if (id === 'offen') return 'Offen'
  if (id === undefined) return '–'
  if (gastName) return gastName
  const member = planung.team.find((m) => m.id === id)
  return member ? member.name : '–'
}

function nextDay(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00')
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

/** Fold long lines per RFC 5545 (max 75 octets per line). */
function fold(value: string): string {
  // Escape special chars first
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')

  if (escaped.length <= 74) return escaped

  const chunks: string[] = []
  let remaining = escaped
  let first = true
  while (remaining.length > 0) {
    const max = first ? 74 : 73
    chunks.push((first ? '' : ' ') + remaining.slice(0, max))
    remaining = remaining.slice(max)
    first = false
  }
  return chunks.join('\r\n')
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
