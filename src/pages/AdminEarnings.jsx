import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { DollarSign, CheckCircle, Clock, AlertCircle, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminEarnings() {
  const { toast } = useToast();
  const [tutors, setTutors] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [tp, wr, ls] = await Promise.all([
        base44.entities.TutorProfile.filter({ status: "approved" }, "-total_earnings", 100),
        base44.entities.WithdrawalRequest.filter({}, "-created_date", 200),
        base44.entities.Lesson.filter({ status: "completed" }, "-created_date", 500),
      ]);
      setTutors(tp);
      setWithdrawals(wr);
      setLessons(ls);
    } catch {} finally { setLoading(false); }
  };

  // Calculate real earned per tutor from lessons
  const getTutorEarned = (tutorUserId, rate) => {
    return lessons
      .filter(l => l.tutor_id === tutorUserId)
      .reduce((sum, l) => sum + (l.duration_minutes || 0) * (rate || 0), 0);
  };

  const markProcessing = async (tutor) => {
    setProcessing(tutor.user_id + "_proc");
    try {
      // Create or find latest pending/none withdrawal and set to processing
      const existing = withdrawals.find(w => w.tutor_id === tutor.user_id && w.status === "pending");
      const earned = getTutorEarned(tutor.user_id, tutor.price_per_minute);
      if (existing) {
        await base44.entities.WithdrawalRequest.update(existing.id, { status: "processing" });
      } else {
        await base44.entities.WithdrawalRequest.create({
          tutor_id: tutor.user_id,
          tutor_name: tutor.full_name,
          amount: earned,
          period: new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
          pioneer_email: (() => { try { return JSON.parse(tutor.bank_info || "{}").pioneer_email || ""; } catch { return ""; } })(),
          status: "processing",
        });
      }
      toast({ title: "Payment processing notified ✅", description: `${tutor.full_name} will see the processing status.` });
      loadData();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(null); }
  };

  const markPaid = async (tutor) => {
    setProcessing(tutor.user_id + "_paid");
    try {
      const wr = withdrawals.find(w => w.tutor_id === tutor.user_id && w.status === "processing");
      if (wr) {
        await base44.entities.WithdrawalRequest.update(wr.id, { status: "paid" });
      }
      toast({ title: "Marked as paid ✅", description: `${tutor.full_name} will be asked to confirm receipt.` });
      loadData();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setProcessing(null); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Earnings & Payments</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-8">Manage tutor earnings and payment processing</p>

      <div className="space-y-3">
        {tutors.length === 0 ? (
          <div className="theme-empty text-center py-16 bg-white/3 border border-white/5 rounded-3xl">
            <p className="theme-subtext text-gray-600 text-sm">No approved tutors</p>
          </div>
        ) : tutors.map(t => {
          const earned = getTutorEarned(t.user_id, t.price_per_minute);
          const tutorWithdrawals = withdrawals.filter(w => w.tutor_id === t.user_id);
          const processingWR = tutorWithdrawals.find(w => w.status === "processing");
          const pendingWR = tutorWithdrawals.find(w => w.status === "pending");
          const paidUnconfirmed = tutorWithdrawals.find(w => w.status === "paid" && !w.tutor_confirmed);
          const hasBalance = earned > 0;

          return (
            <div key={t.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5">
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
                    <p className="theme-subtext text-xs text-gray-600">{t.total_lessons || 0} lessons · {t.total_minutes || 0} min · ${(t.price_per_minute * 60).toFixed(2)}/hr</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <p className="text-xl font-bold text-emerald-400">${earned.toFixed(2)}</p>

                  {/* Status badges */}
                  {processingWR && (
                    <span className="flex items-center gap-1 text-xs bg-blue-500/15 border border-blue-500/25 text-blue-400 px-2.5 py-1 rounded-full font-medium">
                      <Loader2 className="w-3 h-3 animate-spin" /> Processing
                    </span>
                  )}
                  {paidUnconfirmed && (
                    <span className="flex items-center gap-1 text-xs bg-amber-500/15 border border-amber-500/25 text-amber-400 px-2.5 py-1 rounded-full font-medium">
                      <Clock className="w-3 h-3" /> Awaiting tutor confirmation
                    </span>
                  )}

                  {/* Admin action buttons */}
                  {hasBalance && !processingWR && !paidUnconfirmed && (
                    <Button
                      size="sm"
                      onClick={() => markProcessing(t)}
                      disabled={!!processing}
                      className="bg-blue-500/20 border border-blue-500/30 text-blue-300 hover:bg-blue-500/30"
                    >
                      {processing === t.user_id + "_proc" ? "..." : "Mark as processing"}
                    </Button>
                  )}
                  {processingWR && (
                    <Button
                      size="sm"
                      onClick={() => markPaid(t)}
                      disabled={!!processing}
                      className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      {processing === t.user_id + "_paid" ? "..." : "Mark as paid"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Withdrawal history */}
              {tutorWithdrawals.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                  {tutorWithdrawals.slice(0, 3).map(w => (
                    <div key={w.id} className="flex items-center justify-between text-xs">
                      <span className="theme-subtext text-gray-600">{w.period}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">${w.amount?.toFixed(2)}</span>
                        <span className={`px-2 py-0.5 rounded-full font-medium border capitalize ${
                          w.status === "paid" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                          w.status === "processing" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                          w.status === "rejected" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                          "bg-amber-500/10 border-amber-500/20 text-amber-400"
                        }`}>{w.status}</span>
                        {w.tutor_confirmed && <span className="text-emerald-400 font-medium">✓ confirmed</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}