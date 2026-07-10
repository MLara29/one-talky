import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { DollarSign, Clock, TrendingUp, Calendar } from "lucide-react";

export default function TutorEarnings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        const l = await base44.entities.Lesson.filter({ tutor_id: profiles[0].id, status: "completed" }, "-created_date", 20);
        setLessons(l);
      }
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const rate = profile?.price_per_minute || 0.5;

  const stats = [
    { label: "Total earned", value: `$${(profile?.total_earnings || 0).toFixed(2)}`, icon: DollarSign, gradient: "from-emerald-500 to-teal-500" },
    { label: "Minutes taught", value: profile?.total_minutes || 0, icon: Clock, gradient: "from-violet-500 to-indigo-500" },
    { label: "Rate/minute", value: `$${rate.toFixed(2)}`, icon: TrendingUp, gradient: "from-blue-500 to-cyan-500" },
    { label: "Total lessons", value: profile?.total_lessons || 0, icon: Calendar, gradient: "from-amber-500 to-orange-500" },
  ];

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

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5">
        <p className="text-sm text-amber-600">
          <strong className="text-amber-600">Note:</strong> Earnings shown are simulated. Payment processing will be available in a future update.
        </p>
      </div>
    </div>
  );
}