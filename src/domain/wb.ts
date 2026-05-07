/**
 * Wachstumsbereiche (WB) — four dimensions along which activities are classified.
 * Order is canonical and used throughout the UI (matches wireframe legends).
 */
export const WB_KEYS = ['koerperlich', 'gesellschaftlich', 'geistig', 'geistlich'] as const
export type WBKey = (typeof WB_KEYS)[number]

export const WB_LABELS: Record<WBKey, string> = {
  koerperlich: 'körperlich',
  gesellschaftlich: 'gesellschaftlich',
  geistig: 'geistig',
  geistlich: 'geistlich',
}

export const WB_CSS_VAR: Record<WBKey, string> = {
  koerperlich: '--wb-k',
  gesellschaftlich: '--wb-g',
  geistig: '--wb-i',
  geistlich: '--wb-s',
}

/**
 * WB tag with normalized intensity 0..1.
 * Convention: 0 = keine, 0.33 = etwas, 0.66 = mittel, 1 = stark.
 */
export type WBTag = {
  key: WBKey
  intensity: number
}

/**
 * Named intensity steps for the command-menu "WB-Intensität" segmented control.
 */
export const WB_STEPS = [
  { label: '–', value: 0 },
  { label: 'etwas', value: 0.33 },
  { label: 'mittel', value: 0.66 },
  { label: 'stark', value: 1 },
] as const

/**
 * Characterization of the WB distribution — wertneutral.
 * 'Ausgewogen' means all four bereiche are roughly equal.
 */
export type WBCharacter =
  | { kind: 'ausgewogen' }
  | { kind: 'tendenz'; keys: WBKey[] }
  | { kind: 'fokus'; keys: WBKey[] }
  | { kind: 'dominant'; keys: WBKey[] }
