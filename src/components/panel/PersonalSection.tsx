import { Upload, X } from 'lucide-react'
import { useId, useState } from 'react'
import { fill, useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { MAX_TEXT_LINE_LENGTH, RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
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
      <p className="text-sm text-deep">{label}</p>
      <div role="group" aria-label={label} className="mt-1.5 flex flex-wrap gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs transition-colors',
              value === o.value ? 'bg-deep text-sand' : 'bg-foam/70 text-deep hover:bg-foam',
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
      <p className="text-sm text-deep">{label}</p>
      <div role="group" aria-label={label} className="mt-1.5 flex flex-wrap items-center gap-1.5">
        {colours.map((c) => (
          <button
            key={c}
            type="button"
            aria-label={c}
            aria-pressed={value === c}
            onClick={() => onChange(c)}
            style={{ backgroundColor: c }}
            className={cn('size-7 rounded-full ring-offset-2 ring-offset-shell', value === c ? 'ring-2 ring-deep' : 'ring-1 ring-rule')}
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

export function PersonalSection() {
  const t = useT()
  const textId = useId()
  const fileId = useId()
  const { config, patch, load } = useDesign()
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

      <div>
        <p className="text-sm text-deep">{t('personal.style')}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {STYLES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => load(applyStyle(config, s))}
              className="rounded-full bg-sand px-3 py-1 text-xs text-deep ring-1 ring-rule hover:bg-foam"
            >
              {t(`style.${s}`)}
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-tide">{t('personal.styleNote')}</p>
      </div>

      <div className="space-y-2">
        <label htmlFor={textId} className="block text-sm text-deep">
          {t('personal.text')}
        </label>
        <textarea
          id={textId}
          rows={2}
          value={p.text}
          placeholder={t('personal.textPlaceholder')}
          onChange={(e) => patch('personal', { text: e.target.value })}
          className="w-full resize-none rounded-lg bg-sand px-3 py-2 text-sm text-deep ring-1 ring-rule focus:ring-2 focus:ring-lagoon focus:outline-none"
        />
        <p className="text-xs text-tide">{fill(t('personal.textLimits'), { n: String(MAX_TEXT_LINE_LENGTH) })}</p>
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
            {config.manufacturing.technology === 'fdm' && p.textSize < 5 && <p className="text-xs text-coral-ink">{t('personal.smallText')}</p>}
            {p.textPosition === 'base' && <p className="text-xs text-tide">{t('personal.baseEngraved')}</p>}
            <p className="text-xs text-tide">{t('personal.fontsNote')}</p>
          </>
        )}
      </div>

      <div className="space-y-2">
        <p className="text-sm text-deep">{t('personal.logo')}</p>
        <div className="flex items-center gap-2">
          <label
            htmlFor={fileId}
            className="flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full bg-foam/70 px-3 py-1.5 text-sm text-deep hover:bg-foam has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lagoon"
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
              className="rounded-full p-1.5 text-tide hover:bg-foam hover:text-deep"
            >
              <X className="size-4" />
            </button>
          )}
        </div>
        <p role="status" className="text-xs text-tide">
          {problem ? (
            <span className="text-coral-ink">{problem}</span>
          ) : missingLogo ? (
            <span className="text-coral-ink">{fill(t('logo.missing'), { name: p.logoName ?? '' })}</span>
          ) : p.logoName ? (
            <span className="break-all text-deep">{p.logoName}</span>
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
          className="mt-0.5 size-4 accent-lagoon"
        />
        <span>
          <span className="block text-sm text-deep">{t('personal.number')}</span>
          <span className="block text-xs text-tide">
            {fill(t('personal.numberNote'), { code: designCode(config) })}
          </span>
        </span>
      </label>

      <ColourPicker label={t('personal.shellColour')} value={p.shellColour} colours={SWATCHES} onChange={(shellColour) => patch('personal', { shellColour })} />
      <ColourPicker label={t('personal.capColour')} value={p.capColour} colours={SWATCHES} onChange={(capColour) => patch('personal', { capColour })} />
      <Pills
        label={t('personal.finish')}
        value={p.finish}
        options={FINISHES.map((v) => ({ value: v, label: t(`finish.${v}`) }))}
        onChange={(finish) => patch('personal', { finish })}
      />
      <ColourPicker label={t('panel.liquid')} value={p.liquidColour} colours={LIQUIDS} onChange={(liquidColour) => patch('personal', { liquidColour })} />
    </div>
  )
}
