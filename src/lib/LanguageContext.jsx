import React, { createContext, useContext, useState, useEffect } from "react";
import { detectLanguage } from "@/lib/i18n";
import { detectAndCacheRegion } from "@/lib/regionPricing";

const LanguageContext = createContext();

// Mapeia o país detectado por IP pro idioma inicial do app — só usado quando
// a pessoa NUNCA escolheu um idioma antes (sem nada salvo no navegador).
// Fora dessa lista, mantém o padrão de português (maioria dos alunos hoje).
const COUNTRY_TO_LANG = {
  BR: "pt_br",
  FR: "fr", DE: "de", AT: "de", CH: "de", IT: "it", ES: "es",
  JP: "ja", KR: "ko",
  AR: "es", MX: "es", CO: "es", CL: "es", PE: "es", UY: "es", PY: "es",
  BO: "es", EC: "es", VE: "es", CR: "es", PA: "es", GT: "es", HN: "es",
  SV: "es", NI: "es", DO: "es", CU: "es", PR: "es",
};

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

  // Detecção automática do idioma inicial por país — só roda se a pessoa
  // nunca tiver escolhido nada antes, e nunca sobrescreve uma escolha manual
  // feita enquanto a detecção ainda estava em andamento.
  useEffect(() => {
    if (localStorage.getItem("ui_lang")) return;
    detectAndCacheRegion().then((data) => {
      if (localStorage.getItem("ui_lang")) return; // já escolheu manualmente nesse meio-tempo
      const code = data?.countryCode ? String(data.countryCode).toUpperCase() : null;
      if (!code) return; // detecção falhou — mantém o padrão inicial, não mexe
      // País mapeado → idioma dele. País desconhecido pra nós (sem tradução
      // própria) → inglês, nunca português (só o Brasil abre em português).
      const detected = COUNTRY_TO_LANG[code] || "en";
      setLang(detected);
      localStorage.setItem("ui_lang", detected);
    }).catch(() => {});
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