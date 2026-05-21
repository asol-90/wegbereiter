/**
 * Icon catalog — stroke-based line icons consistent with the wireframes.
 * All icons share a 24-viewBox and currentColor stroke, 2px default weight.
 *
 * To add a new icon: extend IconName union + ICONS map below. Prefer short
 * internal names (no 'icon-' prefix) since usage looks like `<Icon name="grid" />`.
 *
 * Renderer lives in Icon.tsx; this file is a pure data registry.
 */
import type { ReactNode } from 'react'

export type IconName =
  | 'grid' | 'calendar' | 'list' | 'book' | 'settings'
  | 'plus' | 'minus' | 'x' | 'check'
  | 'chevron-down' | 'chevron-up' | 'chevron-right' | 'chevron-left'
  | 'search' | 'link' | 'link-open' | 'drag-handle' | 'clock'
  | 'note' | 'info' | 'warning' | 'trash' | 'upload' | 'download'
  | 'file' | 'file-text' | 'user' | 'users' | 'edit' | 'preset'
  | 'layers' | 'zap' | 'tool' | 'music' | 'coffee' | 'flame'
  | 'compass' | 'map' | 'heart' | 'sun' | 'more-horizontal'
  | 'award' | 'book-open' | 'crosshair' | 'arrow-right'

const path = (d: string): ReactNode => <path d={d} />
const line = (x1: number, y1: number, x2: number, y2: number): ReactNode => (
  <line x1={x1} y1={y1} x2={x2} y2={y2} />
)
const rect = (x: number, y: number, w: number, h: number, r = 1.5): ReactNode => (
  <rect x={x} y={y} width={w} height={h} rx={r} />
)
const circle = (cx: number, cy: number, r: number): ReactNode => (
  <circle cx={cx} cy={cy} r={r} />
)

export const ICONS: Record<IconName, ReactNode> = {
  grid: <>{rect(3, 3, 7, 7)}{rect(14, 3, 7, 7)}{rect(3, 14, 7, 7)}{rect(14, 14, 7, 7)}</>,
  calendar: (
    <>
      {rect(3, 4, 18, 18, 2)}{line(16, 2, 16, 6)}{line(8, 2, 8, 6)}{line(3, 10, 21, 10)}
    </>
  ),
  list: (
    <>
      {line(9, 6, 20, 6)}{line(9, 12, 20, 12)}{line(9, 18, 20, 18)}
      {rect(3, 4.5, 3, 3, 0.5)}{rect(3, 10.5, 3, 3, 0.5)}{rect(3, 16.5, 3, 3, 0.5)}
    </>
  ),
  book: (
    <>
      {rect(2, 6, 16, 14, 2)}
      {path('M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2')}
      {path('M22 9v9a2 2 0 01-2 2')}
    </>
  ),
  settings: (
    <>
      {circle(12, 12, 3)}
      {path('M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z')}
    </>
  ),
  plus: <>{line(12, 5, 12, 19)}{line(5, 12, 19, 12)}</>,
  minus: line(5, 12, 19, 12),
  x: <>{line(6, 6, 18, 18)}{line(18, 6, 6, 18)}</>,
  check: path('M5 12l4 4L19 6'),
  'chevron-down': path('M6 9l6 6 6-6'),
  'chevron-up': path('M6 15l6-6 6 6'),
  'chevron-right': path('M9 6l6 6-6 6'),
  'chevron-left': path('M15 6l-6 6 6 6'),
  search: <>{circle(11, 11, 7)}{line(16, 16, 21, 21)}</>,
  link: (
    <>
      {path('M10 13a5 5 0 007 0l3-3a5 5 0 00-7-7l-1 1')}
      {path('M14 11a5 5 0 00-7 0l-3 3a5 5 0 007 7l1-1')}
    </>
  ),
  'link-open': (
    <>
      {/* Two hook halves pulled apart with "snap" strokes for a broken chain. */}
      {path('M18.84 12.25l1.72-1.71a5 5 0 00-.12-7.07 5 5 0 00-6.95 0l-1.72 1.71')}
      {path('M5.17 11.75l-1.71 1.71a5 5 0 00.12 7.07 5 5 0 006.95 0l1.71-1.71')}
      {line(8, 2, 8, 5)}{line(2, 8, 5, 8)}{line(16, 19, 16, 22)}{line(19, 16, 22, 16)}
    </>
  ),
  'drag-handle': (
    <>
      {circle(9, 6, 0.9)}{circle(15, 6, 0.9)}
      {circle(9, 12, 0.9)}{circle(15, 12, 0.9)}
      {circle(9, 18, 0.9)}{circle(15, 18, 0.9)}
    </>
  ),
  clock: <>{circle(12, 12, 10)}{path('M12 6v6l4 2')}</>,
  note: (
    <>
      {path('M4 5h16v12a2 2 0 01-2 2H6a2 2 0 01-2-2z')}
      {line(8, 10, 16, 10)}{line(8, 14, 13, 14)}
    </>
  ),
  info: <>{circle(12, 12, 10)}{line(12, 12, 12, 16)}{line(12, 8, 12.01, 8)}</>,
  warning: (
    <>
      {path('M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z')}
      {line(12, 9, 12, 13)}{line(12, 17, 12.01, 17)}
    </>
  ),
  trash: (
    <>
      {path('M3 6h18')}
      {path('M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2')}
      {path('M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6')}
    </>
  ),
  upload: (
    <>
      {path('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4')}
      {path('M17 8l-5-5-5 5')}{line(12, 3, 12, 15)}
    </>
  ),
  download: (
    <>
      {path('M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4')}
      {path('M7 10l5 5 5-5')}{line(12, 15, 12, 3)}
    </>
  ),
  file: (
    <>
      {path('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z')}
      {path('M14 2v6h6')}
    </>
  ),
  'file-text': (
    <>
      {path('M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z')}
      {path('M14 2v6h6')}{line(8, 13, 16, 13)}{line(8, 17, 13, 17)}
    </>
  ),
  user: <>{path('M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2')}{circle(12, 7, 4)}</>,
  users: (
    <>
      {path('M17 21v-2a4 4 0 00-3-3.87')}
      {path('M7 21v-2a4 4 0 014-4h0a4 4 0 014 4v2')}
      {circle(11, 7, 4)}
      {path('M16 3.13a4 4 0 010 7.75')}
    </>
  ),
  edit: path('M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5z'),
  preset: path('M12 2l2.4 7.2H22l-6 4.8 2.4 7.2L12 16.4l-6.4 4.8L8 14 2 9.2h7.6z'),
  layers: (
    <>
      {path('M12 2L2 7l10 5 10-5-10-5z')}
      {path('M2 17l10 5 10-5')}{path('M2 12l10 5 10-5')}
    </>
  ),
  zap: path('M13 2L3 14h9l-1 8 10-12h-9l1-8'),
  tool: path('M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z'),
  music: <>{path('M9 18V5l12-2v13')}{circle(6, 18, 3)}{circle(18, 16, 3)}</>,
  coffee: (
    <>
      {path('M18 8h1a4 4 0 010 8h-1')}
      {path('M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z')}
      {line(6, 1, 6, 4)}{line(10, 1, 10, 4)}{line(14, 1, 14, 4)}
    </>
  ),
  flame: path('M12 22c4-2.5 7-6 7-10a7 7 0 00-14 0c0 4 3 7.5 7 10zM12 13a2.5 2.5 0 100-5 2.5 2.5 0 000 5z'),
  compass: (
    <>
      {circle(12, 12, 10)}
      {path('M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z')}
    </>
  ),
  map: (
    <>
      {path('M1 6v16l7-4 8 4 7-4V2l-7 4-8-4-7 4z')}
      {line(8, 2, 8, 18)}{line(16, 6, 16, 22)}
    </>
  ),
  heart: path('M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z'),
  sun: (
    <>
      {circle(12, 12, 5)}
      {line(12, 1, 12, 3)}{line(12, 21, 12, 23)}
      {line(4.22, 4.22, 5.64, 5.64)}{line(18.36, 18.36, 19.78, 19.78)}
      {line(1, 12, 3, 12)}{line(21, 12, 23, 12)}
      {line(4.22, 19.78, 5.64, 18.36)}{line(18.36, 5.64, 19.78, 4.22)}
    </>
  ),
  'more-horizontal': <>{circle(12, 12, 1)}{circle(19, 12, 1)}{circle(5, 12, 1)}</>,
  award: <>{circle(12, 8, 6)}{path('M8.21 13.89L7 23l5-3 5 3-1.21-9.12')}</>,
  'book-open': (
    <>
      {path('M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z')}
      {path('M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z')}
    </>
  ),
  crosshair: (
    <>
      {circle(12, 12, 10)}{circle(12, 12, 3)}
      {line(22, 12, 18, 12)}{line(2, 12, 6, 12)}
      {line(12, 2, 12, 6)}{line(12, 22, 12, 18)}
    </>
  ),
  'arrow-right': <>{line(5, 12, 19, 12)}{path('M13 6l6 6-6 6')}</>,
}
