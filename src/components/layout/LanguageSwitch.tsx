import { useLanguage, useT } from '@/i18n/language'
import type { Language } from '@/i18n/strings'
import { cn } from '@/lib/utils'

const OPTIONS: { value: Language; label: string; lang: string }[] = [
  { value: 'en', label: 'EN', lang: 'en' },
  { value: 'zh', label: '中文', lang: 'zh-CN' },
]

export function LanguageSwitch() {
  const { lang, setLang } = useLanguage()
  const t = useT()

  return (
    <div role="group" aria-label={t('lang.label')} className="flex shrink-0 rounded-full bg-soft/70 p-0.5">
      {OPTIONS.map((o) => (
        <button
          key={o.value}
          type="button"
          lang={o.lang}
          aria-pressed={lang === o.value}
          onClick={() => setLang(o.value)}
          className={cn(
            'min-w-11 rounded-full px-3 py-1 text-xs whitespace-nowrap font-medium transition-colors',
            lang === o.value ? 'bg-surface text-ink shadow-sm' : 'text-muted hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
