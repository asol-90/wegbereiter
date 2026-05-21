/**
 * Tiny hook to manage the per-section validation errors of the Ziele step.
 * Encapsulates the "clear-on-change" pattern so call-sites stay short.
 */
import { useCallback, useState } from 'react'
import { EMPTY_ZIELE_ERRORS, type ZieleErrors } from './wizardSubmit'

export type ZieleErrorField = keyof ZieleErrors

export function useZieleErrors() {
  const [errors, setErrors] = useState<ZieleErrors>(EMPTY_ZIELE_ERRORS)
  const clear = useCallback(
    (field: ZieleErrorField) => setErrors((prev) => ({ ...prev, [field]: null })),
    [],
  )
  const reset = useCallback(() => setErrors(EMPTY_ZIELE_ERRORS), [])
  return { errors, setErrors, clear, reset }
}
