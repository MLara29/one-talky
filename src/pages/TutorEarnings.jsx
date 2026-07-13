import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { DollarSign, Clock, TrendingUp, Calendar, AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function TutorEarnings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const p = profiles[0];
        setProfile(p);
        const [l, w] = await Promise.all([
          base44.entities.Lesson.filter({ tutor_id: p.user_id, status: "completed" }, "-created_date", 20),
          base44.entities.WithdrawalRequest.filter({ tutor_id: p.user_id }, "-created_date", 10),
        ]);
        setLessons(l);
        setWithdrawals(w);
      }
    } catch {} finally { setLoading(false); }
  };

  const isWithdrawalDay = () => {
    const day = new Date().getDate();
    return day === 15 || day === 30;
  };

  const hasPendingWithdrawal = withdrawals.some(w => w.status === "pending");

  const getPioneerEmail = () => {
    try { return JSON.parse(profile?.bank_info || "{}").pioneer_email || null; } catch { return null; }
  };

  const requestWithdrawal = async () => {
    const pioneerEmail = getPioneerEmail();
    if (!pioneerEmail) {
      toast({ title: "Payoneer email not set", description: "Please add your Payoneer email in Personal Info before requesting a withdrawal.", variant: "destructive" });
      return;
    }
    setRequesting(true);
    const today = new Date();
    const period = `${today.toLocaleString("en-US", { month: "long" })} ${today.getDate()}`;
    await base44.entities.WithdrawalRequest.create({
      tutor_id: profile.user_id,
      tutor_name: profile.full_name,
      amount: profile.total_earnings || 0,
      period,
      pioneer_email: pioneerEmail,
      status: "pending",
    });
    toast({ title: "Withdrawal requested!", description: "We'll process your payment within 2 business days." });
    setRequesting(false);
    loadData();
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const rate = profile?.price_per_minute || 0.9967;
  const totalEarned = profile?.total_earnings || 0;

  const stats = [
    { label: "Total earned", value: `$${totalEarned.toFixed(2)}`, icon: DollarSign, gradient: "from-emerald-500 to-teal-500" },
    { label: "Minutes taught", value: profile?.total_minutes || 0, icon: Clock, gradient: "from-violet-500 to-indigo-500" },
    { label: "Rate/minute", value: `$${rate.toFixed(2)}`, icon: TrendingUp, gradient: "from-blue-500 to-cyan-500" },
    { label: "Total lessons", value: profile?.total_lessons || 0, icon: Calendar, gradient: "from-amber-500 to-orange-500" },
  ];

  const canWithdraw = isWithdrawalDay() && totalEarned > 0 && !hasPendingWithdrawal;

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">Earnings</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/8 transition-all">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 shadow-lg`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="theme-heading font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="theme-subtext text-xs text-gray-600 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Withdrawal info / action */}
      {hasPendingWithdrawal ? (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-500">You have a withdrawal request pending. We'll process it within 2 business days.</p>
        </div>
      ) : isWithdrawalDay() && totalEarned > 0 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-emerald-400">🎉 Withdrawal available today!</p>
              <p className="text-xs text-gray-500 mt-0.5">Request your earnings of <strong className="text-white">${totalEarned.toFixed(2)}</strong> to be sent via Payoneer.</p>
            </div>
            <Button onClick={requestWithdrawal} disabled={requesting} className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all shrink-0">
              {requesting ? "Requesting..." : "Request withdrawal"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <CheckCircle className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-gray-400">Withdrawals are processed on the <strong className="text-white">15th and 30th</strong> of each month.</p>
            <p className="text-xs text-gray-600 mt-0.5">Make sure your Payoneer email is set in <strong className="text-gray-400">Personal Info</strong> before the next withdrawal date.</p>
          </div>
        </div>
      )}

      {/* Recent lessons */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 mb-5">
        <h3 className="theme-heading font-display font-bold text-white mb-5">Recent lessons</h3>
        {lessons.length === 0 ? (
          <p className="theme-subtext text-center text-sm text-gray-600 py-6">No completed lessons yet</p>
        ) : (
          <div className="space-y-3">
            {lessons.map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="theme-heading font-medium text-sm text-white">{l.student_name}</p>
                  <p className="theme-subtext text-xs text-gray-600">{l.duration_minutes || 0} min · {new Date(l.ended_at || l.created_date).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-bold text-emerald-500">+${((l.duration_minutes || 0) * rate).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Past withdrawals */}
      {withdrawals.length > 0 && (
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="theme-heading font-display font-bold text-white mb-4">Withdrawal history</h3>
          <div className="space-y-2">
            {withdrawals.map(w => (
              <div key={w.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                <div>
                  <p className="theme-heading text-sm font-medium text-white">${w.amount?.toFixed(2)}</p>
                  <p className="theme-subtext text-xs text-gray-600">{w.period} · {w.pioneer_email}</p>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                  w.status === "paid" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-500" :
                  w.status === "rejected" ? "bg-red-500/10 border-red-500/20 text-red-500" :
                  "bg-amber-500/10 border-amber-500/20 text-amber-500"
                } capitalize`}>{w.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}