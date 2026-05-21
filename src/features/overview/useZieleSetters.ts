/**
 * Build the setters object for WizardStep3Ziele.
 * Each setter wraps the underlying useState setter so it also clears the
 * relevant section error when the user changes the value.
 */
import { type Dispatch, type SetStateAction } from 'react'
import type { Altersstufe, WbSchwerpunktModus } from '@/domain/types'
import type { AbzeichenId, AndachtsEinheitId, AndachtsreiheId } from '@/domain/ids'
import { type WBKey } from '@/domain/wb'
import { type AndachtMode } from './newPlanungWizardUtils'
import type { useZieleErrors } from './useZieleErrors'

export type ZieleSettersInput = {
  setWbModus: Dispatch<SetStateAction<WbSchwerpunktModus>>
  setWbBereiche: Dispatch<SetStateAction<WBKey[]>>
  setAndachtMode: Dispatch<SetStateAction<AndachtMode>>
  setAndachtReiheId: Dispatch<SetStateAction<AndachtsreiheId | null>>
  setAndachtAusgewaehlt: Dispatch<SetStateAction<Set<AndachtsEinheitId>>>
  setAndachtTitel: Dispatch<SetStateAction<string>>
  setAndachtEinheiten: Dispatch<SetStateAction<{ id: AndachtsEinheitId; titel: string }[]>>
  setSelectedAltersstufe: Dispatch<SetStateAction<Altersstufe | null>>
  setSelectedAbzeichenId: Dispatch<SetStateAction<AbzeichenId | null>>
  zieleErrors: ReturnType<typeof useZieleErrors>
}

export function useZieleSetters(input: ZieleSettersInput) {
  const { zieleErrors } = input
  return {
    setWbModus: (m: WbSchwerpunktModus) => { input.setWbModus(m); zieleErrors.clear('wb') },
    setWbBereiche: (b: WBKey[]) => { input.setWbBereiche(b); zieleErrors.clear('wb') },
    setAndachtMode: (m: AndachtMode) => { input.setAndachtMode(m); zieleErrors.clear('andacht') },
    setAndachtReiheId: (id: AndachtsreiheId | null) => { input.setAndachtReiheId(id); zieleErrors.clear('andacht') },
    setAndachtAusgewaehlt: (s: Set<AndachtsEinheitId>) => { input.setAndachtAusgewaehlt(s); zieleErrors.clear('andacht') },
    setAndachtTitel: (t: string) => { input.setAndachtTitel(t); zieleErrors.clear('andacht') },
    setAndachtEinheiten: (e: { id: AndachtsEinheitId; titel: string }[]) => { input.setAndachtEinheiten(e); zieleErrors.clear('andacht') },
    setSelectedAltersstufe: (s: Altersstufe | null) => { input.setSelectedAltersstufe(s); zieleErrors.clear('abzeichen') },
    setSelectedAbzeichenId: (id: AbzeichenId | null) => { input.setSelectedAbzeichenId(id); zieleErrors.clear('abzeichen') },
  }
}
