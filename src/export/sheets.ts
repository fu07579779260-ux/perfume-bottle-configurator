import QRCode from 'qrcode'
import { STRINGS, type Language } from '@/i18n/strings'
import { captureJpegDataUrl } from './capture'
import type { Summary } from './summary'

// The design card (PNG, to share) and the spec sheet (A4 PDF, to print or
// hand to a print service). Both are drawn on a canvas with the device's
// fonts, so Chinese text works without a font file.

const FONT = '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", system-ui, sans-serif'
const SERIF = '"Fraunces Variable", "Songti SC", "Noto Serif SC", Georgia, serif'
const C = { sand: '#f5efe4', shell: '#fbf8f2', deep: '#123a40', tide: '#4b6a6c', lagoon: '#2b7a74', coral: '#a13d24', rule: '#e3d9c8' }

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

/** Wrap text into lines that fit `width`. Splits on spaces, or between characters for Chinese. */
function wrap(ctx: CanvasRenderingContext2D, text: string, width: number): string[] {
  const tokens = /\s/.test(text) ? text.split(/(\s+)/) : Array.from(text)
  const lines: string[] = []
  let line = ''
  for (const tok of tokens) {
    const next = line + tok
    if (ctx.measureText(next).width > width && line.trim()) {
      lines.push(line.trim())
      line = tok.trimStart()
    } else {
      line = next
    }
  }
  if (line.trim()) lines.push(line.trim())
  return lines
}

/** Draw wrapped text; returns the y below it. */
function para(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, width: number, lineHeight: number): number {
  for (const l of wrap(ctx, text, width)) {
    ctx.fillText(l, x, y)
    y += lineHeight
  }
  return y
}

async function qrImage(url: string, size: number) {
  return loadImage(await QRCode.toDataURL(url, { margin: 1, width: size, errorCorrectionLevel: 'L', color: { dark: C.deep, light: '#ffffff' } }))
}

async function renderImage(): Promise<HTMLImageElement | null> {
  const data = captureJpegDataUrl(1400)
  return data ? loadImage(data) : null
}

/** Draw the render inside a box, keeping its proportions. */
function drawFit(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const k = Math.min(w / img.width, h / img.height)
  ctx.drawImage(img, x + (w - img.width * k) / 2, y + (h - img.height * k) / 2, img.width * k, img.height * k)
}

/** A 1600 × 900 card: render, name, code, key facts and a QR code to open the design. */
export async function designCard(summary: Summary, shareUrl: string, lang: Language): Promise<Blob> {
  const t = STRINGS[lang]
  const canvas = document.createElement('canvas')
  canvas.width = 1600
  canvas.height = 900
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = C.sand
  ctx.fillRect(0, 0, 1600, 900)
  ctx.fillStyle = '#eef1ea'
  ctx.fillRect(40, 40, 700, 820)
  const render = await renderImage()
  if (render) drawFit(ctx, render, 40, 40, 700, 820)

  ctx.fillStyle = C.tide
  ctx.font = `500 26px ${FONT}`
  ctx.fillText(t['app.title'].toUpperCase(), 800, 100)
  ctx.fillStyle = C.deep
  ctx.font = `600 84px ${SERIF}`
  ctx.fillText(summary.title, 800, 200)
  ctx.font = `400 30px ${FONT}`
  ctx.fillStyle = C.tide
  let y = para(ctx, summary.note, 800, 250, 740, 40)
  ctx.font = `600 44px ui-monospace, Consolas, monospace`
  ctx.fillStyle = C.lagoon
  ctx.fillText(summary.code, 800, y + 40)
  y += 110
  ctx.font = `400 26px ${FONT}`
  for (const [label, value] of summary.rows.slice(0, 7)) {
    ctx.fillStyle = C.tide
    ctx.fillText(label, 800, y)
    ctx.fillStyle = C.deep
    y = para(ctx, value, 1060, y, 300, 32) + 8
    if (y > 820) break
  }
  const qr = await qrImage(shareUrl, 200)
  ctx.drawImage(qr, 1360, 660, 200, 200)
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), 'image/png'))
}

/** An A4 spec sheet at 150 dpi, as a canvas (the PDF embeds it). */
async function specCanvas(summary: Summary, shareUrl: string, lang: Language): Promise<HTMLCanvasElement> {
  const t = STRINGS[lang]
  const W = 1240
  const H = 1754
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, W, H)
  const left = 90
  const heading = (text: string, y: number) => {
    ctx.fillStyle = C.tide
    ctx.font = `600 22px ${FONT}`
    ctx.fillText(text.toUpperCase(), left, y)
    ctx.fillStyle = C.rule
    ctx.fillRect(left, y + 10, W - 2 * left, 2)
    return y + 44
  }

  ctx.fillStyle = C.tide
  ctx.font = `500 22px ${FONT}`
  ctx.fillText(t['sheet.title'].toUpperCase(), left, 100)
  ctx.fillStyle = C.deep
  ctx.font = `600 64px ${SERIF}`
  ctx.fillText(summary.title, left, 180)
  ctx.font = `600 34px ui-monospace, Consolas, monospace`
  ctx.fillStyle = C.lagoon
  ctx.fillText(summary.code, left, 232)

  const render = await renderImage()
  ctx.fillStyle = '#eef1ea'
  ctx.fillRect(W - left - 420, 70, 420, 520)
  if (render) drawFit(ctx, render, W - left - 420, 70, 420, 520)

  let y = heading(t['sheet.parameters'], 300)
  ctx.font = `400 21px ${FONT}`
  for (const [label, value] of summary.rows) {
    ctx.fillStyle = C.tide
    ctx.fillText(label, left, y)
    ctx.fillStyle = C.deep
    y = para(ctx, value, left + 230, y, y < 600 ? 330 : 830, 28) + 6
  }

  y = heading(t['export.tips'], Math.max(y + 20, 640))
  ctx.font = `400 21px ${FONT}`
  ctx.fillStyle = C.deep
  for (const tip of summary.printTips) y = para(ctx, `•  ${tip}`, left, y, W - 2 * left, 28) + 4
  y = heading(t['sheet.finishing'], y + 20)
  ctx.font = `400 21px ${FONT}`
  ctx.fillStyle = C.deep
  for (const tip of summary.finishing) y = para(ctx, `•  ${tip}`, left, y, W - 2 * left, 28) + 4
  y = heading(t['sheet.assembly'], y + 20)
  ctx.font = `400 21px ${FONT}`
  ctx.fillStyle = C.deep
  y = para(ctx, summary.assembly, left, y, W - 2 * left, 28)

  y = heading(t['checks.title'], y + 30)
  ctx.font = `400 21px ${FONT}`
  if (!summary.checks.length) {
    ctx.fillStyle = C.lagoon
    ctx.fillText(t['checks.none'], left, y)
    y += 28
  }
  for (const c of summary.checks) {
    ctx.fillStyle = C.coral
    y = para(ctx, `•  ${c}`, left, y, W - 2 * left, 28) + 4
  }

  const qr = await qrImage(shareUrl, 220)
  ctx.drawImage(qr, W - left - 220, H - 320, 220, 220)
  ctx.fillStyle = C.tide
  ctx.font = `400 19px ${FONT}`
  para(ctx, t['sheet.qr'], left, H - 240, W - 2 * left - 260, 26)
  ctx.fillText(`${t['app.title']} · ${t['footer.units']}`, left, H - 80)
  return canvas
}

export async function specSheetPdf(summary: Summary, shareUrl: string, lang: Language): Promise<ArrayBuffer> {
  const canvas = await specCanvas(summary, shareUrl, lang)
  const { jsPDF } = await import('jspdf')
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  pdf.setProperties({ title: `${summary.title} – ${summary.code}`, creator: 'Perfume Bottle Configurator' })
  pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, 210, 297)
  return pdf.output('arraybuffer')
}
