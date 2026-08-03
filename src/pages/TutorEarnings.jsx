import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { DollarSign, Clock, TrendingUp, Calendar, AlertCircle, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function TutorEarnings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [withdrawals, setWithdrawals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);

  const today = new Date();
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => { loadData(); }, [user]);

  // Realtime: admin payment status changes update this screen without a reload
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.WithdrawalRequest.subscribe((event) => {
      if (event.data?.tutor_id === user.id) loadData();
    });
    return unsub;
  }, [user?.id]);

  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const p = profiles[0];
        setProfile(p);
        const [l, w] = await Promise.all([
          base44.entities.Lesson.filter({ tutor_id: p.user_id, status: { $in: ["completed", "no_show"] } }, "-created_date", 100),
          base44.entities.WithdrawalRequest.filter({ tutor_id: p.user_id }, "-created_date", 10),
        ]);
        setLessons(l);
        setWithdrawals(w);
      }
    } catch {} finally { setLoading(false); }
  };

  const isWithdrawalDay = () => { const day = new Date().getDate(); return day === 15 || day === 30; };
  const hasPendingWithdrawal = withdrawals.some(w => w.status === "pending");
  const processingWR = withdrawals.find(w => w.status === "processing");
  const paidUnconfirmedWR = withdrawals.find(w => w.status === "paid" && !w.tutor_confirmed);
  const getPioneerEmail = () => {
    try { return JSON.parse(profile?.bank_info || "{}").pioneer_email || null; } catch { return null; }
  };

  const requestWithdrawal = async () => {
    setRequesting(true);
    try {
      const response = await base44.functions.invoke("requestWithdrawal", {});
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Withdrawal requested!", description: "We'll process your payment within 2 business days." });
      loadData();
    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally { setRequesting(false); }
  };

  const confirmReceipt = async () => {
    if (!paidUnconfirmedWR) return;
    setRequesting(true);
    try {
      const response = await base44.functions.invoke("confirmWithdrawal", {
        withdrawal_id: paidUnconfirmedWR.id,
      });
      if (response.data?.error) throw new Error(response.data.error);
      // Admin notification is handled server-side by confirmWithdrawal
      toast({ title: "Receipt confirmed! 🎉", description: "Thank you for confirming. Your earnings have been updated." });
      loadData();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally { setRequesting(false); }
  };

  const rate = profile?.price_per_minute || 0.9967;

  // Find the latest confirmed withdrawal date — lessons before this are already paid
  const confirmedWRs = withdrawals.filter(w => w.tutor_confirmed);
  const lastConfirmedWR = confirmedWRs.sort((a, b) => new Date(b.confirmed_at || b.created_date) - new Date(a.confirmed_at || a.created_date))[0];
  const lastConfirmedAt = lastConfirmedWR ? (lastConfirmedWR.confirmed_at || lastConfirmedWR.created_date) : null;

  // Only count lessons after the last confirmed payment
  const cutoff = lastConfirmedAt ? new Date(lastConfirmedAt) : null;
  const unpaidLessons = cutoff
    ? lessons.filter(l => new Date(l.ended_at || l.updated_date || l.created_date) > cutoff)
    : lessons;

  const totalEarned = unpaidLessons.reduce((sum, l) => sum + (l.earned_amount ?? (l.duration_minutes || 0) * rate), 0);

  // Build per-day map for the calendar
  const dayDataMap = {};
  lessons.forEach(l => {
    const date = new Date(l.ended_at || l.created_date);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!dayDataMap[key]) dayDataMap[key] = { earnings: 0, lessons: 0, lessonList: [] };
    dayDataMap[key].earnings += l.earned_amount ?? ((l.duration_minutes || 0) * rate);
    dayDataMap[key].lessons += 1;
    dayDataMap[key].lessonList.push(l);
  });

  const getDayKey = (d) => `${calYear}-${calMonth}-${d}`;
  const getDayData = (d) => dayDataMap[getDayKey(d)];

  const calendarDays = buildCalendarDays(calYear, calMonth);
  const selectedDayData = selectedDay ? getDayData(selectedDay) : null;

  const prevMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); }
    else setCalMonth(m => m - 1);
    setSelectedDay(null);
  };
  const nextMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); }
    else setCalMonth(m => m + 1);
    setSelectedDay(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: "Total earned", value: `$${totalEarned.toFixed(2)}`, icon: DollarSign, gradient: "from-emerald-500 to-teal-500" },
    { label: "Minutes taught", value: profile?.total_minutes || 0, icon: Clock, gradient: "from-violet-500 to-indigo-500" },
    { label: "Rate/hour", value: `$${(rate * 60).toFixed(2)}`, icon: TrendingUp, gradient: "from-blue-500 to-cyan-500" },
    { label: "Total lessons", value: profile?.total_lessons || 0, icon: Calendar, gradient: "from-amber-500 to-orange-500" },
  ];

  const canWithdraw = isWithdrawalDay() && totalEarned > 0 && !hasPendingWithdrawal;

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">Earnings</h1>

      {/* Stats */}
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

      {/* Withdrawal */}
      {/* Payment status banners — priority order */}
      {paidUnconfirmedWR ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-emerald-400">🎉 Payment completed!</p>
              <p className="text-xs text-gray-400 mt-0.5">Your payment of <strong className="text-white">${paidUnconfirmedWR.amount?.toFixed(2)}</strong> has been sent. Please confirm you received it.</p>
            </div>
            <Button onClick={confirmReceipt} disabled={requesting} className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white border-0 shadow-lg shadow-emerald-500/20 shrink-0">
              <CheckCircle className="w-4 h-4 mr-1" />
              {requesting ? "Confirming..." : "Confirm receipt"}
            </Button>
          </div>
        </div>
      ) : processingWR ? (
        <div className="flex items-center gap-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 mb-6">
          <div className="w-5 h-5 border-2 border-blue-400/40 border-t-blue-400 rounded-full animate-spin shrink-0" />
          <div>
            <p className="text-sm font-semibold text-blue-400">Payment being processed</p>
            <p className="text-xs text-gray-500 mt-0.5">Your payment of <strong className="text-white">${processingWR.amount?.toFixed(2)}</strong> is being processed. You'll be notified when it's done.</p>
          </div>
        </div>
      ) : hasPendingWithdrawal ? (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 mb-6">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
          <p className="text-sm text-amber-500">You have a withdrawal request pending. We'll process it within 2 business days.</p>
        </div>
      ) : isWithdrawalDay() && totalEarned > 0 ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-emerald-400">🎉 Withdrawal available today!</p>
              <p className="text-xs text-gray-500 mt-0.5">Request your earnings of <strong className="text-white">${totalEarned.toFixed(2)}</strong> via Payoneer.</p>
            </div>
            <Button onClick={requestWithdrawal} disabled={requesting} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all shrink-0">
              {requesting ? "Requesting..." : "Request withdrawal"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-3 bg-white/5 border border-white/10 rounded-2xl p-5 mb-6">
          <CheckCircle className="w-5 h-5 text-gray-600 shrink-0 mt-0.5" />
          <div>
            {profile?.contract_type === "upwork" ? (
              <>
                <p className="text-sm text-gray-400">Payments are processed <strong className="text-white">every Sunday</strong> via Upwork Bonus Tool.</p>
                <p className="text-xs text-gray-600 mt-0.5">If you have a balance to receive, it will be processed weekly through your Upwork contract.</p>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">Withdrawals are processed on the <strong className="text-white">15th and 30th</strong> of each month.</p>
                <p className="text-xs text-gray-600 mt-0.5">Make sure your Payoneer email is set in <strong className="text-gray-400">Personal Info</strong> before the next withdrawal date.</p>
              </>
            )}
          </div>
        </div>
      )}

      {/* Earnings Calendar */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 mb-5">
        <div className="flex items-center justify-between mb-5">
          <h3 className="theme-heading font-display font-bold text-white">Earnings Calendar</h3>
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-400" />
            </button>
            <span className="text-sm font-semibold text-gray-300 min-w-[110px] text-center">{MONTH_NAMES[calMonth]} {calYear}</span>
            <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-2">
          {DAY_LABELS.map(d => (
            <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide py-1 text-gray-500">{d}</div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const data = getDayData(day);
            const isSelected = selectedDay === day;
            const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative flex flex-col items-start rounded-xl p-2 transition-all border
                  ${isSelected ? "bg-violet-600/20 border-violet-500/40" : data ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 cursor-pointer" : "border-white/5 hover:bg-white/5 cursor-default"}
                `}
                style={{ minHeight: 72 }}
              >
                <span className={`text-sm font-bold ${isToday ? "text-violet-400" : data ? "text-gray-300" : "text-gray-600"}`}>
                  {day}
                </span>
                {data && (
                  <div className="mt-1 w-full">
                    <p className="text-xs font-bold text-emerald-400 leading-tight">${data.earnings.toFixed(2)}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{data.lessons} aula{data.lessons !== 1 ? "s" : ""}</p>
                    {data.lessonList.some(l => l.status === "no_show") && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-red-500" title="Has no-show" />
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected day detail */}
        {selectedDay && (
          <div className="mt-5 pt-5 border-t border-white/10">
            <h4 className="theme-heading font-semibold text-white mb-3 text-sm">
              {MONTH_NAMES[calMonth]} {selectedDay} — {selectedDayData ? `$${selectedDayData.earnings.toFixed(2)} · ${selectedDayData.lessons} lesson${selectedDayData.lessons !== 1 ? "s" : ""}` : "No lessons"}
            </h4>
            {selectedDayData ? (
              <div className="space-y-2">
                {selectedDayData.lessonList.map(l => (
                  <div key={l.id} className="flex items-center justify-between p-3 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="theme-heading font-medium text-sm text-white">{l.student_name}</p>
                        {l.status === "no_show" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
                            No-show
                          </span>
                        )}
                      </div>
                      <p className="theme-subtext text-xs text-gray-500">
                        {l.duration_minutes || 0} min · {new Date(l.ended_at || l.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-500">+${(l.earned_amount ?? ((l.duration_minutes || 0) * rate)).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600 text-center py-2">No lessons on this day</p>
            )}
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