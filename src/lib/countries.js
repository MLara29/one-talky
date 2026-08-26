// Lista de países (código ISO 3166-1 alpha-2) + utilitários pra exibir nome
// traduzido, bandeira, e manter a mesma cobertura de países que já existe
// pro cadastro de tutor (src/lib/constants.js → COUNTRIES), só que aqui com
// nome traduzido automaticamente por idioma (via Intl.DisplayNames) em vez
// de fixo em inglês — o cadastro de aluno passa por 9 idiomas, o de tutor é
// sempre em inglês.

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

// Mesma cobertura de países que já existe pro cadastro de tutor
// (src/lib/constants.js → COUNTRIES), convertida pra código ISO — assim os
// dois cadastros (aluno e tutor) cobrem exatamente os mesmos países.
export const COUNTRY_CODES = [
  "AF","DZ","AO","AR","AU","AT","BH","BD","BE","BJ","BO","BW","BR","BF","KH",
  "CM","CA","CV","TD","CL","CN","CO","KM","CG","CR","CU","CZ","CD","DK","DJ",
  "DO","EC","EG","SV","GQ","ER","SZ","ET","FI","FR","GA","GM","DE","GH","GR",
  "GT","GN","GW","GY","HT","HN","HK","HU","IN","ID","IR","IQ","IE","IL","IT",
  "CI","JM","JP","JO","KE","KW","LA","LB","LS","LR","LY","MO","MG","MW","MY",
  "ML","MR","MU","MX","MN","MA","MZ","MM","NA","NP","NL","NZ","NI","NE","NG",
  "NO","OM","PK","PS","PA","PY","PE","PH","PL","PT","PR","QA","RO","RU","RW",
  "ST","SA","SN","SC","SL","SG","SO","ZA","KR","SS","ES","LK","SD","SR","SE",
  "CH","SY","TW","TZ","TH","TG","TN","TR","AE","UG","UA","GB","US","UY","VE",
  "VN","YE","ZM","ZW",
];

// Nome traduzido, já pronto pra ordenar de verdade (ignora acento/maiúscula
// na comparação — "São Tomé" fica no lugar certo, por exemplo).
export function sortedCountries(lang) {
  return [...COUNTRY_CODES].sort((a, b) =>
    getCountryName(a, lang).localeCompare(getCountryName(b, lang), lang.replace("_", "-"), { sensitivity: "base" })
  );
}

// Bandeira a partir do código ISO — gerada na hora, sem precisar de imagem/
// ícone externo (usa os símbolos Unicode "Regional Indicator", suportados
// nativamente por praticamente todo navegador e sistema).
export function getFlagEmoji(code) {
  if (!code || code === "OTHER" || code.length !== 2) return "";
  const upper = code.toUpperCase();
  const codePoints = [...upper].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65));
  return String.fromCodePoint(...codePoints);
}

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
