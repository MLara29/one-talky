import React from "react";
import { User, Mail, GraduationCap, Target, MessageSquare, Calendar } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

import { tsb } from "@/lib/studentBlocksI18n";

const OBJ_KEY = { travel: "objTravel", work: "objWork", interview: "objInterview", relocation: "objRelocation", conversation: "objConversation", exams: "objExams" };
const LEVEL_KEY = { beginner: "levelBeginner", intermediate: "levelIntermediate", advanced: "levelAdvanced" };

const LOCALE_MAP = { en: "en-US", pt_br: "pt-BR", pt_pt: "pt-PT", es: "es-ES", fr: "fr-FR", de: "de-DE", it: "it-IT", ja: "ja-JP", ko: "ko-KR" };
function formatDate(dateStr, lang) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(LOCALE_MAP[lang] || "en-US", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

// Read-only transparency block showing all personal data the platform stores
// about this student, in one place. Pulls from both StudentProfile and User.
export default function MyDataBlock({ profile, user }) {
  const { lang } = useLang();
  const tr = (key) => tsb(lang, key);

  const fullName = profile?.full_name || tr("notDefined");
  const email = user?.email || tr("notDefined");
  const level = profile?.level ? t(lang, LEVEL_KEY[profile.level]) : tr("notDefined");
  const objective = profile?.objective ? t(lang, OBJ_KEY[profile.objective]) : tr("notDefined");
  const topics = profile?.conversation_topics?.length > 0
    ? profile.conversation_topics.join(", ")
    : tr("notDefined");
  const registrationDate = formatDate(user?.created_date || profile?.created_date, lang) || tr("notDefined");

  const Row = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-3 py-2.5 border-b border-white/5 last:border-0">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="theme-subtext text-xs mb-0.5">{label}</p>
        <p className="theme-heading text-sm break-words">{value}</p>
      </div>
    </div>
  );

  return (
    <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6 space-y-1">
      <div className="flex items-center gap-2 mb-3">
        <User className="w-4 h-4 text-orange-500" />
        <div>
          <h2 className="theme-heading font-display text-lg font-bold">{tr("myDataTitle")}</h2>
          <p className="theme-subtext text-xs">{tr("myDataSubtitle")}</p>
        </div>
      </div>

      <Row icon={User} label={t(lang, "fullNameLabel")} value={fullName} />
      <Row icon={Mail} label={t(lang, "emailLabel")} value={email} />
      <Row icon={GraduationCap} label={t(lang, "currentLevelLabel")} value={level} />
      <Row icon={Target} label={t(lang, "mainObjectiveLabel")} value={objective} />
      <Row icon={MessageSquare} label={t(lang, "favoriteTopicsLabel")} value={topics} />
      <Row icon={Calendar} label={tr("registrationDateLabel")} value={registrationDate} />
    </div>
  );
}