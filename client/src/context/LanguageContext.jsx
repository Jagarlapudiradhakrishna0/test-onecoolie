// client/src/context/LanguageContext.jsx
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import locales, { SUPPORTED_LANGUAGES } from '../locales';

/* ============================================================
   ONECOOLIE GLOBAL LANGUAGE CONTEXT & LOCALIZATION PROVIDER
   • Supported Locales: English ('en'), Telugu ('te'), Hindi ('hi')
   • Immediate app-wide reactive translation updates (Zero reload)
   • Multi-tab synchronization via storage event
   • Strict legal fidelity for Pre-Launch Journey Protection
   • Locale-aware date/time formatting via Intl.DateTimeFormat
   • Dot-notation & flat-key resolution with parameter interpolation
   ============================================================ */

const LanguageContext = createContext();

const STORAGE_KEY_1 = 'onecoolie_lang';
const STORAGE_KEY_2 = 'rm-lang';

/**
 * Resolves initial language based on priority:
 * 1. Saved preference in localStorage
 * 2. Browser language (if starts with te or hi)
 * 3. Default to 'en'
 */
function getInitialLanguage() {
  if (typeof window === 'undefined') return 'en';
  try {
    const saved = localStorage.getItem(STORAGE_KEY_1) || localStorage.getItem(STORAGE_KEY_2);
    if (saved && (saved === 'en' || saved === 'te' || saved === 'hi')) {
      return saved;
    }
    const browserLang = (navigator.language || navigator.userLanguage || '').toLowerCase();
    if (browserLang.startsWith('te')) return 'te';
    if (browserLang.startsWith('hi')) return 'hi';
  } catch (e) {
    // LocalStorage access restricted in private mode
  }
  return 'en';
}

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLanguage);

  // Sync document lang attribute and meta
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  // Multi-tab synchronization
  useEffect(() => {
    const handleStorageChange = (e) => {
      if ((e.key === STORAGE_KEY_1 || e.key === STORAGE_KEY_2) && e.newValue) {
        if (['en', 'te', 'hi'].includes(e.newValue)) {
          setLangState(e.newValue);
        }
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail && ['en', 'te', 'hi'].includes(e.detail)) {
        setLangState(e.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('onecoolie_lang_changed', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('onecoolie_lang_changed', handleCustomEvent);
    };
  }, []);

  const setLanguage = useCallback((newLang) => {
    if (!['en', 'te', 'hi'].includes(newLang)) return;
    setLangState(newLang);
    try {
      localStorage.setItem(STORAGE_KEY_1, newLang);
      localStorage.setItem(STORAGE_KEY_2, newLang);
      window.dispatchEvent(new CustomEvent('onecoolie_lang_changed', { detail: newLang }));
    } catch (e) {
      console.warn('Unable to persist language preference:', e);
    }
  }, []);

  /**
   * Helper to deeply look up keys by dot notation
   */
  const lookupKey = useCallback((dict, keyPath) => {
    if (!dict) return undefined;
    if (keyPath in dict) return dict[keyPath];

    const parts = keyPath.split('.');
    let current = dict;
    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        current = undefined;
        break;
      }
    }
    if (current !== undefined && typeof current === 'string') {
      return current;
    }

    // Secondary scan across namespaces if single key was provided
    if (!keyPath.includes('.')) {
      for (const section of Object.values(dict)) {
        if (section && typeof section === 'object') {
          if (keyPath in section && typeof section[keyPath] === 'string') {
            return section[keyPath];
          }
          if (section.actions && typeof section.actions === 'object' && keyPath in section.actions) {
            return section.actions[keyPath];
          }
        }
      }
    }

    return undefined;
  }, []);

  /**
   * Universal translation function with interpolation support
   * Example: t('dashboard.welcome', { name: 'Vikas' })
   */
  const t = useCallback((key, params) => {
    if (!key) return '';

    const currentDict = locales[lang] || locales.en;
    const fallbackDict = locales.en;

    let value = lookupKey(currentDict, key);
    if (value === undefined && lang !== 'en') {
      value = lookupKey(fallbackDict, key);
    }

    if (value === undefined) {
      // Fallback: return the last token of the key or key itself
      return key.includes('.') ? key.split('.').pop() : key;
    }

    // Variable interpolation: replaces {varName} with params.varName
    if (params && typeof params === 'object') {
      let interpolated = String(value);
      for (const [pKey, pVal] of Object.entries(params)) {
        interpolated = interpolated.replaceAll(`{${pKey}}`, pVal !== undefined && pVal !== null ? String(pVal) : '');
      }
      return interpolated;
    }

    return String(value);
  }, [lang, lookupKey]);

  /**
   * Locale-aware date formatter
   */
  const formatDate = useCallback((dateInput, options = {}) => {
    if (!dateInput) return '';
    try {
      const d = typeof dateInput === 'string' || typeof dateInput === 'number' ? new Date(dateInput) : dateInput;
      if (isNaN(d.getTime())) return String(dateInput);

      const localeMap = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };
      const defaultOptions = { day: '2-digit', month: 'short', year: 'numeric', ...options };
      return new Intl.DateTimeFormat(localeMap[lang] || 'en-IN', defaultOptions).format(d);
    } catch (e) {
      return String(dateInput);
    }
  }, [lang]);

  /**
   * Locale-aware time formatter
   */
  const formatTime = useCallback((timeInput, options = {}) => {
    if (!timeInput) return '';
    try {
      const d = typeof timeInput === 'string' && timeInput.includes(':') && !timeInput.includes('T')
        ? new Date(`1970-01-01T${timeInput.length === 5 ? timeInput + ':00' : timeInput}`)
        : new Date(timeInput);

      if (isNaN(d.getTime())) return String(timeInput);

      const localeMap = { en: 'en-IN', te: 'te-IN', hi: 'hi-IN' };
      const defaultOptions = { hour: '2-digit', minute: '2-digit', hour12: true, ...options };
      return new Intl.DateTimeFormat(localeMap[lang] || 'en-IN', defaultOptions).format(d);
    } catch (e) {
      return String(timeInput);
    }
  }, [lang]);

  /**
   * Currency formatter that strictly preserves Indian Rupee representation
   */
  const formatCurrency = useCallback((amount) => {
    const num = Number(amount) || 0;
    return `₹${num % 1 === 0 ? num.toLocaleString('en-IN') : num.toFixed(2)}`;
  }, []);

  const value = useMemo(() => ({
    lang,
    setLanguage,
    t,
    formatDate,
    formatTime,
    formatCurrency,
    SUPPORTED_LANGUAGES,
    isTelugu: lang === 'te',
    isHindi: lang === 'hi',
    isEnglish: lang === 'en'
  }), [lang, setLanguage, t, formatDate, formatTime, formatCurrency]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Graceful fallback if called outside provider (e.g. isolated test)
    return {
      lang: 'en',
      setLanguage: () => {},
      t: (k, params) => {
        if (params) {
          let s = k;
          for (const [p, v] of Object.entries(params)) {
            s = s.replaceAll(`{${p}}`, v);
          }
          return s;
        }
        return k.includes('.') ? k.split('.').pop() : k;
      },
      formatDate: (d) => String(d),
      formatTime: (t) => String(t),
      formatCurrency: (a) => `₹${a}`,
      SUPPORTED_LANGUAGES,
      isTelugu: false,
      isHindi: false,
      isEnglish: true
    };
  }
  return context;
};

export default LanguageContext;
