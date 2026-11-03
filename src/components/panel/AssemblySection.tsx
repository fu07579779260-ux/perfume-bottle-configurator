import { useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { RANGES } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { ASSEMBLY_METHODS, BASE_FIXINGS, HALF_JOINTS, RECOMMENDED_ASSEMBLY } from '@/model/options'
import { ParamSlider } from './controls'

/** Row of pill buttons for a small choice. */
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
              'rounded-full px-3.5 py-1 text-sm transition-colors',
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

export function AssemblySection() {
  const t = useT()
  const { config, patch } = useDesign()
  const a = config.assembly
  const recommended = RECOMMENDED_ASSEMBLY[config.shape.silhouette]

  return (
    <fieldset className="space-y-3">
      <legend className="kicker">{t('panel.assembly')}</legend>
      <div className="mt-3 space-y-1.5">
        {ASSEMBLY_METHODS.map((m) => (
          <label
            key={m}
            className={cn(
              'flex cursor-pointer gap-3 rounded-lg px-3 py-2 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lagoon',
              a.method === m ? 'bg-foam ring-2 ring-deep' : 'bg-sand hover:bg-foam/60',
            )}
          >
            <input
              type="radio"
              name="assembly"
              value={m}
              checked={a.method === m}
              onChange={() => patch('assembly', { method: m })}
              className="mt-1 accent-lagoon"
            />
            <span>
              <span className="text-sm font-medium text-deep">
                {t(`assembly.${m}`)}
                {m === recommended && (
                  <span className="ml-2 rounded-full bg-shell px-2 py-0.5 text-[0.65rem] font-normal text-lagoon">
                    {t('assembly.recommended')}
                  </span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-tide">{t(`assembly.${m}.note`)}</span>
            </span>
          </label>
        ))}
      </div>

      {a.method === 'top' && (
        <ParamSlider
          label={t('param.frictionRibs')}
          value={a.frictionRibs}
          range={RANGES.assembly.frictionRibs}
          onChange={(frictionRibs) => patch('assembly', { frictionRibs })}
        />
      )}
      {a.method === 'bottom' && (
        <Pills
          label={t('assembly.baseFixing')}
          value={a.baseFixing}
          options={BASE_FIXINGS.map((v) => ({ value: v, label: t(`assembly.${v}`) }))}
          onChange={(baseFixing) => patch('assembly', { baseFixing })}
        />
      )}
      {a.method === 'halves' && (
        <>
          <Pills
            label={t('assembly.halfJoint')}
            value={a.halfJoint}
            options={HALF_JOINTS.map((v) => ({ value: v, label: t(`assembly.${v}`) }))}
            onChange={(halfJoint) => patch('assembly', { halfJoint })}
          />
          {a.halfJoint === 'magnets' && (
            <>
              <ParamSlider
                label={t('param.magnetDiameter')}
                value={a.magnetDiameter}
                range={RANGES.assembly.magnetDiameter}
                onChange={(magnetDiameter) => patch('assembly', { magnetDiameter })}
              />
              <ParamSlider
                label={t('param.magnetHeight')}
                value={a.magnetHeight}
                range={RANGES.assembly.magnetHeight}
                onChange={(magnetHeight) => patch('assembly', { magnetHeight })}
              />
            </>
          )}
        </>
      )}
    </fieldset>
  )
}
