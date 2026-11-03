import { AlertTriangle, Info } from 'lucide-react'
import { useId } from 'react'
import { designChecks, printerBed } from '@/geometry/checks'
import { fill, useT } from '@/i18n/language'
import type { StringKey } from '@/i18n/strings'
import { cn } from '@/lib/utils'
import { useDesign } from '@/model/design-context'
import { MATERIALS, PRINTERS, TECHNOLOGIES, TECHNOLOGY_DEFAULTS } from '@/model/options'

export function PrintSection() {
  const t = useT()
  const id = useId()
  const { config, patch } = useDesign()
  const m = config.manufacturing
  const d = TECHNOLOGY_DEFAULTS[m.technology]
  const bed = printerBed(config)
  const checks = designChecks(config)

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('panel.print')}</h2>

      <div role="radiogroup" aria-label={t('print.technology')} className="space-y-1.5">
        {TECHNOLOGIES.map((tech) => (
          <label
            key={tech}
            className={cn(
              'flex cursor-pointer gap-3 rounded-lg px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lagoon',
              m.technology === tech ? 'bg-foam ring-2 ring-deep' : 'bg-sand hover:bg-foam/60',
            )}
          >
            <input
              type="radio"
              name="technology"
              checked={m.technology === tech}
              onChange={() => patch('manufacturing', { technology: tech })}
              className="mt-1 accent-lagoon"
            />
            <span>
              <span className="text-sm font-medium text-deep">{t(`tech.${tech}`)}</span>
              <span className="mt-0.5 block text-xs text-tide">{t(`tech.${tech}.note`)}</span>
            </span>
          </label>
        ))}
      </div>

      <div className="space-y-1">
        <label htmlFor={id} className="block text-sm text-deep">
          {t('print.printer')}
        </label>
        <select
          id={id}
          value={m.printer}
          onChange={(e) => patch('manufacturing', { printer: e.target.value })}
          className="w-full rounded-full bg-sand px-3 py-1.5 text-sm text-deep ring-1 ring-rule focus:ring-2 focus:ring-lagoon focus:outline-none"
        >
          {PRINTERS[m.technology].map((p) => (
            <option key={p} value={p}>
              {t(`printer.${p}` as StringKey)}
            </option>
          ))}
        </select>
        <p className="text-xs text-tide tabular-nums">{fill(t('print.bed'), { bed: bed.join(' × ') })}</p>
      </div>

      <div>
        <p className="text-sm text-deep">{t('print.material')}</p>
        <div role="group" aria-label={t('print.material')} className="mt-1.5 flex flex-wrap gap-1.5">
          {MATERIALS[m.technology].map((mat) => (
            <button
              key={mat}
              type="button"
              aria-pressed={m.material === mat}
              onClick={() => patch('manufacturing', { material: mat })}
              className={cn(
                'rounded-full px-3.5 py-1 text-sm transition-colors',
                m.material === mat ? 'bg-deep text-sand' : 'bg-foam/70 text-deep hover:bg-foam',
              )}
            >
              {t(`material.${mat}` as StringKey)}
            </button>
          ))}
        </div>
      </div>

      <p className="rounded-lg bg-foam/50 p-3 text-xs text-tide">
        {fill(t('print.rules'), {
          wall: String(d.minWall),
          hole: String(d.minHole),
          strut: String(d.minStrut),
          clearance: String(d.clearance),
        })}
        {d.maxOverhang !== null && <> {fill(t('print.overhang'), { angle: String(d.maxOverhang) })}</>}
      </p>

      <div>
        <h3 className="text-sm font-medium text-deep">{t('checks.title')}</h3>
        <ul role="status" className="mt-1.5 space-y-1.5 text-xs">
          {checks.length === 0 && <li className="text-lagoon">{t('checks.none')}</li>}
          {checks.map((c) => (
            <li key={c.id + (c.values.part ?? '')} className={cn('flex gap-2', c.level === 'warning' ? 'text-coral-ink' : 'text-tide')}>
              {c.level === 'warning' ? (
                <AlertTriangle aria-label={t('checks.warning')} className="mt-0.5 size-3.5 shrink-0" />
              ) : (
                <Info aria-label={t('checks.note')} className="mt-0.5 size-3.5 shrink-0" />
              )}
              <span>
                {fill(t(`check.${c.id}`), {
                  ...c.values,
                  ...(c.values.part ? { part: t(`part.${c.values.part}` as StringKey) } : {}),
                })}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
