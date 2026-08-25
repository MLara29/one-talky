import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { CreditCard } from "lucide-react";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import CancelPlanModal from "@/components/student/CancelPlanModal";

const PLAN_NAME_KEYS = { basic: "planNameBasic", standard: "planNameStandard", premium: "planNamePremium" };
const STATUS_KEYS = { none: "subStatusNone", active: "subStatusActive", cancelled: "subStatusCancelled", expired: "subStatusExpired" };

// Local translations (i18n.js is at capacity and can't grow).
const L = {
  en: {
    subscriptionInfoTitle: "Plan & Subscription",
    currentPlanLabel: "Current plan",
    noActivePlan: "No active plan",
    subscriptionStatusLabel: "Subscription status",
    subscriptionStartLabel: "Start date",
    validUntilLabel: "Valid until",
    usageSummaryLabel: "Usage summary",
    totalMinutesUsed: "minutes used",
    totalLessonsCompleted: "lessons completed",
    subStatusNone: "None",
    subStatusActive: "Active",
    subStatusCancelled: "Cancelled",
    subStatusExpired: "Expired",
  },
  pt_br: {
    subscriptionInfoTitle: "Plano e Assinatura",
    currentPlanLabel: "Plano atual",
    noActivePlan: "Nenhum plano ativo",
    subscriptionStatusLabel: "Status da assinatura",
    subscriptionStartLabel: "Data de início",
    validUntilLabel: "Válido até",
    usageSummaryLabel: "Resumo de uso",
    totalMinutesUsed: "minutos usados",
    totalLessonsCompleted: "aulas concluídas",
    subStatusNone: "Nenhuma",
    subStatusActive: "Ativa",
    subStatusCancelled: "Cancelada",
    subStatusExpired: "Expirada",
  },
};

function formatDate(dateStr, lang) {
  if (!dateStr) return null;
  try {
    return new Date(dateStr).toLocaleDateString(lang === "pt_br" ? "pt-BR" : "en-US", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

// Read-only block showing the student's current plan, subscription status,
// billing dates, and usage summary. Reuses the existing CancelPlanModal
// (same one used on Plans.jsx) when the subscription is active.
export default function SubscriptionInfoBlock({ profile, onProfileChanged }) {
  const { lang } = useLang();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const tr = (key) => (L[lang] && L[lang][key]) || L.en[key] || key;

  const plan = profile?.plan;
  const isActive = profile?.subscription_status === "active";
  const planName = plan && plan !== "free"
    ? (PLAN_NAME_KEYS[plan] ? t(lang, PLAN_NAME_KEYS[plan]) : plan)
    : tr("noActivePlan");
  const status = profile?.subscription_status || "none";
  const statusLabel = tr(STATUS_KEYS[status] || "subStatusNone");
  const startDate = formatDate(profile?.subscription_start_date, lang);
  const validUntil = formatDate(profile?.subscription_valid_until, lang);
  const totalMinutes = profile?.total_minutes || 0;
  const totalLessons = profile?.total_lessons || 0;

  const handleCancelled = () => {
    setShowCancelModal(false);
    if (onProfileChanged) onProfileChanged();
  };

  return (
    <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
      <div className="flex items-center gap-2">
        <CreditCard className="w-4 h-4 text-orange-500" />
        <h2 className="theme-heading font-display text-lg font-bold">{tr("subscriptionInfoTitle")}</h2>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="theme-subtext text-sm">{tr("currentPlanLabel")}</span>
          <span className="theme-heading text-sm font-semibold">{planName}</span>
        </div>

        <div className="flex justify-between items-center">
          <span className="theme-subtext text-sm">{tr("subscriptionStatusLabel")}</span>
          <span className="text-sm font-medium">{statusLabel}</span>
        </div>

        {startDate && (
          <div className="flex justify-between items-center">
            <span className="theme-subtext text-sm">{tr("subscriptionStartLabel")}</span>
            <span className="text-sm">{startDate}</span>
          </div>
        )}

        {validUntil && (
          <div className="flex justify-between items-center">
            <span className="theme-subtext text-sm">{tr("validUntilLabel")}</span>
            <span className="text-sm">{validUntil}</span>
          </div>
        )}
      </div>

      <div className="border-t border-white/10 pt-4">
        <p className="theme-subtext text-xs mb-3">{tr("usageSummaryLabel")}</p>
        <div className="flex gap-4">
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
            <p className="theme-heading text-xl font-bold">{totalMinutes}</p>
            <p className="theme-subtext text-xs">{tr("totalMinutesUsed")}</p>
          </div>
          <div className="flex-1 bg-white/5 rounded-xl p-3 text-center">
            <p className="theme-heading text-xl font-bold">{totalLessons}</p>
            <p className="theme-subtext text-xs">{tr("totalLessonsCompleted")}</p>
          </div>
        </div>
      </div>

      {isActive && (
        <Button
          onClick={() => setShowCancelModal(true)}
          variant="outline"
          className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10"
        >
          {t(lang, "cancelSubBtn")}
        </Button>
      )}

      {showCancelModal && (
        <CancelPlanModal
          profile={profile}
          onClose={() => setShowCancelModal(false)}
          onCancelled={handleCancelled}
        />
      )}
    </div>
  );
}