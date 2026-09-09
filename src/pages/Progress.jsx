import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Clock, BookOpen, Flame } from "lucide-react";
import { getLanguageLabel, getLanguageFlag } from "@/lib/constants";
import { formatMinutes } from "@/lib/formatMinutes";
import LessonsAndNotesSection from "@/components/student/LessonsAndNotesSection";

export default function Progress() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const stats = [
    { label: "Minutes practiced", value: formatMinutes(profile?.total_minutes || 0), icon: Clock, gradient: "from-violet-500 to-indigo-500" },
    { label: "Total lessons", value: profile?.total_lessons || 0, icon: BookOpen, gradient: "from-blue-500 to-cyan-500" },
    { label: "Day streak", value: profile?.streak_days || 0, icon: Flame, gradient: "from-orange-500 to-red-500" },
    { label: "Credits left", value: `${formatMinutes(profile?.credits_minutes)} min`, icon: Clock, gradient: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">Your Progress</h1>

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

      {profile?.target_language && (
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="theme-heading font-display font-bold text-white mb-4">Language in progress</h3>
          <div className="flex items-center gap-4 p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
            <span className="text-4xl">{getLanguageFlag(profile.target_language)}</span>
            <div>
              <p className="theme-heading font-display font-bold text-white">{getLanguageLabel(profile.target_language)}</p>
              <p className="theme-subtext text-sm text-gray-500 capitalize">{profile.level}</p>
            </div>
          </div>
        </div>
      )}

      <LessonsAndNotesSection />
    </div>
  );
}