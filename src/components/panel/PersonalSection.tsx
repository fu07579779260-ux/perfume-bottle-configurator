import { Upload, X } from 'lucide-react'
import { useId, useState } from 'react'
import { fill, useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { MAX_TEXT_LINE_LENGTH, RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { applyMaterialPreset, MATERIAL_PRESETS } from '@/model/material-presets'
import { designCode } from '@/model/design-number'
import { FINISHES, LOGO_POSITIONS, TEXT_MODES, TEXT_POSITIONS } from '@/model/options'
import { applyStyle, STYLES } from '@/model/styles'
import { logoStore, useLogo } from '@/personal/logo-store'
import { imageOutline } from '@/personal/raster'
import { ParamSlider } from './controls'

/** Common filament colours, so the preview matches what can be printed */
const SWATCHES = ['#f2efe9', '#e6d8bf', '#c9b79c', '#7d8f69', '#2b7a74', '#2b3a42', '#1f1d1b', '#d9694c', '#b08d57', '#c9a227']
const LIQUIDS = ['#f2c46d', '#f4dfe6', '#cfe8f2', '#d9ecc8', '#e9a07a']
const MAX_LOGO_BYTES = 2 * 1024 * 1024

function Pills<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="text-sm text-ink">{label}</p>
      <div role="group" aria-label={label} className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs transition-colors',
              value === o.value ? 'bg-gold text-canvas' : 'bg-soft/70 text-ink hover:bg-soft',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

function ColourPicker({ label, value, colours, onChange }: {
  label: string
  value: string
  colours: string[]
  onChange: (c: string) => void
}) {
  const t = useT()
  return (
    <div>
      <p className="text-sm text-ink">{label}</p>
      <div role="group" aria-label={label} className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {colours.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={cn('size-7 rounded-full ring-offset-2 ring-offset-surface', value === c ? 'ring-2 ring-ink' : 'ring-1 ring-rule')}
          />
        ))}
        <label className="relative size-7 cursor-pointer overflow-hidden rounded-full ring-1 ring-rule" title={t('personal.custom')}>
          <span className="sr-only">{t('personal.custom')}</span>
          <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="absolute -inset-2 size-12 cursor-pointer" />
        </label>
      </div>
    </div>
  )
}

export function StylePicker() {
  const t = useT()
  const { config, load } = useDesign()

  return (
    <div>
      <p className="text-sm text-ink">{t('personal.style')}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {STYLES.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => load(applyStyle(config, s))}
            className="rounded-full bg-canvas px-3 py-1 text-xs text-ink ring-1 ring-rule hover:bg-soft"
          >
            {t(`style.${s}`)}
          </button>
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">{t('personal.styleNote')}</p>
    </div>
  )
}

export function PersonalSection() {
  const t = useT()
  const textId = useId()
  const fileId = useId()
  const { config, patch } = useDesign()
  const p = config.personal
  const logo = useLogo()
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const missingLogo = p.logoName !== null && logo?.name !== p.logoName

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setProblem(null)
    if (file.size > MAX_LOGO_BYTES) return setProblem(t('logo.tooBig'))
    if (!/\.(svg|png|jpe?g)$/i.test(file.name)) return setProblem(t('logo.wrongType'))
    setBusy(true)
    try {
      const outline = await imageOutline(file)
      if (!outline.length) return setProblem(t('logo.empty'))
      logoStore.set({ name: file.name, outline })
      patch('personal', { logoName: file.name })
    } catch {
      setProblem(t('logo.unreadable'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="kicker">{t('panel.personal')}</h2>

      <div className="space-y-2">
        <label htmlFor={textId} className="block text-sm text-ink">
          {t('personal.text')}
        </label>
        <textarea
          id={textId}
          rows={2}
          value={p.text}
          placeholder={t('personal.textPlaceholder')}
          onChange={(e) => patch('personal', { text: e.target.value })}
          className="w-full resize-none rounded-lg bg-canvas px-3 py-2 text-sm text-ink ring-1 ring-rule focus:ring-2 focus:ring-gold focus:outline-none"
        />
        <p className="text-xs text-muted">{fill(t('personal.textLimits'), { n: String(MAX_TEXT_LINE_LENGTH) })}</p>
        {p.text.trim() && (
          <>
            <Pills
              label={t('personal.position')}
              value={p.textPosition}
              options={TEXT_POSITIONS.map((v) => ({ value: v, label: t(`position.${v}`) }))}
              onChange={(textPosition) => patch('personal', { textPosition })}
            />
            <Pills
              label={t('personal.mode')}
              value={p.textMode}
              options={TEXT_MODES.map((v) => ({ value: v, label: t(`mode.${v}`) }))}
              onChange={(textMode) => patch('personal', { textMode })}
            />
            <ParamSlider label={t('param.textSize')} value={p.textSize} range={RANGES.personal.textSize} onChange={(textSize) => patch('personal', { textSize })} />
            <ParamSlider label={t('param.textDepth')} value={p.textDepth} range={RANGES.personal.textDepth} onChange={(textDepth) => patch('personal', { textDepth })} />
            {config.manufacturing.technology === 'fdm' && p.textSize < 5 && <p className="text-xs text-warn">{t('personal.smallText')}</p>}
            {p.textPosition === 'base' && <p className="text-xs text-muted">{t('personal.baseEngraved')}</p>}
            <p className="text-xs text-muted">{t('personal.fontsNote')}</p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-ink">{t('personal.logo')}</p>
        <div className="flex items-center gap-2">
          <label
            htmlFor={fileId}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-soft/70 px-3 py-1.5 text-sm text-ink hover:bg-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold"
          >
            <Upload aria-hidden="true" className="size-4" />
            {busy ? t('logo.reading') : p.logoName && !missingLogo ? t('logo.replace') : t('logo.choose')}
            <input
              id={fileId}
              type="file"
              accept=".svg,.png,.jpg,.jpeg,image/svg+xml,image/png,image/jpeg"
              className="sr-only"
              disabled={busy}
              onChange={(e) => {
                void onFile(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </label>
          {p.logoName && (
            <button
              type="button"
              aria-label={t('logo.remove')}
              onClick={() => {
                logoStore.set(null)
                patch('personal', { logoName: null })
              }}
              className="rounded-full p-1.5 text-muted hover:bg-soft hover:text-ink"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p role="status" className="text-xs text-muted">
          {problem ? (
            <span className="text-warn">{problem}</span>
          ) : missingLogo ? (
            <span className="text-warn">{fill(t('logo.missing'), { name: p.logoName ?? '' })}</span>
          ) : p.logoName ? (
            <span className="break-all text-ink">{p.logoName}</span>
          ) : (
            t('logo.hint')
          )}
        </p>
        {p.logoName && !missingLogo && (
          <>
            <Pills
              label={t('personal.position')}
              value={p.logoPosition}
              options={LOGO_POSITIONS.map((v) => ({ value: v, label: t(`position.${v}`) }))}
              onChange={(logoPosition) => patch('personal', { logoPosition })}
            />
            <ParamSlider label={t('param.logoSize')} value={p.logoSize} range={RANGES.personal.logoSize} onChange={(logoSize) => patch('personal', { logoSize })} />
          </>
        )}
      </div>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={p.designNumber}
          onChange={(e) => patch('personal', { designNumber: e.target.checked })}
          className="mt-0.5 size-4 accent-gold"
        />
        <span>
          <span className="block text-sm text-ink">{t('personal.number')}</span>
          <span className="block text-xs text-muted">
            {fill(t('personal.numberNote'), { code: designCode(config) })}
          </span>
        </span>
      </label>

    </div>
  )
}

const FINISH_SWATCH = {
  matte: 'radial-gradient(circle at 32% 24%, #f2e9db, #afa89c 65%, #666057)',
  silk: 'radial-gradient(ellipse at 30% 18%, #fff 0%, #fff 5%, #a6c7c2 16%, #357b75 55%, #183c39 90%)',
  translucent: 'radial-gradient(circle at 28% 20%, #fff9 0%, #f6d88d88 22%, #b6732f66 62%, #f4d694aa 90%)',
  metallic: 'linear-gradient(115deg, #574026, #e2c38a 24%, #fff6db 34%, #6c4c24 49%, #e9cc90 69%, #604727)',
}

export function AppearanceSection() {
  const t = useT()
  const { config, patch, load } = useDesign()
  const p = config.personal
  const m = config.manufacturing

  return (
    <div className="space-y-6">
      <fieldset>
        <legend className="kicker">{t('surface.materials.title')}</legend>
        <div role="group" aria-label={t('surface.materials.title')} className="mt-3 grid grid-cols-2 gap-2">
          {MATERIAL_PRESETS.map((preset) => {
            const selected = m.technology === preset.technology && m.material === preset.material
            return (
              <button key={preset.id} type="button" aria-pressed={selected} onClick={() => load(applyMaterialPreset(config, preset.id))}
                className={cn('flex items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-colors last:col-span-2', selected ? 'bg-soft ring-2 ring-gold' : 'bg-canvas ring-1 ring-rule hover:bg-soft')}>
                <span aria-hidden="true" className="size-7 shrink-0 rounded-full ring-1 ring-white/15" style={{ background: FINISH_SWATCH[preset.finish], opacity: preset.id === 'pa12' ? 0.75 : 1 }} />
                <span>
                  <span className="block text-sm font-medium text-ink">{t(`material.${preset.material}`)}</span>
                  <span className="mt-0.5 block text-[0.65rem] leading-relaxed text-muted">{t(`surface.preset.${preset.id}`)}</span>
                </span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">{t('surface.materials.note')}</p>
      </fieldset>

      <fieldset>
        <legend className="kicker">{t('personal.finish')}</legend>
        <div role="group" aria-label={t('personal.finish')} className="mt-3 grid grid-cols-2 gap-2">
          {FINISHES.map((finish) => (
            <button key={finish} type="button" aria-pressed={p.finish === finish} onClick={() => patch('personal', { finish })}
              className={cn('flex items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-colors', p.finish === finish ? 'bg-soft ring-2 ring-gold' : 'bg-canvas ring-1 ring-rule hover:bg-soft')}>
              <span aria-hidden="true" className="size-8 shrink-0 rounded-full ring-1 ring-white/15" style={{ background: FINISH_SWATCH[finish] }} />
              <span className="text-xs font-medium text-ink">{t(`finish.${finish}`)}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-relaxed text-muted">{p.finish === 'metallic' ? t('surface.metalNote') : t('surface.finishNote')}</p>
      </fieldset>

      <ColourPicker label={t('personal.shellColour')} value={p.shellColour} colours={SWATCHES} onChange={(shellColour) => patch('personal', { shellColour })} />
      <ColourPicker label={t('personal.capColour')} value={p.capColour} colours={SWATCHES} onChange={(capColour) => patch('personal', { capColour })} />
      <ColourPicker label={t('panel.liquid')} value={p.liquidColour} colours={LIQUIDS} onChange={(liquidColour) => patch('personal', { liquidColour })} />
    </div>
  )
}
