// Turn a black-and-white pixel grid (rendered text, an uploaded logo) into
// closed outline polygons in millimetres, ready to extrude. Marching squares
// finds the outlines between ink and paper; Ramer–Douglas–Peucker then drops
// points that lie on a straight line within the tolerance.

/** Outlines in mm, y up, centred on (0, 0). Holes are separate loops (even-odd fill). */
export type Outline = [number, number][][]

export interface InkGrid {
  width: number
  height: number
  /** 1 = ink, 0 = paper, row by row from the top */
  ink: Uint8Array
}

type P = [number, number]

/** Distance from p to the segment a–b. */
function segmentDistance(p: P, a: P, b: P): number {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const len = dx * dx + dy * dy
  const t = len ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len)) : 0
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

function simplifyOpen(points: P[], tolerance: number): P[] {
  if (points.length < 3) return points
  let worst = 0
  let index = 0
  for (let i = 1; i < points.length - 1; i++) {
    const d = segmentDistance(points[i], points[0], points[points.length - 1])
    if (d > worst) {
      worst = d
      index = i
    }
  }
  if (worst <= tolerance) return [points[0], points[points.length - 1]]
  const left = simplifyOpen(points.slice(0, index + 1), tolerance)
  const right = simplifyOpen(points.slice(index), tolerance)
  return [...left.slice(0, -1), ...right]
}

/** Simplify a closed loop: split it at its two farthest-apart points and simplify both halves. */
export function simplifyLoop(loop: P[], tolerance: number): P[] {
  if (loop.length < 4) return loop
  let far = 0
  let best = 0
  for (let i = 1; i < loop.length; i++) {
    const d = Math.hypot(loop[i][0] - loop[0][0], loop[i][1] - loop[0][1])
    if (d > best) {
      best = d
      far = i
    }
  }
  const a = simplifyOpen(loop.slice(0, far + 1), tolerance)
  const b = simplifyOpen([...loop.slice(far), loop[0]], tolerance)
  return [...a.slice(0, -1), ...b.slice(0, -1)]
}

/**
 * Marching squares over the grid (with a blank border, so every outline
 * closes). Returns loops in pixel coordinates (x right, y down), on the
 * midpoints between ink and paper pixels.
 */
export function traceLoops(grid: InkGrid): P[][] {
  const { width: w, height: h, ink } = grid
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : ink[y * w + x])
  // Each crossing is keyed by its position; segments link crossings
  const next = new Map<string, string>()
  const point = new Map<string, P>()
  const key = (x: number, y: number) => `${x},${y}`
  const add = (a: P, b: P) => {
    const ka = key(a[0], a[1])
    const kb = key(b[0], b[1])
    point.set(ka, a)
    point.set(kb, b)
    next.set(ka, kb)
  }

  // Cell (x, y) has samples at its corners (x, y) … (x + 1, y + 1)
  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const tl = at(x, y)
      const tr = at(x + 1, y)
      const br = at(x + 1, y + 1)
      const bl = at(x, y + 1)
      const c = tl * 8 + tr * 4 + br * 2 + bl
      if (c === 0 || c === 15) continue
      const top: P = [x + 0.5, y]
      const right: P = [x + 1, y + 0.5]
      const bottom: P = [x + 0.5, y + 1]
      const left: P = [x, y + 0.5]
      // Segments run with ink on their right (in y-down pixel space), so loops have a consistent turn
      switch (c) {
        case 1: add(bottom, left); break
        case 2: add(right, bottom); break
        case 3: add(right, left); break
        case 4: add(top, right); break
        case 5: add(top, right); add(bottom, left); break
        case 6: add(top, bottom); break
        case 7: add(top, left); break
        case 8: add(left, top); break
        case 9: add(bottom, top); break
        case 10: add(left, top); add(right, bottom); break
        case 11: add(right, top); break
        case 12: add(left, right); break
        case 13: add(bottom, right); break
        case 14: add(left, bottom); break
      }
    }
  }

  const loops: P[][] = []
  const seen = new Set<string>()
  for (const start of next.keys()) {
    if (seen.has(start)) continue
    const loop: P[] = []
    let k: string | undefined = start
    while (k !== undefined && !seen.has(k)) {
      seen.add(k)
      loop.push(point.get(k)!)
      k = next.get(k)
    }
    if (loop.length >= 3) loops.push(loop)
  }
  return loops
}

/**
 * Outlines in mm from an ink grid drawn at `pxPerMm`, centred on the middle
 * of the inked area. Tiny specks (under `minArea` mm²) are dropped.
 */
export function traceOutline(grid: InkGrid, pxPerMm: number, tolerancePx = 0.3, minArea = 0.05): Outline {
  const loops = traceLoops(grid).map((l) => simplifyLoop(l, tolerancePx))
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const l of loops) {
    for (const [x, y] of l) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  const out: Outline = []
  for (const l of loops) {
    const mm = l.map(([x, y]) => [(x - cx) / pxPerMm, -(y - cy) / pxPerMm] as [number, number])
    if (Math.abs(loopArea(mm)) >= minArea) out.push(mm)
  }
  return out
}

export function loopArea(loop: [number, number][]): number {
  let s = 0
  for (let i = 0; i < loop.length; i++) {
    const [x1, y1] = loop[i]
    const [x2, y2] = loop[(i + 1) % loop.length]
    s += x1 * y2 - x2 * y1
  }
  return s / 2
}

/** Width and height of an outline in mm. */
export function outlineSize(outline: Outline): { width: number; height: number } {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const l of outline) {
    for (const [x, y] of l) {
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)
    }
  }
  return outline.length ? { width: maxX - minX, height: maxY - minY } : { width: 0, height: 0 }
}

/** Scale an outline so it is `width` mm wide. */
export function scaleOutline(outline: Outline, width: number): Outline {
  const s = outlineSize(outline).width
  const k = s > 0 ? width / s : 1
  return outline.map((l) => l.map(([x, y]) => [x * k, y * k] as [number, number]))
}
