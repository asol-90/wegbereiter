/**
 * TreffenKarte — interactive meeting card for the Terminliste (§8.1 + §9).
 *
 * Supports: inline title/note editing, lock toggle, Soll-WB selection,
 * programmpunkt inline-edit (name, duration, responsible), delete, and
 * drag-reorder with live preview via @dnd-kit/sortable.
 *
 * All mutations auto-save via useTreffenMutations.
 * Layout mirrors meeting-card-wireframes.html v9.
 */
import { useState, useRef, useCallback, useMemo } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import {
  KONTEXT_DRAG_MIME,
  decodePayload,
} from '@/features/kontextleiste'
import { WB_KEYS } from '@/domain/wb'
import { DurationBar } from '@/ui/domain/DurationBar'
import { WBDot } from '@/ui/domain/WBDot'
import { Icon } from '@/ui/primitives/Icon'
import { Avatar } from '@/ui/domain/Avatar'
import clsx from '@/ui/utils/clsx'
import styles from './TreffenKarte.module.css'
import type { TreffenMutations, StammBlocksForTreffen, TreffenKarteProps } from './treffenKarteTypes'
import { SortableProgrammpunktRow, StammBlockRow } from './SortableProgrammpunktRow'
import type { TreffenId, ProgrammpunktId } from '@/domain/ids'

export type { TreffenMutations, StammBlocksForTreffen, TreffenKarteProps }

// ─── Date formatting ────────────────────────────────────────────────────────

const WEEKDAY_SHORT = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'] as const

function formatDate(iso: string) {
  const d = new Date(iso)
  return {
    weekday: WEEKDAY_SHORT[d.getDay()],
    day: d.getDate(),
    month: (d.getMonth() + 1).toString().padStart(2, '0'),
  }
}

// ─── WB aggregation ─────────────────────────────────────────────────────────

import type { Treffen } from '@/domain/types'

function aggregateWB(treffen: Treffen): Map<string, number> {
  const map = new Map<string, number>()
  for (const pp of treffen.programm) {
    for (const tag of pp.wbTags) {
      const cur = map.get(tag.key) ?? 0
      map.set(tag.key, Math.max(cur, tag.intensity))
    }
  }
  return map
}

// ─── Lock icon SVGs ─────────────────────────────────────────────────────────

function LockOpen() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  )
}

function LockClosed() {
  return (
    <svg viewBox="0 0 24 24" width={13} height={13} fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x={3} y={11} width={18} height={11} rx={2} ry={2} />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}

// ─── Main component ─────────────────────────────────────────────────────────

export function TreffenKarte({
  treffen,
  dauerMinuten,
  team,
  zeitbalkenSchwelle,
  mutations,
  onAddClick,
  onKonkretisieren,
  stammBlocks,
  abwesendeIds,
}: TreffenKarteProps) {
  const tid = treffen.id as TreffenId

  // ─── Kontextleiste drop target ─────────────────────────────────────
  const [dragOver, setDragOver] = useState(false)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (e.dataTransfer.types.includes(KONTEXT_DRAG_MIME)) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
        setDragOver(true)
      }
    },
    [],
  )

  const handleDragLeave = useCallback(() => setDragOver(false), [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      setDragOver(false)
      const raw = e.dataTransfer.getData(KONTEXT_DRAG_MIME)
      if (!raw) return
      e.preventDefault()
      const payload = decodePayload(raw)
      if (!payload) return

      switch (payload.kind) {
        case 'andacht': {
          mutations.addProgrammpunkt(tid, {
            kind: 'abstrakt',
            name: payload.label,
            typ: 'andacht-gespraech',
            untertyp: 'andacht',
            wbTags: [{ key: 'geistlich', intensity: 0.66 }],
            dauerMin: 10,
            andachtsEinheitId: payload.einheitId,
          })
          break
        }
        case 'abzeichen': {
          mutations.addProgrammpunkt(tid, {
            kind: 'abstrakt',
            name: payload.label,
            typ: payload.typ,
            untertyp: payload.untertyp,
            wbTags: [],
            dauerMin: payload.dauerMin,
          })
          break
        }
        case 'stammaktion': {
          mutations.addProgrammpunkt(tid, {
            kind: 'abstrakt',
            name: payload.label,
            typ: 'stammformat',
            wbTags: [],
            dauerMin: 30,
          })
          break
        }
        case 'aktivitaet': {
          mutations.addProgrammpunkt(tid, {
            kind: 'konkret',
            name: payload.label,
            aktivitaetId: payload.aktivitaetId,
            typ: payload.typ,
            untertyp: payload.untertyp,
            wbTags: payload.wbTags,
            dauerMin: payload.dauerMin,
          })
          break
        }
      }
    },
    [treffen.id, mutations],
  )
  const { weekday, day, month } = formatDate(treffen.datum)
  const wbMap = aggregateWB(treffen)
  const teamIst = treffen.programm.reduce((sum, p) => sum + p.dauerMin, 0)
  const stammMinTotal = stammBlocks?.stammMin ?? 0
  const ist = teamIst + stammMinTotal
  const tMin = zeitbalkenSchwelle
  const tMax = Math.min(1, zeitbalkenSchwelle + 0.1)

  // ─── Inline title editing ───────────────────────────────────────────
  const [localTitel, setLocalTitel] = useState(treffen.titel ?? '')
  const titelRef = useRef<HTMLInputElement>(null)

  const commitTitel = useCallback(() => {
    const trimmed = localTitel.trim()
    if (trimmed !== (treffen.titel ?? '')) {
      mutations.setTitel(tid, trimmed)
    }
  }, [localTitel, treffen.titel, mutations, tid])

  // ─── Note editing ───────────────────────────────────────────────────
  const [noteOpen, setNoteOpen] = useState(false)
  const [localNotiz, setLocalNotiz] = useState(treffen.notiz ?? '')

  const commitNotiz = useCallback(() => {
    setNoteOpen(false)
    const trimmed = localNotiz.trim()
    if (trimmed !== (treffen.notiz ?? '')) {
      mutations.setNotiz(tid, trimmed)
    }
  }, [localNotiz, treffen.notiz, mutations, tid])

  // ─── dnd-kit sortable ──────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const ppIds = useMemo(
    () => treffen.programm.map((p) => p.id),
    [treffen.programm],
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (!over || active.id === over.id) return
      const oldIdx = ppIds.indexOf(active.id as ProgrammpunktId)
      const newIdx = ppIds.indexOf(over.id as ProgrammpunktId)
      if (oldIdx < 0 || newIdx < 0) return
      const newOrder = arrayMove(ppIds, oldIdx, newIdx)
      mutations.reorderProgrammpunkte(tid, newOrder)
    },
    [ppIds, mutations, tid],
  )

  return (
    <article
      className={clsx(styles.card, dragOver && styles.cardDragOver)}
      id={`treffen-${treffen.id}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* ─── Head ─── */}
      <div className={styles.head}>
        <div className={styles.dateCell}>
          <button
            className={clsx(styles.lock, treffen.fixiert && styles.lockActive)}
            title={treffen.fixiert ? 'Fixierung aufheben' : 'Termin festhalten'}
            onClick={() => mutations.toggleFixiert(tid)}
          >
            {treffen.fixiert ? <LockClosed /> : <LockOpen />}
          </button>
          <span className={styles.weekday}>{weekday}</span>
          <span className={styles.dayNum}>
            {day}
            <span className={styles.month}>.{month}.</span>
          </span>
        </div>
        <input
          ref={titelRef}
          className={styles.titleInput}
          value={localTitel}
          onChange={(e) => setLocalTitel(e.target.value)}
          onBlur={commitTitel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') titelRef.current?.blur()
          }}
          placeholder="Titel hinzufügen"
        />
      </div>

      {/* ─── Body ─── */}
      <div className={styles.body}>
        {/* Left: meta column */}
        <div className={styles.metaCol}>
          <div>
            <div className={styles.blockLabel}>Wachstumsbereich</div>
            <div className={styles.wbDots}>
              {WB_KEYS.map((key) => {
                const intensity = wbMap.get(key) ?? 0
                const isSoll = treffen.sollWB.includes(key)
                return (
                  <div
                    key={key}
                    className={clsx(
                      styles.wbSlot,
                      isSoll && styles.wbSlotSoll,
                    )}
                    onClick={() => mutations.toggleSollWB(tid, key)}
                    title={`Soll-WB ${isSoll ? 'entfernen' : 'setzen'}: ${key}`}
                  >
                    <WBDot wb={key} intensity={intensity} size={11} />
                  </div>
                )
              })}
            </div>
          </div>

          {team.length > 0 && (
            <div>
              <div className={styles.blockLabel}>Mitarbeiter</div>
              <div style={{ display: 'flex', gap: 0 }}>
                {team.map((m, i) => {
                  const isAbsent = abwesendeIds?.has(m.id) ?? false
                  return (
                    <Avatar
                      key={m.id}
                      name={m.name}
                      initials={m.initials}
                      size={28}
                      tone={isAbsent ? 'muted' : 'auto'}
                      style={{
                        marginLeft: i > 0 ? -6 : 0,
                        opacity: isAbsent ? 0.35 : 1,
                        textDecoration: isAbsent ? 'line-through' : undefined,
                      }}
                      title={isAbsent ? `${m.name} (abwesend)` : m.name}
                    />
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right: content column */}
        <div className={styles.content}>
          {/* Note */}
          {noteOpen ? (
            <div className={styles.noteExpanded}>
              <Icon name="file" size={13} className={styles.noteIcon} />
              <textarea
                className={styles.noteTextarea}
                value={localNotiz}
                onChange={(e) => setLocalNotiz(e.target.value)}
                onBlur={commitNotiz}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    setLocalNotiz(treffen.notiz ?? '')
                    setNoteOpen(false)
                  }
                }}
                placeholder="Notiz hinzufügen"
                autoFocus
              />
            </div>
          ) : (
            <div
              className={styles.note}
              onClick={() => {
                setLocalNotiz(treffen.notiz ?? '')
                setNoteOpen(true)
              }}
            >
              <Icon name="file" size={13} className={styles.noteIcon} />
              <span
                className={clsx(
                  styles.noteText,
                  !treffen.notiz && styles.noteTextPlaceholder,
                )}
              >
                {treffen.notiz || 'Notiz hinzufügen'}
              </span>
            </div>
          )}

          {/* Anfangs-Blöcke (Stamm) */}
          {stammBlocks && stammBlocks.anfangsBlock.length > 0 && (
            <div className={styles.points}>
              {stammBlocks.anfangsBlock.map((b, i) => (
                <StammBlockRow key={`sa-${i}`} block={b} />
              ))}
            </div>
          )}

          {/* Programmpunkte with dnd-kit sortable */}
          {treffen.programm.length > 0 && (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={ppIds}
                strategy={verticalListSortingStrategy}
              >
                <div className={styles.points}>
                  {treffen.programm.map((pp) => (
                    <SortableProgrammpunktRow
                      key={pp.id}
                      pp={pp}
                      team={team}
                      treffenId={tid}
                      mutations={mutations}
                      onKonkretisieren={onKonkretisieren}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}

          <button className={styles.add} onClick={() => onAddClick(tid)}>
            <Icon name="plus" size={13} />
            Punkt hinzufügen
          </button>

          {/* End-Blöcke (Stamm) */}
          {stammBlocks && stammBlocks.endBlock.length > 0 && (
            <div className={styles.points}>
              {stammBlocks.endBlock.map((b, i) => (
                <StammBlockRow key={`se-${i}`} block={b} />
              ))}
            </div>
          )}

          <div className={styles.barRow}>
            <DurationBar
              ist={ist}
              verfuegbar={dauerMinuten}
              targetRange={[tMin, tMax]}
              stammMin={stammMinTotal}
              showLabel
            />
          </div>
        </div>
      </div>
    </article>
  )
}
