// Seeded 2D gradient noise (Perlin) that wraps around in X, so a pattern
// unrolled around a shell meets itself without a seam.

function hash(seed: number, i: number, j: number): number {
  let h = Math.imul(i, 374761393) ^ Math.imul(j, 668265263) ^ Math.imul(seed, 2147483647)
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const fade = (t: number) => t * t * t * (t * (t * 6 - 15) + 10)

/**
 * Noise at (x, y) in lattice units, repeating every `period` units in x.
 * Values lie roughly in −0.7 … 0.7 and cross zero along meandering lines.
 */
export function periodicNoise(seed: number, x: number, y: number, period: number): number {
  const x0 = Math.floor(x)
  const y0 = Math.floor(y)
  const fx = x - x0
  const fy = y - y0
  const dot = (i: number, j: number, dx: number, dy: number) => {
    const a = hash(seed, ((i % period) + period) % period, j) * Math.PI * 2
    return Math.cos(a) * dx + Math.sin(a) * dy
  }
  const n00 = dot(x0, y0, fx, fy)
  const n10 = dot(x0 + 1, y0, fx - 1, fy)
  const n01 = dot(x0, y0 + 1, fx, fy - 1)
  const n11 = dot(x0 + 1, y0 + 1, fx - 1, fy - 1)
  const u = fade(fx)
  const v = fade(fy)
  return (n00 * (1 - u) + n10 * u) * (1 - v) + (n01 * (1 - u) + n11 * u) * v
}
