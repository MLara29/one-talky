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
  "United States", "United Kingdom", "Canada", "Australia", "Ireland",
  "Spain", "Mexico", "Argentina", "Colombia", "Chile",
  "France", "Belgium", "Switzerland", "Canada (QC)",
  "Italy", "Germany", "Austria", "Brazil", "Portugal",
  "Japan", "South Korea", "China", "India", "South Africa",
  "New Zealand", "Netherlands", "Sweden", "Norway", "Denmark",
];

// Preço base: R$29,90 por 30 minutos (R$0,9967/min)
export const PRICE_PER_MIN_BRL = 0.9967;

// Básico:   1 aula/semana × 4 semanas = 4 × R$29,90 = R$119,60/mês
// Standard: 2 aulas/semana × 4 = 8 × R$29,90 = R$239,20 → 5% off = R$227,24/mês
// Premium:  4 aulas/semana × 4 = 16 × R$29,90 = R$478,40 → 10% off = R$430,56/mês
export const PLANS = [
  { id: "free", name: "Teste Grátis", minutes: 15, price_brl: 0, price_weekly: 0, price_monthly: 0, description: "Experimente a plataforma", sessions_per_week: 0 },
  { id: "basic", name: "Básico", minutes: 120, price_brl: 119.60, price_weekly: 29.90, price_monthly: 119.60, description: "120 min/mês · 4 aulas de 30 min", popular: false, sessions_per_week: 1 },
  { id: "standard", name: "Standard", minutes: 240, price_brl: 227.24, price_weekly: 56.81, price_monthly: 227.24, description: "240 min/mês · 8 aulas de 30 min", popular: true, sessions_per_week: 2 },
  { id: "premium", name: "Premium", minutes: 480, price_brl: 430.56, price_weekly: 107.64, price_monthly: 430.56, description: "480 min/mês · 16 aulas de 30 min", sessions_per_week: 4 },
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
    "Moroccan": "🇲🇦", "Egyptian": "🇪🇬", "Nigerian": "🇳🇬", "Kenyan": "🇰🇪",
    "Russian": "🇷🇺", "Israeli": "🇮🇱", "Saudi": "🇸🇦", "Emirati": "🇦🇪",
  };
  // Case-insensitive lookup
  const key = Object.keys(flags).find(k => k.toLowerCase() === country.toLowerCase());
  return key ? flags[key] : "🌍";
}