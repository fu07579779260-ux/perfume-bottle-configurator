import type { DesignConfig, ProfilePoint } from '@/model/config'
import { PROFILE_POINTS_MAX } from '@/model/config'
import { controlWeight } from './profile-curve'
import { shellLayout, shellProfile } from './shell'

/** Outer radius of the shell's outline at height y (interpolated on the profile). */
function outlineRadius(config: DesignConfig, y: number): number {
  const outer = shellProfile(config).filter((p) => p.side === 'outer' && p.r > 0)
  for (let i = 1; i < outer.length; i++) {
    const a = outer[i - 1]
    const b = outer[i]
    if ((a.y - y) * (b.y - y) <= 0 && a.y !== b.y) return a.r + ((b.r - a.r) * (y - a.y)) / (b.y - a.y)
  }
  return outer[outer.length - 1]?.r ?? 0
}

/** Six control points that follow the current silhouette, as a starting point for drawing. */
export function controlPointsFromSilhouette(config: DesignConfig): ProfilePoint[] {
  const plain = { ...config, mode: { advanced: false } }
  const l = shellLayout(plain)
  // Sample just inside the ends, past the base and rim rounding
  const ts = [0, 0.2, 0.4, 0.6, 0.8, 1]
  return ts.map((t) => {
    const y = l.bottomY + l.corner + 0.5 + t * (l.height - 2 * l.corner - 1)
    return [t, Number(controlWeight(config.bottle, outlineRadius(plain, y)).toFixed(3))] as const
  })
}

/** Add a point in the middle of the widest gap; unchanged when already at the maximum. */
export function addControlPoint(points: ProfilePoint[]): ProfilePoint[] {
  if (points.length >= PROFILE_POINTS_MAX) return points
  let gap = 0
  let at = 0
  for (let i = 1; i < points.length; i++) {
    const g = points[i][0] - points[i - 1][0]
    if (g > gap) {
      gap = g
      at = i
    }
  }
  const [t0, w0] = points[at - 1]
  const [t1, w1] = points[at]
  const added: ProfilePoint = [Number(((t0 + t1) / 2).toFixed(3)), Number(((w0 + w1) / 2).toFixed(3))]
  return [...points.slice(0, at), added, ...points.slice(at)]
}
