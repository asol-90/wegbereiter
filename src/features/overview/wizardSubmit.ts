/**
 * Pure helpers for NewPlanungWizard's submit + validation logic.
 * No React, no hooks, no IO (except the andachts-reihe save which is async).
 */
import type {
  Altersstufe,
  AndachtsreiheZuordnung,
  IsoDate,
  Mitarbeiter,
  Planung,
  StammKontext,
  WBSchwerpunkt,
  WbSchwerpunktModus,
  Weekday,
} from '@/domain/types'
import {
  newId,
  type AbzeichenId,
  type AndachtsEinheitId,
  type AndachtsreiheId,
} from '@/domain/ids'
import type { CreatePlanungInput } from '@/domain/planungFactory'
import { type WBKey } from '@/domain/wb'
import { saveAndachtsreihe } from '@/storage/repertoireRepo'
import {
  formatDateShort,
  type AndachtMode,
  type PreviewItem,
  type RhythmusKey,
  rhythmusFromKey,
} from './newPlanungWizardUtils'

export type ZieleErrors = {
  wb: string | null
  andacht: string | null
  abzeichen: string | null
}

export const EMPTY_ZIELE_ERRORS: ZieleErrors = {
  wb: null,
  andacht: null,
  abzeichen: null,
}

export type BasicsState = {
  start: IsoDate
  ende: IsoDate
  dauer: number
  team: readonly Mitarbeiter[]
}

export function validateBasics(state: BasicsState, planungen: readonly Planung[]): string | null {
  const { start, ende, dauer, team } = state
  if (!start || !ende) return 'Bitte Start- und Enddatum angeben.'
  if (start >= ende) return 'Das Enddatum muss nach dem Startdatum liegen.'
  if (!Number.isFinite(dauer) || dauer <= 0) return 'Dauer muss größer als 0 sein.'
  for (const p of planungen) {
    if (p.zeitraum.start < ende && p.zeitraum.ende > start) {
      return `Der Zeitraum überschneidet sich mit der Planung „${p.name}" (${formatDateShort(p.zeitraum.start)} – ${formatDateShort(p.zeitraum.ende)}).`
    }
  }
  if (team.length === 0) return 'Mindestens einen Mitarbeiter hinzufügen.'
  return null
}

export type ZieleState = {
  wbModus: WbSchwerpunktModus
  wbBereiche: readonly WBKey[]
  andachtMode: AndachtMode
  andachtReiheId: AndachtsreiheId | null
  andachtAusgewaehlt: ReadonlySet<AndachtsEinheitId>
  andachtTitel: string
  andachtEinheiten: readonly { id: AndachtsEinheitId; titel: string }[]
  selectedAltersstufe: Altersstufe | null
  selectedAbzeichenId: AbzeichenId | null
}

function validateAndacht(z: ZieleState): string | null {
  switch (z.andachtMode) {
    case 'reihe':
      return z.andachtReiheId ? null : 'Bitte eine Andachtsreihe wählen.'
    case 'sammlung':
      if (!z.andachtReiheId) return 'Bitte eine Sammlung wählen.'
      if (z.andachtAusgewaehlt.size === 0) return 'Bitte mindestens eine Einheit aus der Sammlung aktivieren.'
      return null
    case 'new': {
      if (!z.andachtTitel.trim()) return 'Bitte einen Titel für die Reihe angeben.'
      const hasUnit = z.andachtEinheiten.some((e) => e.titel.trim())
      return hasUnit ? null : 'Bitte mindestens eine Einheit angeben.'
    }
    default:
      return null
  }
}

export function validateZiele(z: ZieleState): ZieleErrors {
  return {
    wb: z.wbModus !== 'ausgewogen' && z.wbBereiche.length === 0
      ? 'Bitte mindestens einen Wachstumsbereich auswählen.'
      : null,
    andacht: validateAndacht(z),
    abzeichen: z.selectedAltersstufe && !z.selectedAbzeichenId
      ? 'Bitte ein Abzeichen für die gewählte Stufe auswählen.'
      : null,
  }
}

export function hasZieleErrors(errs: ZieleErrors): boolean {
  return !!(errs.wb || errs.andacht || errs.abzeichen)
}

/** Build the Andachtsreihen-Zuordnung; persists a new reihe to storage if needed. */
export async function buildAndachtsreihenZuordnung(z: ZieleState): Promise<AndachtsreiheZuordnung[]> {
  switch (z.andachtMode) {
    case 'new': {
      if (!z.andachtTitel.trim()) return []
      const valid = z.andachtEinheiten.filter((e) => e.titel.trim())
      if (valid.length === 0) return []
      const reiheId = newId<AndachtsreiheId>()
      await saveAndachtsreihe({
        id: reiheId,
        name: z.andachtTitel.trim(),
        art: 'reihe',
        quelle: 'eigene',
        einheiten: valid.map((e, i) => ({ id: e.id, index: i, titel: e.titel.trim() })),
      })
      return [{ reiheId }]
    }
    case 'reihe':
      return z.andachtReiheId ? [{ reiheId: z.andachtReiheId }] : []
    case 'sammlung':
      if (!z.andachtReiheId || z.andachtAusgewaehlt.size === 0) return []
      return [{
        reiheId: z.andachtReiheId,
        ausgewaehlteEinheiten: Array.from(z.andachtAusgewaehlt),
      }]
    default:
      return []
  }
}

/** Collect dates that should be excluded from the factory's generateTermine output. */
export function collectExcludeDates(
  generated: readonly IsoDate[],
  mergedItems: readonly PreviewItem[],
  reinstated: ReadonlySet<IsoDate>,
  kontextRange: { von: IsoDate; bis: IsoDate } | null,
  isHoliday: (iso: IsoDate) => boolean,
): Set<IsoDate> {
  const excludeDates = new Set<IsoDate>()
  if (kontextRange) {
    for (const iso of generated) {
      if (iso >= kontextRange.von && iso <= kontextRange.bis) {
        excludeDates.add(iso)
      }
    }
  }
  for (const item of mergedItems) {
    if (item.kind !== 'treffen' || item.source !== 'generated') continue
    if (kontextRange && item.iso >= kontextRange.von && item.iso <= kontextRange.bis) continue
    if (isHoliday(item.iso) && !reinstated.has(item.iso)) excludeDates.add(item.iso)
  }
  return excludeDates
}

export type AssembleArgs = {
  start: IsoDate
  ende: IsoDate
  weekday: Weekday
  rhythmusK: RhythmusKey
  dauer: number
  team: Mitarbeiter[]
  nameOverride: string
  activeKontext: StammKontext | undefined
  excludeDates: Set<IsoDate>
  kontextTreffenDates: IsoDate[]
  wbModus: WbSchwerpunktModus
  wbBereiche: WBKey[]
  abzeichenId: AbzeichenId | null
  andachtsreihenZuordnung: AndachtsreiheZuordnung[]
}

export function assemblePlanungCreateInput(a: AssembleArgs): CreatePlanungInput {
  const wbSchwerpunkt: WBSchwerpunkt | undefined =
    a.wbModus !== 'ausgewogen' ? { modus: a.wbModus, bereiche: a.wbBereiche } : undefined

  return {
    zeitraum: { start: a.start, ende: a.ende },
    weekday: a.weekday,
    rhythmus: rhythmusFromKey(a.rhythmusK),
    dauerMinuten: a.dauer,
    team: a.team,
    name: a.nameOverride.trim() || undefined,
    stammKontextId: a.activeKontext?.id,
    excludeDates: a.excludeDates.size > 0 ? a.excludeDates : undefined,
    extraDates: a.kontextTreffenDates.length > 0 ? a.kontextTreffenDates : undefined,
    wbSchwerpunkt,
    abzeichenAuswahl: a.abzeichenId ? [{ abzeichenId: a.abzeichenId }] : [],
    andachtsreihenZuordnung: a.andachtsreihenZuordnung,
  }
}
