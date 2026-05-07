/**
 * Branded ID types — prevent accidental mixing of Planung/Treffen/Aktivität IDs.
 * Use `newId()` for generation at runtime.
 */
export type Brand<K, T> = K & { readonly __brand: T }

export type PlanungId = Brand<string, 'PlanungId'>
export type TreffenId = Brand<string, 'TreffenId'>
export type ProgrammpunktId = Brand<string, 'ProgrammpunktId'>
export type MitarbeiterId = Brand<string, 'MitarbeiterId'>
export type AktivitaetId = Brand<string, 'AktivitaetId'>
export type AndachtsreiheId = Brand<string, 'AndachtsreiheId'>
export type AndachtsEinheitId = Brand<string, 'AndachtsEinheitId'>
export type AbzeichenId = Brand<string, 'AbzeichenId'>
export type AbzeichenAnforderungId = Brand<string, 'AbzeichenAnforderungId'>
export type StammImportId = Brand<string, 'StammImportId'>
export type StammKontextId = Brand<string, 'StammKontextId'>
export type StammTreffenId = Brand<string, 'StammTreffenId'>
export type StammAktionId = Brand<string, 'StammAktionId'>
export type AbwesenheitId = Brand<string, 'AbwesenheitId'>

export function newId<T extends string>(): T {
  // UUID-v4-ish; falls back to Math.random on older runtimes.
  const cryptoObj =
    typeof globalThis !== 'undefined' && globalThis.crypto
      ? (globalThis.crypto as Crypto)
      : undefined
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID() as T
  const hex = (n: number) => Math.floor(Math.random() * 16 ** n).toString(16).padStart(n, '0')
  return `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}` as T
}
