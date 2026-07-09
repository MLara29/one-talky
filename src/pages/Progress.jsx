import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Clock, BookOpen, Flame, Globe } from "lucide-react";
import { getLanguageLabel, getLanguageFlag } from "@/lib/constants";

export default function Progress() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch {} finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const stats = [
    { label: "Minutes practiced", value: profile?.total_minutes || 0, icon: Clock, color: "bg-violet-50 text-violet-600" },
    { label: "Total lessons", value: profile?.total_lessons || 0, icon: BookOpen, color: "bg-blue-50 text-blue-600" },
    { label: "Day streak", value: profile?.streak_days || 0, icon: Flame, color: "bg-orange-50 text-orange-600" },
    { label: "Credits left", value: `${profile?.credits_minutes || 0} min`, icon: Clock, color: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="pb-20 lg:pb-4">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Your Progress</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center mb-3`}>
              <s.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {profile?.target_language && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Language in progress</h3>
          <div className="flex items-center gap-4 p-4 rounded-xl bg-violet-50">
            <span className="text-3xl">{getLanguageFlag(profile.target_language)}</span>
            <div>
              <p className="font-semibold text-gray-900">{getLanguageLabel(profile.target_language)}</p>
              <p className="text-sm text-gray-500 capitalize">{profile.level}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}