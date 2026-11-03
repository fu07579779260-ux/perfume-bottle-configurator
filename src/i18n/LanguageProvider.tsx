import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { LanguageContext, loadLanguage, saveLanguage } from './language'
import type { Language } from './strings'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(loadLanguage)

  // Keep <html lang> in sync so screen readers switch pronunciation
  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en'
  }, [lang])

  const value = useMemo(
    () => ({
      lang,
      setLang: (next: Language) => {
        saveLanguage(next)
        setLangState(next)
      },
    }),
    [lang],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
