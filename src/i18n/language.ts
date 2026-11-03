import { createContext, useCallback, useContext } from 'react'
import { LANGUAGES, STRINGS, type Language, type StringKey } from './strings'

const STORAGE_KEY = 'perfume.language'

export function loadLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && (LANGUAGES as readonly string[]).includes(saved)) return saved as Language
  } catch {
    // Storage blocked (private mode): fall back to the default
  }
  return 'en'
}

export function saveLanguage(lang: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, lang)
  } catch {
    // Not persisted; the choice still applies for this visit
  }
}

export const LanguageContext = createContext<{
  lang: Language
  setLang: (lang: Language) => void
}>({ lang: 'en', setLang: () => {} })

export function useLanguage() {
  return useContext(LanguageContext)
}

/** Fill {placeholders} in a translated string, e.g. fill(t('x'), { min: '1.6' }). */
export const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`)

/** Translate a UI string key into the current language. */
export function useT() {
  const { lang } = useLanguage()
  return useCallback((key: StringKey) => STRINGS[lang][key], [lang])
}
