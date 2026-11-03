import { scaleOutline, traceOutline, type InkGrid, type Outline } from '@/geometry/trace'

// Draw text or an image on a canvas and trace it into outlines. Text uses the
// fonts already on the device (including Chinese ones), so no font file has
// to be downloaded; the exact letter shapes follow the device's fonts.

/** Drawing resolution: pixels per millimetre */
const PX_PER_MM = 12
/** Bold, so strokes are thick enough to print */
const TEXT_FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Helvetica Neue", Arial, sans-serif'
const NUMBER_FONT = 'ui-monospace, Consolas, "Cascadia Mono", monospace'
const LINE_HEIGHT = 1.15

function inkFrom(ctx: CanvasRenderingContext2D, w: number, h: number, rule: 'alpha' | 'dark'): InkGrid {
  const data = ctx.getImageData(0, 0, w, h).data
  const ink = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) {
    const [r, g, b, a] = [data[i * 4], data[i * 4 + 1], data[i * 4 + 2], data[i * 4 + 3]]
    ink[i] = rule === 'alpha' ? (a > 127 ? 1 : 0) : a > 127 && 0.299 * r + 0.587 * g + 0.114 * b < 128 ? 1 : 0
  }
  return { width: w, height: h, ink }
}

/** Text (one or two lines) as outlines; `size` is the font size in mm. */
export function textOutline(text: string, size: number, font: 'text' | 'number' = 'text'): Outline {
  const lines = text.split('\n').filter((l) => l.trim())
  if (!lines.length) return []
  const px = Math.round(size * PX_PER_MM)
  const fontCss = `700 ${px}px ${font === 'number' ? NUMBER_FONT : TEXT_FONT}`
  const measure = document.createElement('canvas').getContext('2d')!
  measure.font = fontCss
  const pad = Math.ceil(px * 0.3)
  const w = Math.ceil(Math.max(...lines.map((l) => measure.measureText(l).width))) + 2 * pad
  const h = Math.ceil(lines.length * px * LINE_HEIGHT) + 2 * pad
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.font = fontCss
  ctx.fillStyle = '#000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  lines.forEach((line, i) => ctx.fillText(line, w / 2, pad + (i + 0.5) * px * LINE_HEIGHT))
  return traceOutline(inkFrom(ctx, w, h, 'alpha'), PX_PER_MM)
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('unreadable image'))
    img.src = url
  })
}

/** Longest side of a logo when drawn for tracing */
const LOGO_PX = 600

/**
 * An uploaded logo (SVG, or a black-and-white PNG / JPG) as outlines, 1 mm
 * per 12 px; scale it with `scaleOutline` to the size wanted. Images with
 * transparency use every opaque pixel as ink; opaque images use the dark ones.
 */
export async function imageOutline(file: File): Promise<Outline> {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const scale = LOGO_PX / Math.max(img.naturalWidth || LOGO_PX, img.naturalHeight || LOGO_PX)
    const w = Math.max(1, Math.round((img.naturalWidth || LOGO_PX) * scale))
    const h = Math.max(1, Math.round((img.naturalHeight || LOGO_PX) * scale))
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(img, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h).data
    let transparent = false
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 128) {
        transparent = true
        break
      }
    }
    return traceOutline(inkFrom(ctx, w, h, transparent ? 'alpha' : 'dark'), PX_PER_MM, 0.8)
  } finally {
    URL.revokeObjectURL(url)
  }
}

export { scaleOutline }
