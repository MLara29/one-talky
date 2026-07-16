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

  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const p = profiles[0];
        setProfile(p);
        const [l, w] = await Promise.all([
          base44.entities.Lesson.filter({ tutor_id: p.user_id, status: "completed" }, "-created_date", 100),
          base44.entities.WithdrawalRequest.filter({ tutor_id: p.user_id }, "-created_date", 10),
        ]);
        setLessons(l);
        setWithdrawals(w);
      }
    } catch {} finally { setLoading(false); }
  };

  const isWithdrawalDay = () => { const day = new Date().getDate(); return day === 15 || day === 30; };
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
      tutor_id: profile.user_id, tutor_name: profile.full_name,
      amount: profile.total_earnings || 0, period,
      pioneer_email: pioneerEmail, status: "pending",
    });
    toast({ title: "Withdrawal requested!", description: "We'll process your payment within 2 business days." });
    setRequesting(false);
    loadData();
  };

  const rate = profile?.price_per_minute || 0.9967;
  // Calculate total earned directly from completed lessons (source of truth)
  const totalEarned = lessons.reduce((sum, l) => sum + (l.duration_minutes || 0) * rate, 0);

  // Build per-day map for the calendar
  const dayDataMap = {};
  lessons.forEach(l => {
    const date = new Date(l.ended_at || l.created_date);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!dayDataMap[key]) dayDataMap[key] = { earnings: 0, lessons: 0, lessonList: [] };
    dayDataMap[key].earnings += (l.duration_minutes || 0) * rate;
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
              <p className="text-xs text-gray-500 mt-0.5">Request your earnings of <strong className="text-white">${totalEarned.toFixed(2)}</strong> via Payoneer.</p>
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
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const data = getDayData(day);
            const isSelected = selectedDay === day;
            const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();

            return (
              <button
                key={idx}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`relative flex flex-col items-center justify-start rounded-xl p-1 transition-all min-h-[52px] border
                  ${isSelected ? "bg-violet-600/20 border-violet-500/40" : data ? "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/15 cursor-pointer" : "border-transparent hover:bg-white/5 cursor-default"}
                `}
              >
                <span className={`text-xs font-bold mt-0.5 ${isToday ? "text-violet-400" : data ? "text-emerald-400" : "text-gray-500"}`}>
                  {day}
                </span>
                {data && (
                  <div className="mt-0.5 text-center">
                    <p className="text-[9px] font-bold text-emerald-400">${data.earnings.toFixed(0)}</p>
                    <p className="text-[8px] text-gray-500">{data.lessons} cls</p>
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
                      <p className="theme-heading font-medium text-sm text-white">{l.student_name}</p>
                      <p className="theme-subtext text-xs text-gray-500">
                        {l.duration_minutes || 0} min · {new Date(l.ended_at || l.created_date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-emerald-500">+${((l.duration_minutes || 0) * rate).toFixed(2)}</span>
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