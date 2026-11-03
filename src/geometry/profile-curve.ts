import type { BottleConfig, ProfilePoint } from '@/model/config'

// The outline drawn with control points in the advanced mode. Each point is
// (t, w): t = 0 at the base … 1 at the rim, w = 0 at the narrowest … 1 at the
// widest outline the shape sliders allow (glass + 4 mm … glass + 40 mm). A
// monotone cubic runs through the points, so the curve never overshoots
// between them.

export const CONTROL_MIN_EXTRA = 4
export const CONTROL_MAX_EXTRA = 40

export const controlRadius = (b: Pick<BottleConfig, 'bodyDiameter'>, w: number) =>
  (b.bodyDiameter + CONTROL_MIN_EXTRA + w * (CONTROL_MAX_EXTRA - CONTROL_MIN_EXTRA)) / 2

export const controlWeight = (b: Pick<BottleConfig, 'bodyDiameter'>, r: number) =>
  Math.min(1, Math.max(0, (2 * r - b.bodyDiameter - CONTROL_MIN_EXTRA) / (CONTROL_MAX_EXTRA - CONTROL_MIN_EXTRA)))

/** w at height t, through points sorted by t (Fritsch–Carlson monotone cubic). */
export function evalControl(points: readonly ProfilePoint[], t: number): number {
  const n = points.length
  if (n === 0) return 0.5
  if (t <= points[0][0]) return points[0][1]
  if (t >= points[n - 1][0]) return points[n - 1][1]

  // Secant slopes, then tangents that keep each piece monotone
  const d: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const h = points[i + 1][0] - points[i][0]
    d.push(h > 0 ? (points[i + 1][1] - points[i][1]) / h : 0)
  }
  const m: number[] = [d[0]]
  for (let i = 1; i < n - 1; i++) m.push(d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2)
  m.push(d[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = 0
      m[i + 1] = 0
      continue
    }
    const a = m[i] / d[i]
    const b = m[i + 1] / d[i]
    const s = a * a + b * b
    if (s > 9) {
      const k = 3 / Math.sqrt(s)
      m[i] = k * a * d[i]
      m[i + 1] = k * b * d[i]
    }
  }

  let i = 0
  while (i < n - 2 && t > points[i + 1][0]) i++
  const [t0, w0] = points[i]
  const [t1, w1] = points[i + 1]
  const h = t1 - t0
  const u = (t - t0) / h
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1
  const h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2
  const h11 = u ** 3 - u ** 2
  return h00 * w0 + h10 * h * m[i] + h01 * w1 + h11 * h * m[i + 1]
}
