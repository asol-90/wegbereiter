/**
 * Drag-to-assign payload — transferred via native HTML DnD from the
 * Kontextleiste onto TreffenKarten.
 *
 * The MIME type is used as dataTransfer key to distinguish our drag items
 * from other drag sources (e.g. file drops).
 */
import type {AbzeichenAnforderungId, AktivitaetId, AndachtsEinheitId, StammAktionId} from '@/domain/ids'
import type {AktivitaetTyp, AktivitaetUntertyp} from '@/domain/types'
import type {WBTag} from '@/domain/wb'

export const KONTEXT_DRAG_MIME = 'application/x-kontext-drag'

export type KontextDragPayload =
  | {
      kind: 'andacht'
      einheitId: AndachtsEinheitId
      label: string
    }
  | {
      kind: 'abzeichen'
      anforderungId: AbzeichenAnforderungId
      label: string
      typ: AktivitaetTyp
      untertyp?: AktivitaetUntertyp
      dauerMin: number
    }
  | {
      kind: 'stammaktion'
      aktionId: StammAktionId
      label: string
    }
  | {
      kind: 'aktivitaet'
      aktivitaetId: AktivitaetId
      label: string
      typ: AktivitaetTyp
      untertyp?: AktivitaetUntertyp
      dauerMin: number
      wbTags: WBTag[]
    }

export function encodePayload(payload: KontextDragPayload): string {
  return JSON.stringify(payload)
}

const VALID_KINDS: ReadonlySet<KontextDragPayload['kind']> = new Set([
  'andacht', 'abzeichen', 'stammaktion', 'aktivitaet',
])

export function decodePayload(data: string): KontextDragPayload | null {
  try {
    const parsed: unknown = JSON.parse(data)
    if (typeof parsed !== 'object' || parsed === null) return null
    const kind = (parsed as { kind?: unknown }).kind
    if (typeof kind !== 'string' || !VALID_KINDS.has(kind as KontextDragPayload['kind'])) return null
    return parsed as KontextDragPayload
  } catch {
    return null
  }
}
