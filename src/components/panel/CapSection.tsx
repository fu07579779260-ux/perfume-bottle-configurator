import { capLayout } from '@/geometry/cap'
import { capMagnetPlan } from '@/geometry/parts'
import { useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { CAP_FITS, CAP_FORMS, SCULPTURAL_STYLES } from '@/model/options'
import { ParamSlider } from './controls'

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
              'rounded-full px-3.5 py-1 text-sm transition-colors',
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

export function CapSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const cap = config.cap
  const layout = capLayout(config)
  const magnets = capMagnetPlan(config)

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('panel.cap')}</h2>
      <Pills
        label={t('cap.form')}
        value={cap.form}
        options={CAP_FORMS.map((v) => ({ value: v, label: t(`cap.form.${v}`) }))}
        onChange={(form) => patch('cap', { form })}
      />
      {cap.form === 'sculptural' && (
        <Pills
          label={t('cap.style')}
          value={cap.sculpturalStyle}
          options={SCULPTURAL_STYLES.map((v) => ({ value: v, label: t(`cap.style.${v}`) }))}
          onChange={(sculpturalStyle) => patch('cap', { sculpturalStyle })}
        />
      )}
      <ParamSlider
        label={t('param.capHeight')}
        value={cap.height}
        range={RANGES.cap.height}
        onChange={(height) => patch('cap', { height })}
      />
      {layout.raised && (
        <p role="status" className="text-xs text-warn">
          {t('cap.raised')} ({(layout.topY - layout.baseY).toFixed(1)} mm)
        </p>
      )}
      {cap.form !== 'follow' && (
        <ParamSlider
          label={t('param.capWidth')}
          value={cap.width}
          range={RANGES.cap.width}
          onChange={(width) => patch('cap', { width })}
        />
      )}
      <Pills
        label={t('cap.fit')}
        value={cap.fit}
        options={CAP_FITS.map((v) => ({ value: v, label: t(`cap.fit.${v}`) }))}
        onChange={(fit) => patch('cap', { fit })}
      />
      <p className="text-xs text-muted">{t(`cap.fit.${cap.fit}.note`)}</p>
      {magnets && !magnets.fits && (
        <p role="status" className="text-xs font-medium text-warn">
          {t('cap.magnetNoRoom')}
        </p>
      )}
      <ParamSlider
        label={t('param.capClearance')}
        value={cap.clearance}
        range={RANGES.cap.clearance}
        onChange={(clearance) => patch('cap', { clearance })}
      />
    </div>
  )
}
