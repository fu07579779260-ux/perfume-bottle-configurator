import { describe, expect, it } from 'vitest'
import { loopArea, outlineSize, scaleOutline, simplifyLoop, traceLoops, traceOutline, type InkGrid } from './trace'

/** Grid from rows of '#' (ink) and '.' (paper). */
function grid(rows: string[]): InkGrid {
  const height = rows.length
  const width = rows[0].length
  const ink = new Uint8Array(width * height)
  rows.forEach((row, y) => [...row].forEach((ch, x) => (ink[y * width + x] = ch === '#' ? 1 : 0)))
  return { width, height, ink }
}

describe('traceLoops', () => {
  it('outlines a filled square as one loop', () => {
    const loops = traceLoops(grid(['....', '.##.', '.##.', '....']))
    expect(loops).toHaveLength(1)
    // Midpoint outline of a 2 × 2 block encloses 2 × 2 − 4 · ⅛ = 3.5 px²
    expect(Math.abs(loopArea(loops[0]))).toBeCloseTo(3.5)
  })

  it('finds the hole in a ring as a second loop with the opposite turn', () => {
    const loops = traceLoops(grid(['.....', '.###.', '.#.#.', '.###.', '.....']))
    expect(loops).toHaveLength(2)
    const [a, b] = loops.map(loopArea)
    expect(Math.sign(a)).not.toBe(Math.sign(b))
  })

  it('keeps two separate blobs apart, also when they touch at a corner', () => {
    expect(traceLoops(grid(['#..#', '....', '#..#']))).toHaveLength(4)
    expect(traceLoops(grid(['#.', '.#']))).toHaveLength(2)
  })

  it('closes outlines that touch the edge of the grid', () => {
    const loops = traceLoops(grid(['##', '##']))
    expect(loops).toHaveLength(1)
  })
})

describe('simplifyLoop', () => {
  it('drops points on straight edges', () => {
    const square: [number, number][] = []
    for (let i = 0; i < 10; i++) square.push([i, 0])
    for (let i = 0; i < 10; i++) square.push([10, i])
    for (let i = 10; i > 0; i--) square.push([i, 10])
    for (let i = 10; i > 0; i--) square.push([0, i])
    expect(simplifyLoop(square, 0.1).length).toBeLessThanOrEqual(5)
  })
})

describe('traceOutline', () => {
  it('converts to mm, centred, with y up', () => {
    // A 10 × 4 px bar at 2 px per mm: 5 × 2 mm
    const rows = ['............', '.##########.', '.##########.', '.##########.', '.##########.', '............']
    const o = traceOutline(grid(rows), 2)
    const s = outlineSize(o)
    expect(s.width).toBeCloseTo(5, 1)
    expect(s.height).toBeCloseTo(2, 1)
    const ys = o[0].map(([, y]) => y)
    expect(Math.max(...ys) + Math.min(...ys)).toBeCloseTo(0)
  })

  it('scales to a width', () => {
    const o = traceOutline(grid(['....', '.##.', '.##.', '....']), 1)
    expect(outlineSize(scaleOutline(o, 20)).width).toBeCloseTo(20)
  })
})
