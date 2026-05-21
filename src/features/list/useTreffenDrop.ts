/**
 * useTreffenDrop — accepts drops from the Kontextleiste and turns each
 * payload kind into the matching addProgrammpunkt mutation. Owns the
 * dragOver visual state.
 */
import { useCallback, useState, type DragEvent } from 'react'
import { KONTEXT_DRAG_MIME, decodePayload } from '@/features/kontextleiste'
import type { TreffenId } from '@/domain/ids'
import type { TreffenMutations } from './treffenKarteTypes'

export function useTreffenDrop(tid: TreffenId, mutations: TreffenMutations) {
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback((e: DragEvent) => {
    if (e.dataTransfer.types.includes(KONTEXT_DRAG_MIME)) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'copy'
      setDragOver(true)
    }
  }, [])

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleDrop = useCallback(
    (e: DragEvent) => {
      setDragOver(false)
      const raw = e.dataTransfer.getData(KONTEXT_DRAG_MIME)
      if (!raw) return
      e.preventDefault()
      const payload = decodePayload(raw)
      if (!payload) return
      applyDrop(tid, mutations, payload)
    },
    [tid, mutations],
  )

  return { dragOver, handleDragOver, handleDragLeave, handleDrop }
}

type Payload = NonNullable<ReturnType<typeof decodePayload>>

function applyDrop(tid: TreffenId, mutations: TreffenMutations, payload: Payload) {
  switch (payload.kind) {
    case 'andacht':
      mutations.addProgrammpunkt(tid, {
        kind: 'abstrakt',
        name: payload.label,
        typ: 'andacht-gespraech',
        untertyp: 'andacht',
        wbTags: [{ key: 'geistlich', intensity: 0.66 }],
        dauerMin: 10,
        andachtsEinheitId: payload.einheitId,
      })
      return
    case 'abzeichen':
      mutations.addProgrammpunkt(tid, {
        kind: 'abstrakt',
        name: payload.label,
        typ: payload.typ,
        untertyp: payload.untertyp,
        wbTags: [],
        dauerMin: payload.dauerMin,
      })
      return
    case 'stammaktion':
      mutations.addProgrammpunkt(tid, {
        kind: 'abstrakt',
        name: payload.label,
        typ: 'stammformat',
        wbTags: [],
        dauerMin: 30,
      })
      return
    case 'aktivitaet':
      mutations.addProgrammpunkt(tid, {
        kind: 'konkret',
        name: payload.label,
        aktivitaetId: payload.aktivitaetId,
        typ: payload.typ,
        untertyp: payload.untertyp,
        wbTags: payload.wbTags,
        dauerMin: payload.dauerMin,
      })
      return
  }
}
