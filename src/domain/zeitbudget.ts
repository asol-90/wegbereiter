/**
 * Time budget calculations for a single Treffen.
 *
 * A Treffen has:
 * - `dauerMinuten` (gross duration, from Planung or StammTreffen)
 * - optional stamm block deductions (Anfangs- + Endblock)
 * - summed Programmpunkt durations (ist)
 *
 * "Verfügbare Zeit" (team time) = brutto − Stamm-Blöcke.
 * Over-budget when ist > verfügbar.
 */
import type {Planung, StammBlock, StammKontext, StammTreffen, Treffen} from './types'

export type ZeitbudgetInfo = {
  /** Brutto-Treffen-Dauer (gross). */
  bruttoMin: number
  /** Abzug für Stammzeit (sum of Anfangs- + Endblock). */
  stammAbzugMin: number
  /** Team-verfügbare Minuten = brutto − stamm. */
  verfuegbarMin: number
  /** Summe aller Programmpunkt-Dauern. */
  istMin: number
  /** Anteil ist/verfügbar (0..∞). */
  auslastung: number
  /** Überschreitung? */
  ueberbudget: boolean
}

/** Sum durations of a StammBlock list. */
function blockDauer(block: StammBlock[]): number {
  return block.reduce((sum, b) => sum + b.dauerMin, 0)
}

/**
 * Resolve the effective Stamm-Block deduction for a meeting.
 * Uses per-meeting overrides if set, otherwise the context defaults.
 */
export function stammAbzugFuerTreffen(
  stammTreffen: StammTreffen | undefined,
  kontext: StammKontext | undefined,
): number {
  if (!kontext || !stammTreffen) return 0
  const anfang = stammTreffen.anfangsBlock ?? kontext.defaultAnfangsBlock
  const ende = stammTreffen.endBlock ?? kontext.defaultEndBlock
  return blockDauer(anfang) + blockDauer(ende)
}

/**
 * Calculate the time budget for a Treffen.
 *
 * @param planung — the Planung this Treffen belongs to
 * @param treffen — the Treffen to calculate for
 * @param stammTreffen — the matching StammTreffen (if this Treffen corresponds to one)
 * @param kontext — the global StammKontext (if loaded)
 */
export function zeitbudgetFuerTreffen(
  planung: Planung,
  treffen: Treffen,
  stammTreffen?: StammTreffen,
  kontext?: StammKontext,
): ZeitbudgetInfo {
  // Brutto: from StammTreffen if available, otherwise from Planung defaults
  const brutto = stammTreffen?.dauerMin ?? planung.dauerMinuten
  const stammAbzug = stammAbzugFuerTreffen(stammTreffen, kontext)
  // Extra-Termine vom Typ "aktion" haben i.d.R. keinen Team-Rahmen
  // (Detail-Planung ist ausgelagert). Sie zählen daher als 0 brutto.
  const isAktion = treffen.kind === 'extra-aktion'
  const bruttoMin = isAktion ? 0 : brutto
  const stammAbzugMin = isAktion ? 0 : stammAbzug
  const verfuegbarMin = Math.max(0, bruttoMin - stammAbzugMin)
  const istMin = treffen.programm.reduce((acc, p) => acc + p.dauerMin, 0)
  const auslastung = verfuegbarMin === 0 ? 0 : istMin / verfuegbarMin
  return {
    bruttoMin,
    stammAbzugMin,
    verfuegbarMin,
    istMin,
    auslastung,
    ueberbudget: istMin > verfuegbarMin,
  }
}

/**
 * Traffic-light based on schwelle (0..1).
 * 'green' when auslastung ≥ schwelle, 'over' when > 1, else 'neutral'.
 */
export type ZeitbudgetStatus = 'neutral' | 'green' | 'over'
export function zeitbudgetStatus(
  info: ZeitbudgetInfo,
  schwelle: number,
): ZeitbudgetStatus {
  if (info.ueberbudget) return 'over'
  if (info.auslastung >= schwelle) return 'green'
  return 'neutral'
}
