import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { captureJpegDataUrl } from '@/export/capture'
import { fill, useT } from '@/i18n/language'
import { cn } from '@/lib/utils'
import { useDesign } from '@/model/design-context'
import { applyFeedback, type FeedbackResult } from '@/model/feedback'
import type { FitFeedback } from '@/persistence/designs'
import { library } from '@/persistence/library'
import { openDesign, useOpenDesign } from '@/persistence/working'
import { logoStore } from '@/personal/logo-store'

const SHELL: FitFeedback['shell'][] = ['tight', 'good', 'loose']
const CAP: FitFeedback['cap'][] = ['falls', 'good', 'stuck']

function Choice<T extends string>({ label, value, options, onChange }: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (v: T) => void
}) {
  return (
    <div>
      <p className="text-sm text-ink">{label}</p>
      <div role="radiogroup" aria-label={label} className="mt-1.5 grid grid-cols-3 gap-1.5">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={cn(
              'rounded-lg px-2 py-1.5 text-xs transition-colors',
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

export function FeedbackSection() {
  const t = useT()
  const { config, load } = useDesign()
  const open = useOpenDesign()
  const [feedback, setFeedback] = useState<FitFeedback>({ shell: 'good', cap: 'good' })
  const [result, setResult] = useState<(FeedbackResult & { savedAs: number | null }) | null>(null)

  const describe = (r: FeedbackResult) => {
    const parts: string[] = []
    if (r.shell) parts.push(fill(t('feedback.shellChanged'), { from: r.shell.from.toFixed(2), to: r.shell.to.toFixed(2) }))
    if (r.cap) parts.push(fill(t('feedback.capChanged'), { from: r.cap.from.toFixed(2), to: r.cap.to.toFixed(2) }))
    return parts.join(' ')
  }

  const apply = async () => {
    const r = applyFeedback(config, feedback)
    load(r.config)
    let savedAs: number | null = null
    if (open) {
      // The feedback belongs to the version that was printed; the adjusted design becomes the next one
      await library.updateVersion(open.id, open.n, { feedback })
      const logo = logoStore.get()
      const note = fill(t('feedback.note'), { n: String(open.n), changes: describe(r) || t('feedback.noChange') })
      const saved = await library.saveVersion(open.id, r.config, {
        note,
        thumbnail: captureJpegDataUrl(320),
        logo: logo && r.config.personal.logoName === logo.name ? logo : null,
      })
      if (saved) {
        openDesign.set(saved)
        savedAs = saved.n
      }
    }
    setResult({ ...r, savedAs })
  }

  const unchanged = feedback.shell === 'good' && feedback.cap === 'good'

  return (
    <div className="space-y-3">
      <h2 className="kicker">{t('panel.feedback')}</h2>
      <p className="text-xs text-muted">{t('feedback.intro')}</p>
      <Choice
        label={t('feedback.shell')}
        value={feedback.shell}
        options={SHELL.map((v) => ({ value: v, label: t(`feedback.shell.${v}`) }))}
        onChange={(shell) => setFeedback((f) => ({ ...f, shell }))}
      />
      <Choice
        label={t('feedback.cap')}
        value={feedback.cap}
        options={CAP.map((v) => ({ value: v, label: t(`feedback.cap.${v}`) }))}
        onChange={(cap) => setFeedback((f) => ({ ...f, cap }))}
      />
      <Button onClick={() => void apply()} disabled={unchanged} variant="secondary" className="w-full rounded-full">
        {open ? t('feedback.applySave') : t('feedback.apply')}
      </Button>
      <div role="status" className="space-y-1 text-xs">
        {result && (
          <>
            <p className="text-ink">{describe(result) || t('feedback.noChange')}</p>
            {result.tips.map((tip) => (
              <p key={tip} className="text-warn">
                {t(`feedback.tip.${tip}`)}
              </p>
            ))}
            <p className="text-muted">
              {result.savedAs ? fill(t('feedback.savedAs'), { n: String(result.savedAs) }) : t('feedback.saveHint')}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
