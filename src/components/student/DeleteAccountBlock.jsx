import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Trash2, AlertTriangle, X, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLang } from "@/lib/LanguageContext";
import CancelPlanModal from "@/components/student/CancelPlanModal";

// Local translations (i18n.js is at capacity and can't grow).
const L = {
  en: {
    deleteAccountTitle: "Delete Account",
    deleteAccountDesc: "Permanently delete your account and personal data.",
    blockedTitle: "Cancel your subscription first",
    blockedDesc: "You can't delete your account while you have an active subscription or are in a grace period. Cancel your subscription first, then come back here.",
    cancelSubFirst: "Cancel subscription",
    deleteBtn: "Delete my account",
    confirmTitle: "Delete account?",
    confirmBody: "Are you sure you want to delete your account? This action cannot be undone. Your personal data will be permanently removed, but lesson and payment records will be kept for audit purposes without your name.",
    confirmBtn: "Yes, delete my account",
    cancelBtn: "No, keep my account",
    deletingBtn: "Deleting...",
    successTitle: "Account deleted",
    successDesc: "Your account has been deleted. You will be logged out.",
    errorTitle: "Error",
    errorBlocked: "You need to cancel your subscription first.",
  },
  pt_br: {
    deleteAccountTitle: "Excluir Conta",
    deleteAccountDesc: "Exclua permanentemente sua conta e dados pessoais.",
    blockedTitle: "Cancele sua assinatura primeiro",
    blockedDesc: "Você não pode excluir sua conta enquanto tem uma assinatura ativa ou está em período de carência. Cancele sua assinatura primeiro e depois volte para excluir sua conta.",
    cancelSubFirst: "Cancelar assinatura",
    deleteBtn: "Excluir minha conta",
    confirmTitle: "Excluir conta?",
    confirmBody: "Tem certeza que quer excluir sua conta? Essa ação não pode ser desfeita. Seus dados pessoais serão removidos permanentemente, mas o histórico de aulas e pagamentos será mantido para fins de auditoria sem o seu nome.",
    confirmBtn: "Sim, excluir minha conta",
    cancelBtn: "Não, manter minha conta",
    deletingBtn: "Excluindo...",
    successTitle: "Conta excluída",
    successDesc: "Sua conta foi excluída. Você será deslogado.",
    errorTitle: "Erro",
    errorBlocked: "Você precisa cancelar sua assinatura primeiro.",
  },
};

// Block 3 — Account deletion. Security gate is subscription status (not OTP):
// if the student has an active subscription or is in a grace period, deletion
// is blocked with a shortcut to the existing CancelPlanModal. Otherwise, a
// simple confirm dialog triggers deleteMyAccount, which anonymizes personal
// data and auto-logs-out the student.
export default function DeleteAccountBlock({ profile, onProfileChanged }) {
  const { lang } = useLang();
  const { toast } = useToast();
  const tr = (key) => (L[lang] && L[lang][key]) || L.en[key] || key;
  const [showConfirm, setShowConfirm] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const now = new Date();
  const isActive = profile?.subscription_status === "active";
  const validUntil = profile?.subscription_valid_until ? new Date(profile.subscription_valid_until) : null;
  const inGrace = validUntil && validUntil > now;
  const blocked = isActive || inGrace;

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
          <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
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
            <h2 className="font-display font-bold text-lg mb-3" style={{ color: "#17181C" }}>
              {tr("confirmTitle")}
            </h2>
            <p className="text-sm mb-6" style={{ color: "#5A5B66" }}>
              {tr("confirmBody")}
            </p>
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