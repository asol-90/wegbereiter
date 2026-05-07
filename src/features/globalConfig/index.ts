/**
 * Public barrel for the GlobalConfig feature slice.
 */
export {
  globalConfigStore,
  GlobalConfigStore,
} from './globalConfigStore'
export type { GlobalConfigState } from './globalConfigStore'
export { GlobalConfigProvider } from './GlobalConfigProvider'
export {
  useGlobalConfig,
  useGlobalConfigActions,
} from './useGlobalConfig'
export type {
  GlobalConfigActions,
  UseGlobalConfigResult,
} from './useGlobalConfig'
