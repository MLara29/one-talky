import React, { createContext, useContext, useState, useEffect } from "react";
import { detectLanguage } from "@/lib/i18n";

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  // Padrão pra quem nunca escolheu antes (primeiro acesso): português, não
  // inglês — a maioria dos alunos é brasileira. Quem já escolheu um idioma
  // antes continua vendo a própria escolha, guardada no navegador.
  const [lang, setLang] = useState(() => localStorage.getItem("ui_lang") || "pt_br");

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