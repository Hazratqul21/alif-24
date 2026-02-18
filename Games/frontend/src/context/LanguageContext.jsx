import { createContext, useContext, useState, useEffect } from 'react';
import { translations } from '../language/translations';

const LanguageContext = createContext(null);

/**
 * Language Provider
 * Manages language state and translations
 */
export const LanguageProvider = ({ children }) => {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('language') || 'uz';
  });

  useEffect(() => {
    localStorage.setItem('language', language);
  }, [language]);

  /**
   * Get translation by key
   * @param {string} key - Translation key
   * @returns {string} Translated text
   */
  const t = (key) => {
    return translations[language]?.[key] || key;
  };

  /**
   * Switch language
   * @param {string} lang - Language code ('uz' or 'ru')
   */
  const switchLanguage = (lang) => {
    if (translations[lang]) {
      setLanguage(lang);
    }
  };

  const value = {
    language,
    t,
    switchLanguage,
    availableLanguages: Object.keys(translations)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

/**
 * Hook to use language context
 */
export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
