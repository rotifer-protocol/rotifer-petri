import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { translations, type Locale, type TranslationKey } from "./translations";

interface I18nContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  toggle: () => void;
}

const I18nContext = createContext<I18nContextValue>(null!);

function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem("rotifer-lang");
    if (stored === "en" || stored === "zh") return stored;
  } catch { /* SSR or private browsing */ }

  if (typeof navigator !== "undefined") {
    const lang = navigator.language || "";
    if (lang.startsWith("zh")) return "zh";
  }
  return "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);

  const t = useCallback(
    (key: TranslationKey) => translations[locale][key] ?? key,
    [locale],
  );

  const toggle = useCallback(() => {
    setLocale(prev => {
      const next = prev === "en" ? "zh" : "en";
      try { localStorage.setItem("rotifer-lang", next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return (
    <I18nContext.Provider value={{ locale, t, toggle }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
