import { useId } from 'react'
import type { NumberRange } from '@/model/config'

const UNIT_LABEL: Record<NumberRange['unit'], string> = {
  mm: 'mm',
  deg: '°',
  '%': '%',
  count: '',
  ratio: '',
  seed: '',
}

/** Decimal places that match the step, e.g. 0.05 → 2, 0.5 → 1, 1 → 0. */
const decimals = (step: number) => String(step).split('.')[1]?.length ?? 0

/** Range slider with a matching number box. Native inputs keep keyboard and screen reader support. */
export function ParamSlider({ label, value, range, onChange }: {
  label: string
  value: number
  range: NumberRange
  onChange: (value: number) => void
}) {
  const id = useId()
  const unit = UNIT_LABEL[range.unit]
  const shown = value.toFixed(decimals(range.step))

  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm text-deep">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={range.min}
          max={range.max}
          step={range.step}
          value={value}
          aria-valuetext={unit ? `${shown} ${unit}` : shown}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-6 min-w-0 flex-1 accent-lagoon"
        />
        <span className="flex items-center rounded-full bg-sand px-2 ring-1 ring-rule focus-within:ring-2 focus-within:ring-lagoon">
          <input
            type="number"
            aria-label={unit ? `${label} (${unit})` : label}
            min={range.min}
            max={range.max}
            step={range.step}
            value={shown}
            onChange={(e) => e.target.value !== '' && onChange(Number(e.target.value))}
            className="w-14 bg-transparent py-1 text-right text-sm tabular-nums outline-none"
          />
          {unit && <span className="pl-1 text-xs text-tide">{unit}</span>}
        </span>
      </div>
    </div>
  )
}
