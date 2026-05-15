/**
 * TreffenListe — sequential list of interactive TreffenKarten with interval
 * indicators and a Spotlight shell for adding programmpunkte.
 *
 * Between every pair of meetings a small separator shows the time gap.
 * When the gap matches the Planung's regular rhythm the indicator is very
 * subtle; deviations are more prominent.
 */
import { useMemo, useState, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { differenceInCalendarDays } from 'date-fns'
import { parseIso, rhythmusWeekInterval } from '@/domain/dateUtils'
import type { Planung, StammKontext, IsoDate, AktivitaetTyp, AktivitaetUntertyp } from '@/domain/types'
import type { TreffenId, ProgrammpunktId, MitarbeiterId } from '@/domain/ids'
import { useStammKontext } from '@/features/stammKontext'

import { Icon } from '@/ui/primitives/Icon'
import { TreffenKarte } from './TreffenKarte'
import type { StammBlocksForTreffen } from './treffenKarteTypes'
import { useTreffenMutations } from './useTreffenMutations'
import { AddPunktSpotlight } from './AddPunktSpotlight'
import styles from './TreffenListe.module.css'

export type TreffenListeProps = {
  planung: Planung
}

// ─── Interval logic ─────────────────────────────────────────────────────────

type IntervalTone = 'regular' | 'minor' | 'major'

function formatInterval(days: number): string {
  if (days === 7) return '1 Woche'
  if (days % 7 === 0) {
    const w = days / 7
    return `${w} Wochen`
  }
  if (days === 1) return '1 Tag'
  return `${days} Tage`
}

function classifyInterval(days: number, expectedDays: number): IntervalTone {
  const diff = Math.abs(days - expectedDays)
  if (diff <= 1) return 'regular'
  if (diff <= 7) return 'minor'
  return 'major'
}

/**
 * Resolve the Stamm blocks for a given meeting date.
 * Matches the date against the Kontext's treffen and returns the
 * resolved anfangs/end blocks (per-meeting overrides or defaults).
 */
function resolveStammBlocks(
  datum: IsoDate,
  kontext: StammKontext,
): StammBlocksForTreffen | undefined {
  const stammTreffen = kontext.treffen.find((st) => st.datum === datum)
  if (!stammTreffen) return undefined

  const anfangsBlock = stammTreffen.anfangsBlock ?? kontext.defaultAnfangsBlock
  const endBlock = stammTreffen.endBlock ?? kontext.defaultEndBlock
  const stammMin =
    anfangsBlock.reduce((s, b) => s + b.dauerMin, 0) +
    endBlock.reduce((s, b) => s + b.dauerMin, 0)

  return { anfangsBlock, endBlock, stammMin }
}

// ─── Component ──────────────────────────────────────────────────────────────

export function TreffenListe({ planung }: TreffenListeProps) {
  const navigate = useNavigate()
  const { planungId = '' } = useParams()
  const mutations = useTreffenMutations(planung)
  const { kontexte } = useStammKontext()

  // Resolve active context for this Planung
  const activeKontext = useMemo<StammKontext | undefined>(
    () =>
      planung.stammKontextId
        ? kontexte.find((k) => k.id === planung.stammKontextId)
        : undefined,
    [planung.stammKontextId, kontexte],
  )

  const expectedDays = useMemo(
    () => rhythmusWeekInterval(planung.rhythmus) * 7,
    [planung.rhythmus],
  )

  // Pre-compute absent member IDs per treffen date
  const abwesenheitenMap = useMemo(() => {
    const map = new Map<IsoDate, Set<MitarbeiterId>>()
    for (const ab of planung.abwesenheiten) {
      for (const t of planung.treffen) {
        if (t.datum >= ab.von && t.datum <= ab.bis) {
          let set = map.get(t.datum)
          if (!set) {
            set = new Set<MitarbeiterId>()
            map.set(t.datum, set)
          }
          set.add(ab.mitarbeiterId)
        }
      }
    }
    return map
  }, [planung.abwesenheiten, planung.treffen])

  // Spotlight for adding programmpunkte
  const [spotlightTarget, setSpotlightTarget] = useState<TreffenId | null>(null)

  // Konkretisieren state: replace an abstract point with a concrete one
  const [konkretisieren, setKonkretisieren] = useState<{
    treffenId: TreffenId
    ppId: ProgrammpunktId
    typ: AktivitaetTyp
    untertyp?: AktivitaetUntertyp
  } | null>(null)

  const handleAddClick = useCallback((treffenId: TreffenId) => {
    setSpotlightTarget(treffenId)
  }, [])

  const handleKonkretisieren = useCallback(
    (treffenId: TreffenId, ppId: ProgrammpunktId, typ: AktivitaetTyp, untertyp?: AktivitaetUntertyp) => {
      setKonkretisieren({ treffenId, ppId, typ, untertyp })
    },
    [],
  )

  const handleSpotlightClose = useCallback(() => {
    setSpotlightTarget(null)
    setKonkretisieren(null)
  }, [])

  // When in Konkretisieren mode, wrap mutations so addProgrammpunkt replaces instead
  const konkretMutations = useMemo(() => {
    if (!konkretisieren) return mutations
    const { treffenId: kTid, ppId } = konkretisieren
    return {
      ...mutations,
      addProgrammpunkt: (treffenId: TreffenId, pp: Parameters<typeof mutations.addProgrammpunkt>[1]) => {
        if (treffenId === kTid) {
          mutations.replaceProgrammpunkt(treffenId, ppId, pp)
        } else {
          mutations.addProgrammpunkt(treffenId, pp)
        }
      },
    }
  }, [konkretisieren, mutations])

  const treffen = planung.treffen

  if (treffen.length === 0) {
    return <div className={styles.empty}>Keine Treffen in dieser Planung.</div>
  }

  const handleSepClick = () => {
    navigate(`/planung/${planungId}/kalender`)
  }

  return (
    <div className={styles.root}>
      {treffen.map((t, i) => {
        let sep: React.ReactNode = null
        if (i > 0) {
          const prev = treffen[i - 1]!
          const days = differenceInCalendarDays(
            parseIso(t.datum),
            parseIso(prev.datum),
          )
          const tone = classifyInterval(days, expectedDays)
          sep = (
            <div
              className={`${styles.sep} ${styles[`sep-${tone}`]}`}
              onClick={handleSepClick}
              title="Zur Kalenderansicht"
              role="link"
            >
              <span className={styles.sepLine} />
              <span className={styles.sepLabel}>{formatInterval(days)}</span>
              <span className={styles.sepLine} />
              {tone !== 'regular' && (
                <Icon name="calendar" size={12} className={styles.sepIcon} />
              )}
            </div>
          )
        }

        return (
          <div key={t.id}>
            {sep}
            <TreffenKarte
              treffen={t}
              dauerMinuten={planung.dauerMinuten}
              team={planung.team}
              zeitbalkenSchwelle={planung.zeitbalkenSchwelle}
              mutations={mutations}
              onAddClick={handleAddClick}
              onKonkretisieren={handleKonkretisieren}
              stammBlocks={
                activeKontext
                  ? resolveStammBlocks(t.datum, activeKontext)
                  : undefined
              }
              abwesendeIds={abwesenheitenMap.get(t.datum)}
            />
          </div>
        )
      })}

      {/* Spotlight overlay for adding programmpunkte */}
      {spotlightTarget && (
        <AddPunktSpotlight
          treffenId={spotlightTarget}
          mutations={mutations}
          onClose={handleSpotlightClose}
        />
      )}

      {/* Spotlight overlay for Konkretisieren (pre-filtered) */}
      {konkretisieren && (
        <AddPunktSpotlight
          treffenId={konkretisieren.treffenId}
          mutations={konkretMutations}
          onClose={handleSpotlightClose}
          filterTyp={konkretisieren.typ}
          filterUntertyp={konkretisieren.untertyp}
        />
      )}
    </div>
  )
}
