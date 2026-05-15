import type { Treffen, Mitarbeiter, Programmpunkt, StammBlock, AktivitaetTyp, AktivitaetUntertyp } from '@/domain/types'
import type { TreffenId, ProgrammpunktId, MitarbeiterId } from '@/domain/ids'
import type { WBKey } from '@/domain/wb'

/** Distributive Omit — preserves discriminated-union variants. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never

export type ProgrammpunktInput = DistributiveOmit<Programmpunkt, 'id'>

export type TreffenMutations = {
  setTitel: (treffenId: TreffenId, titel: string) => void
  setNotiz: (treffenId: TreffenId, notiz: string) => void
  toggleFixiert: (treffenId: TreffenId) => void
  toggleSollWB: (treffenId: TreffenId, key: WBKey) => void
  addProgrammpunkt: (treffenId: TreffenId, pp: ProgrammpunktInput) => void
  removeProgrammpunkt: (treffenId: TreffenId, ppId: ProgrammpunktId) => void
  updateProgrammpunkt: (
    treffenId: TreffenId,
    ppId: ProgrammpunktId,
    patch: Partial<Pick<Programmpunkt, 'name' | 'dauerMin' | 'verantwortlicherId' | 'gastName'>>,
  ) => void
  reorderProgrammpunkte: (treffenId: TreffenId, orderedIds: ProgrammpunktId[]) => void
  replaceProgrammpunkt: (treffenId: TreffenId, oldPpId: ProgrammpunktId, pp: ProgrammpunktInput) => void
}

export type StammBlocksForTreffen = {
  anfangsBlock: StammBlock[]
  endBlock: StammBlock[]
  /** Total Stamm minutes (sum of both blocks). */
  stammMin: number
}

export type TreffenKarteProps = {
  treffen: Treffen
  dauerMinuten: number
  team: Mitarbeiter[]
  zeitbalkenSchwelle: number
  mutations: TreffenMutations
  onAddClick: (treffenId: TreffenId) => void
  /** Opens the Command-Menu pre-filtered to the given type for "Konkretisieren". */
  onKonkretisieren?: (treffenId: TreffenId, ppId: ProgrammpunktId, typ: AktivitaetTyp, untertyp?: AktivitaetUntertyp) => void
  /** Resolved Stamm blocks for this meeting (undefined = no context). */
  stammBlocks?: StammBlocksForTreffen
  /** IDs of team members absent on this Treffen's date. */
  abwesendeIds?: Set<MitarbeiterId>
}
