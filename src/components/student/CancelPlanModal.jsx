import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// Standalone cancellation-confirmation modal used on Plans.jsx.
// Cancellation is enforced server-side by cancelMyPlan — plan goes back to
// "free" and credits_minutes is zeroed (there's no partial refund of unused
// minutes today, so the copy below states that plainly).
export default function CancelPlanModal({ profile, onClose, onCancelled }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const handleCancel = async () => {
    setSaving(true);
    try {
      const response = await base44.functions.invoke("cancelMyPlan", {});
      if (response.data?.error) throw new Error(response.data.error);
      onCancelled(response.data?.provider);
      setDone(true);
    } catch (e) {
      toast({ title: "Erro ao cancelar plano", description: e?.message || "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-white border border-gray-200 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button onClick={onClose} className="absolute top-5 right-5 text-gray-400 hover:text-gray-700">
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-7 h-7 text-emerald-500" />
            </div>
            <h3 className="font-display font-bold text-lg mb-2" style={{ color: "#17181C" }}>Assinatura cancelada</h3>
            <p className="text-sm mb-6" style={{ color: "#5A5B66" }}>
              {profile?.subscription_provider === "stripe"
                ? "Sua assinatura foi cancelada. Você mantém acesso aos minutos restantes até o fim do período já pago."
                : "Seu plano voltou para Free. Você pode assinar novamente quando quiser."}
            </p>
            <Button onClick={onClose} className="w-full bg-[#F26A1B] hover:bg-[#d9560e] text-white border-0">Fechar</Button>
          </div>
        ) : (
          <>
            <div className="w-11 h-11 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center mb-4">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 className="font-display font-bold text-lg mb-2" style={{ color: "#17181C" }}>Cancelar assinatura?</h2>
            <p className="text-sm mb-4" style={{ color: "#5A5B66" }}>
              Você pode cancelar a qualquer momento, sem multa. Ao confirmar:
            </p>
            <ul className="text-sm mb-6 space-y-2" style={{ color: "#4B4C57" }}>
              <li>• Sua assinatura será cancelada.</li>
              {profile?.subscription_provider === "stripe" ? (
                <li>• Você mantém acesso aos <strong>{profile?.credits_minutes || 0} minutos</strong> restantes até o fim do período já pago — a cobrança automática para a partir daí.</li>
              ) : (
                <li>• Os <strong>{profile?.credits_minutes || 0} minutos</strong> restantes serão zerados imediatamente — não há reembolso ou aproveitamento após o cancelamento.</li>
              )}
              <li>• Você pode assinar um novo plano a qualquer momento.</li>
            </ul>
            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1" disabled={saving}>
                Voltar
              </Button>
              <Button
                onClick={handleCancel}
                disabled={saving}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0"
              >
                {saving ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}