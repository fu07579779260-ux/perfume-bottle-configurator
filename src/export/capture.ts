/**
 * The 3D view registers a function that renders one frame and returns the
 * canvas, so exports (PNG, PDF) can include a picture of the bottle.
 */
let capture: (() => HTMLCanvasElement) | null = null

export function registerCapture(fn: (() => HTMLCanvasElement) | null) {
  capture = fn
}

/** A smaller JPEG of the current view (for the PDF sheet), or null when the view isn't open. */
export function captureJpegDataUrl(maxWidth = 900): string | null {
  const canvas = capture?.()
  if (!canvas) return null
  const scale = Math.min(1, maxWidth / canvas.width)
  const small = document.createElement('canvas')
  small.width = Math.round(canvas.width * scale)
  small.height = Math.round(canvas.height * scale)
  const ctx = small.getContext('2d')!
  // JPEG has no transparency: start from the showroom colour
  ctx.fillStyle = '#0c0a08'
  ctx.fillRect(0, 0, small.width, small.height)
  ctx.drawImage(canvas, 0, 0, small.width, small.height)
  return small.toDataURL('image/jpeg', 0.85)
}

/** PNG of the current 3D view, or null when the view isn't open. */
export async function capturePng(): Promise<Blob | null> {
  const canvas = capture?.()
  if (!canvas) return null
  // toBlob must run in the same task as the render, before the buffer is cleared
  return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'))
}
