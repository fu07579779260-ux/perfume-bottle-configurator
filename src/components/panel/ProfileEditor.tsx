import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { glassProfile } from '@/geometry/bottle'
import { addControlPoint, controlPointsFromSilhouette } from '@/geometry/control-points'
import { controlRadius, controlWeight } from '@/geometry/profile-curve'
import { shellLayout, shellProfile } from '@/geometry/shell'
import { fill, useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { PROFILE_POINTS_MIN, type ProfilePoint } from '@/model/config'
import { useDesign } from '@/model/design-context'

/** Smallest step between neighbouring points, in t */
const GAP = 0.03
const KEY_STEP = 0.02
const round3 = (v: number) => Number(v.toFixed(3))

/**
 * Half of the shell's side profile, drawn to scale next to the glass bottle.
 * Drag a point (or select it and use the arrow keys) to reshape the outline.
 */
export function ProfileEditor() {
  const t = useT()
  const { config, patch } = useDesign()
  const svg = useRef<SVGSVGElement>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const l = shellLayout(config)
  const points = config.shape.profilePoints ?? controlPointsFromSilhouette(config)

  // Drawing space: r to the right of the axis, y up; viewBox in mm
  const maxR = controlRadius(config.bottle, 1) + 4
  const top = l.topY + 6
  const bottom = l.bottomY - 3
  const toX = (r: number) => r
  const toY = (y: number) => top - y
  const glass = glassProfile(config.bottle)
  const outer = shellProfile(config).filter((p) => p.side !== 'thread')

  const setPoints = (next: ProfilePoint[]) => patch('shape', { profilePoints: next })

  /** Move point i to (tNew, wNew), keeping the ends at t = 0 and 1 and the order intact. */
  const move = (i: number, tNew: number, wNew: number) => {
    const next = points.map((p) => [...p] as [number, number])
    const lo = i === 0 ? 0 : next[i - 1][0] + GAP
    const hi = i === next.length - 1 ? 1 : next[i + 1][0] - GAP
    next[i] = [i === 0 ? 0 : i === next.length - 1 ? 1 : round3(Math.min(hi, Math.max(lo, tNew))), round3(Math.min(1, Math.max(0, wNew)))]
    setPoints(next)
  }

  const fromEvent = (e: PointerEvent) => {
    const box = svg.current!.getBoundingClientRect()
    const vb = svg.current!.viewBox.baseVal
    const r = vb.x + ((e.clientX - box.left) / box.width) * vb.width
    const y = top - (vb.y + ((e.clientY - box.top) / box.height) * vb.height)
    return { t: (y - l.bottomY) / l.height, w: controlWeight(config.bottle, r) }
  }

  const onKey = (i: number) => (e: KeyboardEvent) => {
    const [pt, pw] = points[i]
    const d = { ArrowUp: [KEY_STEP, 0], ArrowDown: [-KEY_STEP, 0], ArrowRight: [0, KEY_STEP], ArrowLeft: [0, -KEY_STEP] }[e.key]
    if (!d) return
    e.preventDefault()
    move(i, pt + d[0], pw + d[1])
  }

  const remove = () => {
    if (selected === null || points.length <= PROFILE_POINTS_MIN || selected === 0 || selected === points.length - 1) return
    setPoints(points.filter((_, k) => k !== selected))
    setSelected(null)
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-deep">{t('advanced.profile')}</p>
      <svg
        ref={svg}
        viewBox={`-2 0 ${maxR + 4} ${top - bottom}`}
        role="group"
        aria-label={t('advanced.profile')}
        className="w-full touch-none rounded-lg bg-sand ring-1 ring-rule"
        style={{ aspectRatio: `${maxR + 4} / ${top - bottom}` }}
      >
        {/* Axis */}
        <line x1={0} y1={0} x2={0} y2={top - bottom} stroke="var(--tide)" strokeDasharray="1.5 1.5" strokeWidth={0.25} />
        {/* Glass bottle */}
        <polyline
          points={glass.map(([r, y]) => `${toX(r)},${toY(y)}`).join(' ')}
          fill="var(--foam)"
          stroke="var(--tide)"
          strokeWidth={0.3}
          strokeDasharray="1 1"
        />
        {/* The shell as it will be built (outline, rim, cavity) */}
        <polygon
          points={outer.map((p) => `${toX(p.r)},${toY(p.y)}`).join(' ')}
          fill="color-mix(in oklab, var(--lagoon) 22%, transparent)"
          stroke="var(--deep)"
          strokeWidth={0.4}
        />
        {points.map(([pt, pw], i) => (
          <circle
            key={i}
            cx={toX(controlRadius(config.bottle, pw))}
            cy={toY(l.bottomY + pt * l.height)}
            r={2.2}
            tabIndex={0}
            role="button"
            aria-label={fill(t('advanced.point'), { n: String(i + 1), h: String(Math.round(pt * 100)), w: String(Math.round(pw * 100)) })}
            aria-pressed={selected === i}
            className={cn('cursor-grab outline-none', selected === i ? 'fill-coral' : 'fill-lagoon')}
            stroke="var(--shell)"
            strokeWidth={0.6}
            onFocus={() => setSelected(i)}
            onKeyDown={onKey(i)}
            onPointerDown={(e) => {
              setSelected(i)
              e.currentTarget.setPointerCapture(e.pointerId)
            }}
            onPointerMove={(e) => {
              if (!e.currentTarget.hasPointerCapture(e.pointerId)) return
              const { t: tn, w } = fromEvent(e)
              move(i, tn, w)
            }}
          />
        ))}
      </svg>
      <p className="text-xs text-tide">{t('advanced.profileHint')}</p>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => setPoints(addControlPoint(points))} className="rounded-full bg-foam/70 px-3 py-1 text-xs text-deep hover:bg-foam">
          {t('advanced.addPoint')}
        </button>
        <button
          type="button"
          onClick={remove}
          disabled={selected === null || points.length <= PROFILE_POINTS_MIN || selected === 0 || selected === points.length - 1}
          className="rounded-full bg-foam/70 px-3 py-1 text-xs text-deep hover:bg-foam disabled:opacity-40"
        >
          {t('advanced.removePoint')}
        </button>
        <button
          type="button"
          onClick={() => patch('shape', { profilePoints: null })}
          disabled={!config.shape.profilePoints}
          className="rounded-full bg-sand px-3 py-1 text-xs text-deep ring-1 ring-rule hover:bg-foam disabled:opacity-40"
        >
          {t('advanced.resetProfile')}
        </button>
      </div>
    </div>
  )
}
