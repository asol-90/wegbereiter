/**
 * Auto-extend the "ende" field once Ferien data finishes loading.
 *
 * Uses the "store-previous-ref + compute-during-render" pattern instead of
 * useEffect to avoid the cascading setState risk. Stays out of the body to
 * keep it tidy.
 */
import { useState } from 'react'
import type { IsoDate } from '@/domain/types'
import { smartDefaultEnd } from './newPlanungWizardUtils'
import type { FerienState } from './useFerienForYear'

export type WizardFerienAutoEndArgs = {
  start: IsoDate
  hasKontext: boolean
  ferien1: FerienState
  ferien2: FerienState
  endeWasAutoSet: boolean
  setEnde: (iso: IsoDate) => void
}

export function useWizardFerienAutoEnd({
  start, hasKontext, ferien1, ferien2, endeWasAutoSet, setEnde,
}: WizardFerienAutoEndArgs) {
  const [prevRefs, setPrevRefs] = useState<[FerienState, FerienState]>([ferien1, ferien2])
  if (prevRefs[0] !== ferien1 || prevRefs[1] !== ferien2) {
    setPrevRefs([ferien1, ferien2])
    if (endeWasAutoSet && !hasKontext) {
      const smart = smartDefaultEnd(start, ferien1?.ferien, ferien2?.ferien)
      if (smart && smart > start) setEnde(smart)
    }
  }
}
