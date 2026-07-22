export const LANGUAGES = [
  { value: "english", label: "English", flag: "🇬🇧" },
  { value: "spanish", label: "Español", flag: "🇪🇸" },
  { value: "french", label: "Français", flag: "🇫🇷" },
  { value: "italian", label: "Italiano", flag: "🇮🇹" },
  { value: "german", label: "Deutsch", flag: "🇩🇪" },
  { value: "portuguese_br", label: "Português (Brasil)", flag: "🇧🇷" },
  { value: "portuguese_pt", label: "Português (Portugal)", flag: "🇵🇹" },
];

export const ACCENTS = {
  english: ["American", "British", "Australian", "Canadian", "Neutral"],
  spanish: ["Spain", "Mexican", "Argentine", "Colombian", "Neutral"],
  french: ["France", "Canadian", "Belgian", "Swiss", "Neutral"],
  italian: ["Standard", "Northern", "Southern", "Neutral"],
  german: ["Standard", "Austrian", "Swiss", "Neutral"],
  portuguese_br: ["São Paulo", "Rio de Janeiro", "Nordestino", "Mineiro", "Neutro"],
  portuguese_pt: ["Lisboa", "Porto", "Alentejano", "Neutro"],
};

export const UI_LANGUAGES = [
  { value: "en", label: "English", flag: "🇬🇧" },
  { value: "pt_br", label: "Português (BR)", flag: "🇧🇷" },
  { value: "pt_pt", label: "Português (PT)", flag: "🇵🇹" },
  { value: "es", label: "Español", flag: "🇪🇸" },
  { value: "fr", label: "Français", flag: "🇫🇷" },
  { value: "de", label: "Deutsch", flag: "🇩🇪" },
  { value: "it", label: "Italiano", flag: "🇮🇹" },
];

export const INTERESTS = [
  "Travel", "Business", "Pop Culture", "Job Interviews",
  "Daily Life", "Sports", "Technology", "Food & Cooking",
  "Movies & TV", "Music", "Politics", "Science",
  "Art & Design", "Health & Fitness", "Education",
];

export const OBJECTIVES = [
  { value: "travel", label: "Travel" },
  { value: "work", label: "Work" },
  { value: "interview", label: "Job Interviews" },
  { value: "relocation", label: "Moving Abroad" },
  { value: "conversation", label: "General Conversation" },
  { value: "exams", label: "Language Exams" },
];

export const LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

export const COUNTRIES = [
  // North America
  "United States", "Canada", "Mexico",
  // Central America & Caribbean
  "Guatemala", "Honduras", "El Salvador", "Nicaragua", "Costa Rica", "Panama",
  "Cuba", "Dominican Republic", "Haiti", "Jamaica", "Puerto Rico",
  // South America
  "Brazil", "Argentina", "Colombia", "Chile", "Peru", "Venezuela",
  "Ecuador", "Bolivia", "Paraguay", "Uruguay", "Guyana", "Suriname",
  // Europe
  "United Kingdom", "Ireland", "France", "Belgium", "Switzerland",
  "Spain", "Portugal", "Italy", "Germany", "Austria", "Netherlands",
  "Sweden", "Norway", "Denmark", "Finland", "Poland", "Romania",
  "Ukraine", "Russia", "Greece", "Czech Republic", "Hungary",
  "Canada (QC)", "Australia", "New Zealand",
  // Africa
  "Nigeria", "South Africa", "Kenya", "Ethiopia", "Ghana",
  "Tanzania", "Uganda", "Rwanda", "Senegal", "Ivory Coast",
  "Cameroon", "Angola", "Mozambique", "Zimbabwe", "Zambia",
  "Malawi", "Madagascar", "Morocco", "Algeria", "Tunisia",
  "Libya", "Egypt", "Sudan", "South Sudan", "Somalia",
  "DR Congo", "Congo", "Gabon", "Benin", "Togo",
  "Burkina Faso", "Mali", "Niger", "Chad", "Mauritania",
  "Gambia", "Guinea", "Guinea-Bissau", "Sierra Leone", "Liberia",
  "Cape Verde", "São Tomé and Príncipe", "Equatorial Guinea",
  "Eritrea", "Djibouti", "Comoros", "Mauritius", "Seychelles",
  "Botswana", "Namibia", "Lesotho", "Eswatini",
  // Asia
  "Philippines", "India", "China", "Japan", "South Korea",
  "Vietnam", "Thailand", "Indonesia", "Malaysia", "Singapore",
  "Myanmar", "Cambodia", "Laos", "Bangladesh", "Sri Lanka",
  "Nepal", "Pakistan", "Afghanistan", "Iran", "Iraq",
  "Turkey", "Saudi Arabia", "UAE", "Qatar", "Kuwait",
  "Bahrain", "Oman", "Jordan", "Lebanon", "Syria",
  "Israel", "Palestine", "Yemen", "Mongolia", "Taiwan",
  "Hong Kong", "Macau",
];

// Preço base: R$29,90 por 30 minutos (R$0,9967/min)
export const PRICE_PER_MIN_BRL = 0.9967;

// Básico:   1 aula/semana × 4 semanas = 4 × R$29,90 = R$119,60/mês
// Standard: 2 aulas/semana × 4 = 8 × R$29,90 = R$239,20 → 5% off = R$227,24/mês
// Premium:  4 aulas/semana × 4 = 16 × R$29,90 = R$478,40 → 10% off = R$430,56/mês
// Básico: 60 min · 2 aulas de 30min
// Standard: 120 min · 4 aulas de 30min ou 2 de 1h
// Premium: 240 min · 8 aulas de 30min ou 4 de 1h
export const PLANS = [
  { id: "basic",    name: "Básico",   minutes: 60,  price_brl: 59.80,  price_weekly: 29.90, price_monthly: 59.80,  description: "60 min/mês · 2 aulas de 30 min",  popular: false, sessions_per_week: 0.5 },
  { id: "standard", name: "Standard", minutes: 120, price_brl: 119.60, price_weekly: 29.90, price_monthly: 119.60, description: "120 min/mês · 4×30 min ou 2×1h",     popular: true,  sessions_per_week: 1 },
  { id: "premium",  name: "Premium",  minutes: 240, price_brl: 227.24, price_weekly: 56.81, price_monthly: 227.24, description: "240 min/mês · 8×30 min ou 4×1h",     popular: false, sessions_per_week: 2 },
];

// Pacotes pré-pagos (sem mensalidade) — base R$29,90/30min
export const PREPAID_PACKS = [
  { id: "pp_30", minutes: 30, price_brl: 29.90, label: "30 minutos" },
  { id: "pp_60", minutes: 60, price_brl: 56.81, label: "60 minutos", badge: "5% off" },
  { id: "pp_120", minutes: 120, price_brl: 107.64, label: "2 horas", badge: "10% off" },
  { id: "pp_300", minutes: 300, price_brl: 254.15, label: "5 horas", badge: "15% off" },
  { id: "pp_600", minutes: 600, price_brl: 478.40, label: "10 horas", badge: "20% off" },
];

export function getLanguageLabel(value) {
  return LANGUAGES.find(l => l.value === value)?.label || value;
}

export function getLanguageFlag(value) {
  return LANGUAGES.find(l => l.value === value)?.flag || "🌍";
}

export function getCountryFlag(country) {
  if (!country) return "🌍";
  const flags = {
    // Country names
    "United States": "🇺🇸", "United Kingdom": "🇬🇧", "Canada": "🇨🇦", "Australia": "🇦🇺",
    "Ireland": "🇮🇪", "Spain": "🇪🇸", "Mexico": "🇲🇽", "Argentina": "🇦🇷",
    "Colombia": "🇨🇴", "Chile": "🇨🇱", "France": "🇫🇷", "Belgium": "🇧🇪",
    "Switzerland": "🇨🇭", "Italy": "🇮🇹", "Germany": "🇩🇪", "Austria": "🇦🇹",
    "Brazil": "🇧🇷", "Portugal": "🇵🇹", "Japan": "🇯🇵", "South Korea": "🇰🇷",
    "China": "🇨🇳", "India": "🇮🇳", "South Africa": "🇿🇦", "New Zealand": "🇳🇿",
    "Netherlands": "🇳🇱", "Sweden": "🇸🇪", "Norway": "🇳🇴", "Denmark": "🇩🇰",
    // Nationalities (adjective form)
    "American": "🇺🇸", "British": "🇬🇧", "Canadian": "🇨🇦", "Australian": "🇦🇺",
    "Irish": "🇮🇪", "Spanish": "🇪🇸", "Mexican": "🇲🇽", "Argentine": "🇦🇷", "Argentinian": "🇦🇷",
    "Colombian": "🇨🇴", "Chilean": "🇨🇱", "French": "🇫🇷", "Belgian": "🇧🇪",
    "Swiss": "🇨🇭", "Italian": "🇮🇹", "German": "🇩🇪", "Austrian": "🇦🇹",
    "Brazilian": "🇧🇷", "Portuguese": "🇵🇹", "Japanese": "🇯🇵", "Korean": "🇰🇷", "South Korean": "🇰🇷",
    "Chinese": "🇨🇳", "Indian": "🇮🇳", "South African": "🇿🇦", "New Zealander": "🇳🇿",
    "Dutch": "🇳🇱", "Swedish": "🇸🇪", "Norwegian": "🇳🇴", "Danish": "🇩🇰",
    "Venezuelan": "🇻🇪", "Peruvian": "🇵🇪", "Ecuadorian": "🇪🇨", "Bolivian": "🇧🇴",
    "Uruguayan": "🇺🇾", "Paraguayan": "🇵🇾", "Filipino": "🇵🇭", "Thai": "🇹🇭",
    "Vietnamese": "🇻🇳", "Indonesian": "🇮🇩", "Malaysian": "🇲🇾", "Pakistani": "🇵🇰",
    "Turkish": "🇹🇷", "Polish": "🇵🇱", "Romanian": "🇷🇴", "Ukrainian": "🇺🇦",
    "Greek": "🇬🇷", "Finnish": "🇫🇮", "Czech": "🇨🇿", "Hungarian": "🇭🇺",
    "Kenya": "🇰🇪", "Morocco": "🇲🇦", "Egypt": "🇪🇬", "Nigeria": "🇳🇬",
    "Ghana": "🇬🇭", "Ethiopia": "🇪🇹", "Tanzania": "🇹🇿", "Uganda": "🇺🇬",
    "Rwanda": "🇷🇼", "Senegal": "🇸🇳", "Ivory Coast": "🇨🇮", "Cameroon": "🇨🇲",
    "Angola": "🇦🇴", "Mozambique": "🇲🇿", "Zimbabwe": "🇿🇼", "Zambia": "🇿🇲",
    "Malawi": "🇲🇼", "Madagascar": "🇲🇬", "Algeria": "🇩🇿", "Tunisia": "🇹🇳",
    "Libya": "🇱🇾", "Sudan": "🇸🇩", "South Sudan": "🇸🇸", "Somalia": "🇸🇴",
    "DR Congo": "🇨🇩", "Congo": "🇨🇬", "Gabon": "🇬🇦", "Benin": "🇧🇯", "Togo": "🇹🇬",
    "Burkina Faso": "🇧🇫", "Mali": "🇲🇱", "Niger": "🇳🇪", "Chad": "🇹🇩",
    "Mauritania": "🇲🇷", "Gambia": "🇬🇲", "Guinea": "🇬🇳", "Guinea-Bissau": "🇬🇼",
    "Sierra Leone": "🇸🇱", "Liberia": "🇱🇷", "Cape Verde": "🇨🇻",
    "São Tomé and Príncipe": "🇸🇹", "Equatorial Guinea": "🇬🇶",
    "Eritrea": "🇪🇷", "Djibouti": "🇩🇯", "Comoros": "🇰🇲", "Mauritius": "🇲🇺",
    "Seychelles": "🇸🇨", "Botswana": "🇧🇼", "Namibia": "🇳🇦", "Lesotho": "🇱🇸", "Eswatini": "🇸🇿",
    "Philippines": "🇵🇭", "Vietnam": "🇻🇳", "Thailand": "🇹🇭", "Indonesia": "🇮🇩",
    "Malaysia": "🇲🇾", "Singapore": "🇸🇬", "Myanmar": "🇲🇲", "Cambodia": "🇰🇭",
    "Laos": "🇱🇦", "Bangladesh": "🇧🇩", "Sri Lanka": "🇱🇰", "Nepal": "🇳🇵",
    "Pakistan": "🇵🇰", "Afghanistan": "🇦🇫", "Iran": "🇮🇷", "Iraq": "🇮🇶",
    "Turkey": "🇹🇷", "Saudi Arabia": "🇸🇦", "UAE": "🇦🇪", "Qatar": "🇶🇦",
    "Kuwait": "🇰🇼", "Bahrain": "🇧🇭", "Oman": "🇴🇲", "Jordan": "🇯🇴",
    "Lebanon": "🇱🇧", "Syria": "🇸🇾", "Israel": "🇮🇱", "Palestine": "🇵🇸",
    "Yemen": "🇾🇪", "Mongolia": "🇲🇳", "Taiwan": "🇹🇼", "Hong Kong": "🇭🇰", "Macau": "🇲🇴",
    "Guatemala": "🇬🇹", "Honduras": "🇭🇳", "El Salvador": "🇸🇻", "Nicaragua": "🇳🇮",
    "Costa Rica": "🇨🇷", "Panama": "🇵🇦", "Cuba": "🇨🇺", "Dominican Republic": "🇩🇴",
    "Haiti": "🇭🇹", "Jamaica": "🇯🇲", "Peru": "🇵🇪", "Venezuela": "🇻🇪",
    "Ecuador": "🇪🇨", "Bolivia": "🇧🇴", "Paraguay": "🇵🇾", "Uruguay": "🇺🇾",
    "Guyana": "🇬🇾", "Suriname": "🇸🇷", "Poland": "🇵🇱", "Romania": "🇷🇴",
    "Ukraine": "🇺🇦", "Russia": "🇷🇺", "Greece": "🇬🇷", "Finland": "🇫🇮",
    "Czech Republic": "🇨🇿", "Hungary": "🇭🇺",
    "Moroccan": "🇲🇦", "Egyptian": "🇪🇬", "Nigerian": "🇳🇬", "Kenyan": "🇰🇪",
    "Saudi": "🇸🇦", "Emirati": "🇦🇪",
  };
  // Case-insensitive lookup
  const key = Object.keys(flags).find(k => k.toLowerCase() === country.toLowerCase());
  return key ? flags[key] : "🌍";
}