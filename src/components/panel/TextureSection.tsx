import { useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { RANGES, type TextureConfig } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { ALLOWED_TEXTURES, TEXTURES, WAVE_DIRECTIONS, type Texture } from '@/model/options'
import { ParamSlider } from './controls'

/** Cellular openwork arrives in build step 13. */
const READY: readonly Texture[] = ['smooth', 'fluted', 'facets', 'waves']

type TextureSlider = 'fluteCount' | 'fluteDepth' | 'facetCount' | 'waveLength' | 'waveAmplitude'
const SLIDERS: Partial<Record<Texture, TextureSlider[]>> = {
  fluted: ['fluteCount', 'fluteDepth'],
  facets: ['facetCount'],
  waves: ['waveLength', 'waveAmplitude'],
}

export function TextureSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const tex = config.texture
  // Outside the advanced mode, only the textures that suit the silhouette
  const allowed = config.mode.advanced ? TEXTURES : ALLOWED_TEXTURES[config.shape.silhouette]

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('panel.texture')}</h2>
      <div role="group" aria-label={t('panel.texture')} className="flex flex-wrap gap-1.5">
        {TEXTURES.filter((v) => allowed.includes(v)).map((v) => {
          const ready = READY.includes(v)
          return (
            <button
              key={v}
              type="button"
              disabled={!ready}
              aria-pressed={tex.type === v}
              onClick={() => patch('texture', { type: v })}
              className={cn(
                'rounded-full px-3.5 py-1 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                tex.type === v ? 'bg-deep text-sand' : 'bg-foam/70 text-deep hover:bg-foam',
              )}
            >
              {t(`texture.${v}`)}
              {!ready && <span className="ml-1 text-[0.65rem]">({t('panel.later')})</span>}
            </button>
          )
        })}
      </div>
      {allowed.length === 1 && <p className="text-xs text-tide">{t('texture.ownStructure')}</p>}

      {tex.type === 'waves' && (
        <div role="group" aria-label={t('texture.direction')} className="flex gap-1.5">
          {WAVE_DIRECTIONS.map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={tex.waveDirection === d}
              onClick={() => patch('texture', { waveDirection: d })}
              className={cn(
                'rounded-full px-3 py-0.5 text-xs transition-colors',
                tex.waveDirection === d ? 'bg-lagoon text-white' : 'bg-sand text-deep ring-1 ring-rule hover:bg-foam',
              )}
            >
              {t(`texture.direction.${d}`)}
            </button>
          ))}
        </div>
      )}
      {(SLIDERS[tex.type] ?? []).map((key) => (
        <ParamSlider
          key={key}
          label={t(`param.${key}`)}
          value={tex[key]}
          range={RANGES.texture[key]}
          onChange={(v) => patch('texture', { [key]: v } as Partial<TextureConfig>)}
        />
      ))}
    </div>
  )
}
