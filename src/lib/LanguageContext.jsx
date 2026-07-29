import React, { createContext, useContext, useState, useEffect } from "react";
import { detectLanguage } from "@/lib/i18n";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const [lang, setLang] = useState(() => localStorage.getItem("ui_lang") || "en");

  useEffect(() => {
    const handler = (e) => setLang(e.detail);
    window.addEventListener("ui_lang_change", handler);
    return () => window.removeEventListener("ui_lang_change", handler);
  }, []);

  const changeLang = (code) => {
    setLang(code);
    localStorage.setItem("ui_lang", code);
    window.dispatchEvent(new CustomEvent("ui_lang_change", { detail: code }));
  };

  return (
    <LanguageContext.Provider value={{ lang, changeLang }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => useContext(LanguageContext);