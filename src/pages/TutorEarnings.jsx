import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { DollarSign, Clock, TrendingUp, Calendar } from "lucide-react";

export default function TutorEarnings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        const l = await base44.entities.Lesson.filter({ tutor_id: profiles[0].id, status: "completed" }, "-created_date", 20);
        setLessons(l);
      }
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

  const rate = profile?.price_per_minute || 0.5;

  return (
    <div className="pb-20 lg:pb-4">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Earnings</h1>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${(profile?.total_earnings || 0).toFixed(2)}</p>
          <p className="text-xs text-gray-500">Total earned</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile?.total_minutes || 0}</p>
          <p className="text-xs text-gray-500">Minutes taught</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <TrendingUp className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">${rate.toFixed(2)}</p>
          <p className="text-xs text-gray-500">Rate/minute</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 p-5">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center mb-3">
            <Calendar className="w-5 h-5" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{profile?.total_lessons || 0}</p>
          <p className="text-xs text-gray-500">Total lessons</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Recent lessons</h3>
        {lessons.length === 0 ? (
          <p className="text-center text-sm text-gray-500 py-4">No completed lessons yet</p>
        ) : (
          <div className="space-y-3">
            {lessons.map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                <div>
                  <p className="font-medium text-sm text-gray-900">{l.student_name}</p>
                  <p className="text-xs text-gray-500">{l.duration_minutes || 0} min · {new Date(l.ended_at || l.created_date).toLocaleDateString()}</p>
                </div>
                <span className="text-sm font-semibold text-emerald-600">
                  +${((l.duration_minutes || 0) * rate).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 bg-amber-50 border border-amber-100 rounded-2xl p-5">
        <p className="text-sm text-amber-800">
          <strong>Note:</strong> Earnings shown are simulated. Payment processing will be available in a future update.
        </p>
      </div>
    </div>
  );
}