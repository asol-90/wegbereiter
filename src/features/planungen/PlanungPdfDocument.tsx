/**
 * React-PDF document component for a Planung export.
 * Kept in its own file so react-refresh doesn't complain about
 * mixing component + non-component exports.
 */
import { pruefePlanung } from '@/domain/planungsAbschluss'
import type { Abzeichen, Aktivitaet, Andachtsreihe, Planung, StammKontext } from '@/domain/types'
import { WB_KEYS, type WBKey } from '@/domain/wb'
import { combine, contributionOf, normalize } from '@/domain/wbLogic'
import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'
import { format } from 'date-fns'
import { de } from 'date-fns/locale'

// ─── Palette & styles ────────────────────────────────────────────────────────

const c = {
  t1: '#1a1a1a', t2: '#5f5e5a', t3: '#888780',
  ok: '#0f6e56', warn: '#854f0b', err: '#a32d2d',
  brd: 'rgba(0,0,0,0.1)', bg: '#faf8f3', bg2: '#ebe8e0',
  wbK: '#b34a4a', wbG: '#3d7a5a', wbI: '#4a6fa5', wbS: '#7a5c99',
}

const WB_COLORS: Record<WBKey, string> = {
  koerperlich: c.wbK, gesellschaftlich: c.wbG, geistig: c.wbI, geistlich: c.wbS,
}
const WB_LABELS: Record<WBKey, string> = {
  koerperlich: 'Körperlich', gesellschaftlich: 'Gesellschaftlich',
  geistig: 'Geistig', geistlich: 'Geistlich',
}

const s = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 10, color: c.t1, backgroundColor: c.bg },
  titleWrap: { flex: 1, justifyContent: 'center' },
  titleName: { fontSize: 28, fontFamily: 'Helvetica-Bold', marginBottom: 12 },
  titleZeitraum: { fontSize: 13, color: c.t2, marginBottom: 8 },
  titleTeam: { fontSize: 10, color: c.t3, lineHeight: 1.6 },
  h2: { fontSize: 11, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 1, marginTop: 16, marginBottom: 6 },
  sep: { borderBottom: `0.5px solid ${c.brd}`, marginBottom: 10 },
  wbRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  wbLabel: { width: 90, fontSize: 9, color: c.t2 },
  wbOuter: { flex: 1, backgroundColor: c.bg2, borderRadius: 2, height: 7, marginHorizontal: 6 },
  wbInner: { height: 7, borderRadius: 2 },
  wbPct: { width: 28, fontSize: 9, color: c.t2, textAlign: 'right' },
  artLabel: { fontSize: 8, color: c.t3, textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 8, marginBottom: 3 },
  kritRow: { flexDirection: 'row', marginBottom: 3 },
  kritIcon: { width: 12, fontSize: 9 },
  kritText: { flex: 1, fontSize: 9, color: c.t2, lineHeight: 1.4 },
  treffenBlock: { marginBottom: 12 },
  treffenHead: { flexDirection: 'row', borderBottom: `0.5px solid ${c.brd}`, paddingBottom: 3, marginBottom: 4 },
  treffenDatum: { flex: 1, fontSize: 10, fontFamily: 'Helvetica-Bold' },
  treffenGesamt: { fontSize: 9, color: c.t3 },
  ppRow: { flexDirection: 'row', paddingVertical: 1.5 },
  ppName: { flex: 3, fontSize: 9 },
  ppTyp: { flex: 1, fontSize: 9, color: c.t3 },
  ppDauer: { width: 38, fontSize: 9, color: c.t3, textAlign: 'right' },
  ppVerantw: { width: 68, fontSize: 9, color: c.t3, textAlign: 'right' },
  emptyProgramm: { fontSize: 9, color: c.t3, fontStyle: 'italic' },
  stammThema: { fontSize: 12, fontFamily: 'Helvetica-Bold', marginBottom: 4 },
  stammBeschr: { fontSize: 9, color: c.t2, lineHeight: 1.5, marginBottom: 8 },
  stammRow: { flexDirection: 'row', marginBottom: 2 },
  stammMark: { width: 10, fontSize: 9 },
  stammName: { flex: 1, fontSize: 9, color: c.t2 },
})

// ─── Props ───────────────────────────────────────────────────────────────────

export type PlanungPdfDocumentProps = {
  planung: Planung
  andachtsreihen: readonly Andachtsreihe[]
  abzeichen: readonly Abzeichen[]
  stammKontext: StammKontext | null
  stammAktivitaeten: readonly Aktivitaet[]
}

// ─── Document ────────────────────────────────────────────────────────────────

export function PlanungPdfDocument({
  planung,
  andachtsreihen,
  abzeichen,
  stammKontext,
  stammAktivitaeten,
}: PlanungPdfDocumentProps) {
  const allPP = planung.treffen.flatMap((t) => t.programm)
  const dist = normalize(combine(...allPP.map(contributionOf)))
  const kriterien = pruefePlanung(planung, andachtsreihen, abzeichen, stammKontext, stammAktivitaeten)
  const usedIds = buildUsedIds(planung)

  return (
    <Document title={planung.name}>
      <TitelPage planung={planung} />
      <ZielstatusPage dist={dist} kriterien={kriterien.kriterien} />
      <TreffenlistePage planung={planung} />
      {stammKontext && stammAktivitaeten.length > 0 && (
        <StammKontextPage stammKontext={stammKontext} aktivitaeten={stammAktivitaeten} usedIds={usedIds} />
      )}
    </Document>
  )
}

// ─── Pages ───────────────────────────────────────────────────────────────────

function TitelPage({ planung }: { planung: Planung }) {
  const fmtDate = (iso: string) => format(new Date(iso), 'dd. MMM yyyy', { locale: de })
  return (
    <Page size="A4" style={s.page}>
      <View style={s.titleWrap}>
        <Text style={s.titleName}>{planung.name}</Text>
        <Text style={s.titleZeitraum}>{fmtDate(planung.zeitraum.start)} – {fmtDate(planung.zeitraum.ende)}</Text>
        <Text style={s.titleTeam}>{planung.team.map((m) => m.name).join(', ')}</Text>
      </View>
    </Page>
  )
}

function ZielstatusPage({
  dist,
  kriterien,
}: {
  dist: Record<WBKey, number>
  kriterien: import('@/domain/planungsAbschluss').Kriterium[]
}) {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.h2}>Wachstumsbereiche</Text>
      <View style={s.sep} />
      {WB_KEYS.map((k) => (
        <View key={k} style={s.wbRow}>
          <Text style={s.wbLabel}>{WB_LABELS[k]}</Text>
          <View style={s.wbOuter}>
            <View style={[s.wbInner, { width: `${Math.round(dist[k] * 100)}%`, backgroundColor: WB_COLORS[k] }]} />
          </View>
          <Text style={s.wbPct}>{Math.round(dist[k] * 100)} %</Text>
        </View>
      ))}

      <Text style={[s.h2, { marginTop: 24 }]}>Zielstatus</Text>
      <View style={s.sep} />
      <Text style={s.artLabel}>Ziele</Text>
      {kriterien.filter((k) => k.art === 'ziel').map((k) => (
        <KriteriumRow key={k.key} kriterium={k} />
      ))}
      <Text style={s.artLabel}>Hinweise</Text>
      {kriterien.filter((k) => k.art === 'hinweis').map((k) => (
        <KriteriumRow key={k.key} kriterium={k} />
      ))}
    </Page>
  )
}

function TreffenlistePage({ planung }: { planung: Planung }) {
  const fmtShort = (iso: string) => format(new Date(iso), 'EEE, dd.MM.yyyy', { locale: de })
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.h2}>Treffenliste</Text>
      <View style={s.sep} />
      {planung.treffen.map((treffen) => {
        const istMin = treffen.programm.reduce((sum, pp) => sum + pp.dauerMin, 0)
        const pct = planung.dauerMinuten > 0 ? Math.round((istMin / planung.dauerMinuten) * 100) : 0
        return (
          <View key={treffen.id} style={s.treffenBlock} wrap={false}>
            <View style={s.treffenHead}>
              <Text style={s.treffenDatum}>{fmtShort(treffen.datum)}{treffen.titel ? ` — ${treffen.titel}` : ''}</Text>
              <Text style={s.treffenGesamt}>{istMin} min ({pct} %)</Text>
            </View>
            {treffen.programm.length === 0
              ? <Text style={s.emptyProgramm}>Kein Programm geplant</Text>
              : treffen.programm.map((pp) => (
                  <View key={pp.id} style={s.ppRow}>
                    <Text style={s.ppName}>{pp.name}</Text>
                    <Text style={s.ppTyp}>{pp.kind === 'wegezeit' ? 'Wegezeit' : pp.typ}</Text>
                    <Text style={s.ppDauer}>{pp.dauerMin} min</Text>
                    <Text style={s.ppVerantw}>{resolveVerantw(pp.verantwortlicherId, pp.gastName, planung)}</Text>
                  </View>
                ))
            }
          </View>
        )
      })}
    </Page>
  )
}

function StammKontextPage({
  stammKontext,
  aktivitaeten,
  usedIds,
}: {
  stammKontext: StammKontext
  aktivitaeten: readonly Aktivitaet[]
  usedIds: Set<string>
}) {
  return (
    <Page size="A4" style={s.page}>
      <Text style={s.h2}>Stammkontext</Text>
      <View style={s.sep} />
      <Text style={s.stammThema}>{stammKontext.thema}</Text>
      {stammKontext.themaBeschreibung && (
        <Text style={s.stammBeschr}>{stammKontext.themaBeschreibung}</Text>
      )}
      {aktivitaeten.map((akt) => (
        <View key={akt.id} style={s.stammRow}>
          <Text style={[s.stammMark, { color: usedIds.has(akt.id as string) ? c.ok : c.t3 }]}>
            {usedIds.has(akt.id as string) ? '✓' : '○'}
          </Text>
          <Text style={s.stammName}>{akt.name}</Text>
        </View>
      ))}
    </Page>
  )
}

// ─── Shared sub-components ───────────────────────────────────────────────────

function KriteriumRow({ kriterium }: { kriterium: import('@/domain/planungsAbschluss').Kriterium }) {
  return (
    <View style={s.kritRow}>
      <Text style={[s.kritIcon, { color: statusColor(kriterium.status) }]}>{statusIcon(kriterium.status)}</Text>
      <Text style={s.kritText}>{kriterium.text}</Text>
    </View>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildUsedIds(planung: Planung): Set<string> {
  const ids = new Set<string>()
  for (const t of planung.treffen)
    for (const pp of t.programm)
      if (pp.kind === 'konkret') ids.add(pp.aktivitaetId as string)
  return ids
}

function resolveVerantw(id: string | undefined, gastName: string | undefined, planung: Planung): string {
  if (id === 'offen') return 'Offen'
  if (id === undefined) return '–'
  if (gastName) return gastName
  const m = planung.team.find((t) => t.id === id)
  return m ? m.name : '–'
}

function statusColor(status: string): string {
  if (status === 'ok') return '#0f6e56'
  if (status === 'warn') return '#854f0b'
  return '#a32d2d'
}

function statusIcon(status: string): string {
  if (status === 'ok') return '✓'
  if (status === 'warn') return '⚠'
  return '✗'
}
