import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

// Renders one payout-frequency tab's list of due tutors, reusing the
// existing adminManageWithdrawal action buttons (mark_processing / mark_paid).
export default function PayoutFrequencyTab({ tutors, onChanged }) {
  const { toast } = useToast();
  const [processing, setProcessing] = useState(null);

  const markProcessing = async (tutor) => {
    setProcessing(tutor.user_id + "_proc");
    try {
      const response = await base44.functions.invoke("adminManageWithdrawal", { tutor_id: tutor.user_id, action: "mark_processing" });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Payment processing notified ✅", description: `${tutor.full_name} will see the processing status.` });
      onChanged?.();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setProcessing(null); }
  };

  const markPaid = async (tutor) => {
    setProcessing(tutor.user_id + "_paid");
    try {
      const response = await base44.functions.invoke("adminManageWithdrawal", { tutor_id: tutor.user_id, action: "mark_paid" });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Marked as paid ✅", description: `${tutor.full_name} will be asked to confirm receipt.` });
      onChanged?.();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setProcessing(null); }
  };

  if (tutors.length === 0) {
    return (
      <div className="theme-empty text-center py-16 bg-white/3 border border-white/5 rounded-3xl mt-4">
        <p className="theme-subtext text-gray-600 text-sm">No tutors due for payout in this group</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mt-4">
      {tutors.map(t => (
        <div key={t.user_id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <img
                src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=F26A1B&color=fff&size=48`}
                alt={t.full_name}
                className="w-10 h-10 rounded-xl object-cover ring-2 ring-white/10"
              />
              <div>
                <div className="flex items-center gap-2">
                  <p className="theme-heading font-semibold text-white text-sm">{t.full_name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full border bg-white/5 border-white/10 text-gray-500 capitalize">{t.contract_type || "direct"}</span>
                </div>
                <p className="theme-subtext text-xs text-gray-600">
                  {t.days_since_paid === null ? "Never paid before" : `${t.days_since_paid} day${t.days_since_paid === 1 ? "" : "s"} since last payment`}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <p className="text-xl font-bold text-emerald-400">${t.earned.toFixed(2)}</p>
              <Button
                size="sm"
                onClick={() => markProcessing(t)}
                disabled={!!processing}
                className="bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
              >
                {processing === t.user_id + "_proc" ? "..." : "Mark as processing"}
              </Button>
              <Button
                size="sm"
                onClick={() => markPaid(t)}
                disabled={!!processing}
                className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
              >
                {processing === t.user_id + "_paid" ? "..." : "Mark as paid"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}