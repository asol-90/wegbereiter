/**
 * Public barrel for the StammKontext feature slice.
 */
export { stammKontextStore, StammKontextStore } from './stammKontextStore'
export type { StammKontextState } from './stammKontextStore'
export { StammKontextProvider } from './StammKontextProvider'
export {
  useStammKontext,
  useStammKontextActions,
} from './useStammKontext'
export type {
  StammKontextActions,
  UseStammKontextResult,
} from './useStammKontext'
