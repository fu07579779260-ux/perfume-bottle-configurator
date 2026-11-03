import { SilhouetteSketch } from '@/components/layout/SilhouetteSketch'
import { useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { useDesign } from '@/model/design-context'
import { SILHOUETTES, type Silhouette } from '@/model/options'

/** Exoskeleton Frame and Coral arrive in build steps 14 and 15. */
const READY: readonly Silhouette[] = ['column', 'teardrop', 'prism', 'pebble']

export function SilhouettePicker() {
  const t = useT()
  const { config, patch } = useDesign()
  const current = config.shape.silhouette

  return (
    <fieldset>
      <legend className="kicker">{t('panel.silhouette')}</legend>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {SILHOUETTES.map((s) => {
          const ready = READY.includes(s)
          return (
            <label
              key={s}
              className={cn(
                'relative flex cursor-pointer flex-col items-center rounded-lg px-1 pt-2 pb-1.5 text-center transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-lagoon',
                current === s ? 'bg-foam ring-2 ring-deep' : 'bg-sand hover:bg-foam/60',
                !ready && 'cursor-not-allowed opacity-50',
              )}
            >
              <input
                type="radio"
                name="silhouette"
                value={s}
                checked={current === s}
                disabled={!ready}
                onChange={() => patch('shape', { silhouette: s })}
                className="sr-only"
              />
              <SilhouetteSketch silhouette={s} className="h-14 w-auto" />
              <span className="mt-1 text-xs leading-tight text-deep">{t(`sil.${s}`)}</span>
              {!ready && <span className="text-[0.6rem] text-tide">{t('panel.later')}</span>}
            </label>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-tide">{t(`sil.${current}.note`)}</p>
    </fieldset>
  )
}
