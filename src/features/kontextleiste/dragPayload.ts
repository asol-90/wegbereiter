/**
 * Drag-to-assign payload — transferred via native HTML DnD from the
 * Kontextleiste onto TreffenKarten.
 *
 * The MIME type is used as dataTransfer key to distinguish our drag items
 * from other drag sources (e.g. file drops).
 */
import type { AktivitaetTyp, AktivitaetUntertyp, WBTag } from '@/domain/types'
import type { AktivitaetId, AndachtsEinheitId, AbzeichenAnforderungId, StammAktionId } from '@/domain/ids'

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

export function decodePayload(data: string): KontextDragPayload | null {
  try {
    return JSON.parse(data) as KontextDragPayload
  } catch {
    return null
  }
}
