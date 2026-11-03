import { shellOpenings } from '@/geometry/openings'
import { fill, useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { RANGES, type TextureConfig } from '@/model/config'
import { useDesign } from '@/model/design-context'
import { ALLOWED_TEXTURES, TEXTURE_ZONES, TEXTURES, WAVE_DIRECTIONS, WINDOW_SHAPES, type Texture } from '@/model/options'
import { ParamSlider } from './controls'

type TextureSlider = 'fluteCount' | 'fluteDepth' | 'facetCount' | 'waveLength' | 'waveAmplitude' | 'cellSize' | 'cellRim'
const SLIDERS: Partial<Record<Texture, TextureSlider[]>> = {
  fluted: ['fluteCount', 'fluteDepth'],
  facets: ['facetCount'],
  waves: ['waveLength', 'waveAmplitude'],
  cellular: ['cellSize', 'cellRim'],
}

export function TextureSection() {
  const t = useT()
  const { config, patch } = useDesign()
  const tex = config.texture
  // Outside the advanced mode, only the textures that suit the silhouette
  const allowed = config.mode.advanced ? TEXTURES : ALLOWED_TEXTURES[config.shape.silhouette]
  const openings = shellOpenings(config)

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('panel.texture')}</h2>
      <div role="group" aria-label={t('panel.texture')} className="flex flex-wrap gap-1.5">
        {TEXTURES.filter((v) => allowed.includes(v)).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={tex.type === v}
            onClick={() => patch('texture', { type: v })}
            className={cn(
              'rounded-full px-3.5 py-1 text-sm transition-colors',
              tex.type === v ? 'bg-deep text-sand' : 'bg-foam/70 text-deep hover:bg-foam',
            )}
          >
            {t(`texture.${v}`)}
          </button>
        ))}
      </div>
      {allowed.length === 1 && <p className="text-xs text-tide">{t('texture.ownStructure')}</p>}

      {config.mode.advanced && (
        <div className="space-y-2 rounded-lg bg-sand p-3">
          <p className="text-sm text-deep">{t('texture.zone')}</p>
          <div role="group" aria-label={t('texture.zone')} className="flex flex-wrap gap-1.5">
            {TEXTURE_ZONES.map((z) => (
              <button
                key={z}
                type="button"
                aria-pressed={tex.zone === z}
                onClick={() => patch('texture', { zone: z })}
                className={cn(
                  'rounded-full px-3 py-0.5 text-xs transition-colors',
                  tex.zone === z ? 'bg-lagoon text-white' : 'bg-shell text-deep ring-1 ring-rule hover:bg-foam',
                )}
              >
                {t(`texture.zone.${z}`)}
              </button>
            ))}
          </div>
          {tex.zone !== 'whole' && (
            <ParamSlider label={t('param.zoneSplit')} value={tex.zoneSplit} range={RANGES.texture.zoneSplit} onChange={(zoneSplit) => patch('texture', { zoneSplit })} />
          )}
          {tex.zone === 'bands' && (
            <div>
              <p className="text-xs text-tide">{t('texture.upper')}</p>
              <div role="group" aria-label={t('texture.upper')} className="mt-1 flex flex-wrap gap-1.5">
                {TEXTURES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={tex.upperType === v}
                    onClick={() => patch('texture', { upperType: v })}
                    className={cn(
                      'rounded-full px-3 py-0.5 text-xs transition-colors',
                      tex.upperType === v ? 'bg-lagoon text-white' : 'bg-shell text-deep ring-1 ring-rule hover:bg-foam',
                    )}
                  >
                    {t(`texture.${v}`)}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-tide">{t('texture.lowerIsMain')}</p>
            </div>
          )}
        </div>
      )}

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
      {tex.type === 'cellular' && (
        <div className="flex items-center justify-between gap-2 text-xs text-tide">
          <span role="status">
            {fill(t('texture.cells'), { n: String(openings.cells.length) })}
            {openings.skipped > 0 && <> · {fill(t('texture.skipped'), { n: String(openings.skipped) })}</>}
          </span>
          <button
            type="button"
            onClick={() => patch('shape', { growthSeed: Math.floor(Math.random() * 10000) })}
            className="shrink-0 rounded-full bg-foam/70 px-3 py-1 text-deep hover:bg-foam"
          >
            {t('texture.newPattern')}
          </button>
        </div>
      )}

      <h3 className="pt-2 text-sm font-medium text-deep">{t('texture.windows')}</h3>
      <ParamSlider
        label={t('param.windowCount')}
        value={tex.windowCount}
        range={RANGES.texture.windowCount}
        onChange={(windowCount) => patch('texture', { windowCount })}
      />
      {tex.windowCount > 0 && (
        <>
          <div role="group" aria-label={t('texture.windowShape')} className="flex gap-1.5">
            {WINDOW_SHAPES.map((w) => (
              <button
                key={w}
                type="button"
                aria-pressed={tex.windowShape === w}
                onClick={() => patch('texture', { windowShape: w })}
                className={cn(
                  'rounded-full px-3 py-0.5 text-xs transition-colors',
                  tex.windowShape === w ? 'bg-lagoon text-white' : 'bg-sand text-deep ring-1 ring-rule hover:bg-foam',
                )}
              >
                {t(`texture.window.${w}`)}
              </button>
            ))}
          </div>
          <ParamSlider
            label={t('param.windowWidth')}
            value={tex.windowWidth}
            range={RANGES.texture.windowWidth}
            onChange={(windowWidth) => patch('texture', { windowWidth })}
          />
          <ParamSlider
            label={t('param.windowHeight')}
            value={tex.windowHeight}
            range={RANGES.texture.windowHeight}
            onChange={(windowHeight) => patch('texture', { windowHeight })}
          />
          {openings.windows.length === 0 && <p className="text-xs text-coral-ink">{t('texture.noWindowRoom')}</p>}
        </>
      )}
    </div>
  )
}
