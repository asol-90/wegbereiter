/**
 * Public barrel for the GlobalConfig feature slice.
 */
export { GlobalConfigProvider } from './GlobalConfigProvider'
export {
  GlobalConfigStore, globalConfigStore
} from './globalConfigStore'
export type { GlobalConfigState } from './globalConfigStore'
export {
  useGlobalConfig,
  useGlobalConfigActions
} from './useGlobalConfig'
export type {
  GlobalConfigActions,
  UseGlobalConfigResult
} from './useGlobalConfig'
