// Lista de países (código ISO 3166-1 alpha-2) + utilitário pra pegar o nome
// traduzido automaticamente no idioma da interface, usando a API nativa do
// navegador (Intl.DisplayNames) — evita ter que traduzir manualmente uma
// lista de dezenas de países em 9 idiomas.

export const LOCALE_MAP = {
  en: "en-US", pt_br: "pt-BR", pt_pt: "pt-PT", es: "es-ES",
  fr: "fr-FR", de: "de-DE", it: "it-IT", ja: "ja-JP", ko: "ko-KR",
};

// País (código) → idioma padrão da plataforma pra esse país. Usado tanto
// pra pré-selecionar o idioma da interface (Landing Page, app logado)
// quanto pra decidir em que idioma mandar e-mails automáticos (ex: aviso
// de minutos grátis) quando só temos a nacionalidade cadastrada da pessoa.
export const COUNTRY_TO_LANG = {
  BR: "pt_br",
  PT: "pt_pt",
  FR: "fr",
  DE: "de", AT: "de", CH: "de",
  IT: "it",
  ES: "es",
  JP: "ja",
  KR: "ko",
  AR: "es", MX: "es", CO: "es", CL: "es", PE: "es", UY: "es", PY: "es",
  BO: "es", EC: "es", VE: "es", CR: "es", PA: "es", GT: "es", HN: "es",
  SV: "es", NI: "es", DO: "es", CU: "es", PR: "es",
};

export function langForCountry(code) {
  if (!code) return "en";
  return COUNTRY_TO_LANG[String(code).toUpperCase()] || "en";
}

// Lista ampla de códigos de país — ordenação/rótulo ficam a cargo de quem
// usa (via Intl.DisplayNames), aqui só guardamos os códigos.
export const COUNTRY_CODES = [
  "BR","US","GB","CA","AU","NZ","IE",
  "PT","ES","FR","DE","IT","NL","BE","AT","CH","SE","NO","DK","FI",
  "PL","CZ","GR","HU","RO","BG","HR","SK","SI","LT","LV","EE",
  "JP","KR","CN","IN","ID","TH","VN","PH","MY","SG","TW","HK",
  "MX","AR","CO","CL","PE","UY","PY","BO","EC","VE","CR","PA",
  "GT","HN","SV","NI","DO","CU","PR",
  "ZA","NG","EG","MA","KE",
  "RU","TR","IL","AE","SA",
  "OTHER",
];

export function getCountryName(code, lang) {
  if (code === "OTHER") {
    const OTHER_LABEL = {
      en: "Other", pt_br: "Outro", pt_pt: "Outro", es: "Otro",
      fr: "Autre", de: "Andere", it: "Altro", ja: "その他", ko: "기타",
    };
    return OTHER_LABEL[lang] || OTHER_LABEL.en;
  }
  const locale = LOCALE_MAP[lang] || "en-US";
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code);
  } catch {
    return code;
  }
}
