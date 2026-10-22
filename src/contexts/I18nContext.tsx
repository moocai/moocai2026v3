import { createContext, use, useEffect, useState, ReactNode } from 'react';
import i18n, { currentLanguage } from '../i18n';
import { chooseLanguage } from '../services/language';

interface I18nContextValue {
  language: string;
  setLanguage: (lang: string) => void;
}

const I18nContext = createContext<I18nContextValue | undefined>(undefined);

// L'idioma és el d'i18next (vegeu `i18n.ts`): aquest context només el reflecteix, perquè el
// perfil i el selector de la capçalera mostrin sempre el mateix.
export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(currentLanguage);

  useEffect(() => {
    const sync = () => setLanguageState(currentLanguage());
    i18n.on('languageChanged', sync);
    return () => i18n.off('languageChanged', sync);
  }, []);

  return (
    <I18nContext.Provider value={{ language, setLanguage: chooseLanguage }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = use(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
