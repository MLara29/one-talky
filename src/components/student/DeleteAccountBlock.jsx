import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLang } from "@/lib/LanguageContext";
import CancelPlanModal from "@/components/student/CancelPlanModal";
import { tsb } from "@/lib/studentBlocksI18n";

function formatDate(dateStr, lang) {
  if (!dateStr) return "";
  try {
    return new Date(dateStr).toLocaleDateString(lang === "pt_br" ? "pt-BR" : "en-US", { day: "2-digit", month: "long", year: "numeric" });
  } catch { return dateStr; }
}

// Block 3 — Account deletion. Security gate is subscription status (not OTP):
// if the student has an active subscription or is in a grace period, deletion
// is blocked with a shortcut to the existing CancelPlanModal. Otherwise, a
// confirm dialog with dynamic warnings triggers deleteMyAccount, which
// anonymizes personal data, cancels future lessons via cancelLesson, and
// auto-logs-out the student.
export default function DeleteAccountBlock({ profile, onProfileChanged }) {
  const { user } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const tr = (key) => tsb(lang, key);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [futureLessonsCount, setFutureLessonsCount] = useState(0);

  const now = new Date();
  const isActive = profile?.subscription_status === "active";
  const validUntil = profile?.subscription_valid_until ? new Date(profile.subscription_valid_until) : null;
  const inGrace = validUntil && validUntil > now;
  const blocked = isActive || inGrace;

  const prepaidMinutes = Math.round(profile?.prepaid_credits_minutes || 0);
  const planMinutes = Math.round(profile?.plan_credits_minutes || 0);
  const totalMinutes = prepaidMinutes + planMinutes;
  const prepaidExpiresAt = profile?.prepaid_expires_at;

  // Fetch future scheduled lessons count for the dynamic warning (b).
  useEffect(() => {
    if (!user?.id || blocked) return;
    base44.entities.Lesson.filter({ student_id: user.id, status: "scheduled" })
      .then(lessons => {
        const future = lessons.filter(l => l.scheduled_at && new Date(l.scheduled_at) > new Date());
        setFutureLessonsCount(future.length);
      })
      .catch(() => {});
  }, [user?.id, blocked]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const response = await base44.functions.invoke("deleteMyAccount", {});
      if (response.data?.error) throw new Error(response.data.error);
      if (response.data?.blocked) throw new Error(tr("errorBlocked"));

      toast({ title: tr("successTitle"), description: tr("successDesc") });
      setShowConfirm(false);
      setTimeout(() => base44.auth.logout("/landing"), 1500);
    } catch (e) {
      toast({ title: tr("errorTitle"), description: e?.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelled = () => {
    setShowCancelModal(false);
    if (onProfileChanged) onProfileChanged();
  };

  // Build dynamic warning list — (a) always, (b) if future lessons, (c) if minutes.
  const warnings = [tr("warningBase")];
  if (futureLessonsCount > 0) {
    warnings.push(tr("warningLessons").replace("{count}", futureLessonsCount));
  }
  if (totalMinutes > 0) {
    warnings.push(
      tr("warningMinutes")
        .replace("{minutes}", totalMinutes)
        .replace("{date}", formatDate(prepaidExpiresAt, lang))
    );
  }

  return (
    <>
      <div className="theme-card bg-white/5 border border-red-500/20 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Trash2 className="w-4 h-4 text-red-500" />
          <h2 className="theme-heading font-display text-lg font-bold">{tr("deleteAccountTitle")}</h2>
        </div>
        <p className="theme-subtext text-sm">{tr("deleteAccountDesc")}</p>

        {blocked ? (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="theme-heading text-sm font-semibold">{tr("blockedTitle")}</p>
                <p className="theme-subtext text-xs mt-1">{tr("blockedDesc")}</p>
              </div>
            </div>
            <Button
              onClick={() => setShowCancelModal(true)}
              variant="outline"
              className="w-full border-amber-500/30 text-amber-600 hover:bg-amber-500/10"
            >
              {tr("cancelSubFirst")}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => setShowConfirm(true)}
            variant="outline"
            className="w-full border-red-500/30 text-red-500 hover:bg-red-500/10"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            {tr("deleteBtn")}
          </Button>
        )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => !deleting && setShowConfirm(false)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700"
              disabled={deleting}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="font-display font-bold text-lg mb-4" style={{ color: "#17181C" }}>
              {tr("confirmTitle")}
            </h2>
            <div className="space-y-3 mb-6">
              {warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2 text-sm" style={{ color: "#5A5B66" }}>
                  <span className="text-red-400 mt-0.5 flex-shrink-0">•</span>
                  <p>{w}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowConfirm(false)}
                className="flex-1"
                disabled={deleting}
              >
                {tr("cancelBtn")}
              </Button>
              <Button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {tr("deletingBtn")}
                  </>
                ) : (
                  tr("confirmBtn")
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showCancelModal && (
        <CancelPlanModal
          profile={profile}
          onClose={() => setShowCancelModal(false)}
          onCancelled={handleCancelled}
        />
      )}
    </>
  );
}