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

export const PLANS = [
  { id: "free", name: "Free Trial", minutes: 15, price: 0, description: "Try it out" },
  { id: "basic", name: "Basic", minutes: 30, price: 19.90, description: "30 min/week" },
  { id: "standard", name: "Standard", minutes: 60, price: 34.90, description: "60 min/week", popular: true },
  { id: "premium", name: "Premium", minutes: 120, price: 59.90, description: "120 min/week" },
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