/**
 * Tiny classname joiner — accepts strings, falsy values, and objects.
 * Avoids an external dependency on the `clsx` package.
 */
type ClassValue =
  | string
  | number
  | null
  | undefined
  | false
  | Record<string, unknown>
  | ClassValue[]

export default function clsx(...parts: ClassValue[]): string {
  const out: string[] = []
  for (const p of parts) {
    if (!p) continue
    if (typeof p === 'string' || typeof p === 'number') {
      out.push(String(p))
    } else if (Array.isArray(p)) {
      const inner = clsx(...p)
      if (inner) out.push(inner)
    } else if (typeof p === 'object') {
      for (const [k, v] of Object.entries(p)) if (v) out.push(k)
    }
  }
  return out.join(' ')
}
