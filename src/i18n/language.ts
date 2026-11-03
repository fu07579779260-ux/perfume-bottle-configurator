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

/** Translate a UI string key into the current language. */
export function useT() {
  const { lang } = useLanguage()
  return useCallback((key: StringKey) => STRINGS[lang][key], [lang])
}
