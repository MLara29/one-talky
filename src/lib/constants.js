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

// Preço base: R$ 66 por 30 minutos (R$ 2,20/min)
// R$/min = 2.20
export const PRICE_PER_MIN_BRL = 2.20;

export const PLANS = [
  { id: "free", name: "Teste Grátis", minutes: 15, price_brl: 0, description: "Experimente a plataforma" },
  { id: "basic", name: "Básico", minutes: 120, price_brl: 264, description: "120 min/mês · R$ 2,20/min", popular: false },
  { id: "standard", name: "Standard", minutes: 240, price_brl: 475.20, description: "240 min/mês · 10% off", popular: true },
  { id: "premium", name: "Premium", minutes: 480, price_brl: 844.80, description: "480 min/mês · 20% off" },
];

// Pacotes pré-pagos (sem mensalidade)
export const PREPAID_PACKS = [
  { id: "pp_30", minutes: 30, price_brl: 66, label: "30 minutos" },
  { id: "pp_60", minutes: 60, price_brl: 126, label: "60 minutos", badge: "5% off" },
  { id: "pp_120", minutes: 120, price_brl: 237.60, label: "2 horas", badge: "10% off" },
  { id: "pp_300", minutes: 300, price_brl: 561, label: "5 horas", badge: "15% off" },
  { id: "pp_600", minutes: 600, price_brl: 1056, label: "10 horas", badge: "20% off" },
];

export function getLanguageLabel(value) {
  return LANGUAGES.find(l => l.value === value)?.label || value;
}

export function getLanguageFlag(value) {
  return LANGUAGES.find(l => l.value === value)?.flag || "🌍";
}

export function getCountryFlag(country) {
  const flags = {
    "United States": "🇺🇸", "United Kingdom": "🇬🇧", "Canada": "🇨🇦", "Australia": "🇦🇺",
    "Ireland": "🇮🇪", "Spain": "🇪🇸", "Mexico": "🇲🇽", "Argentina": "🇦🇷",
    "Colombia": "🇨🇴", "Chile": "🇨🇱", "France": "🇫🇷", "Belgium": "🇧🇪",
    "Switzerland": "🇨🇭", "Italy": "🇮🇹", "Germany": "🇩🇪", "Austria": "🇦🇹",
    "Brazil": "🇧🇷", "Portugal": "🇵🇹", "Japan": "🇯🇵", "South Korea": "🇰🇷",
    "China": "🇨🇳", "India": "🇮🇳", "South Africa": "🇿🇦", "New Zealand": "🇳🇿",
    "Netherlands": "🇳🇱", "Sweden": "🇸🇪", "Norway": "🇳🇴", "Denmark": "🇩🇰",
  };
  return flags[country] || "🌍";
}