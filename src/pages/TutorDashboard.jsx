import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Calendar, Clock, DollarSign, Star, Users, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function TutorDashboard() {
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
        const l = await base44.entities.Lesson.filter({ tutor_id: profiles[0].id, status: "scheduled" });
        setLessons(l);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    const updated = await base44.entities.TutorProfile.update(profile.id, {
      is_available_now: !profile.is_available_now
    });
    setProfile({ ...profile, is_available_now: !profile.is_available_now });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h3 className="font-semibold text-gray-900 mb-1">Profile not found</h3>
        <p className="text-sm text-gray-500">Complete your tutor onboarding first.</p>
      </div>
    );
  }

  if (profile.status === "pending") {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
          <Clock className="w-8 h-8 text-amber-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Application under review</h2>
        <p className="text-gray-500 text-sm">Your tutor profile is being reviewed by our team. We'll notify you once it's approved. This usually takes 24-48 hours.</p>
      </div>
    );
  }

  if (profile.status === "rejected") {
    return (
      <div className="text-center py-20 max-w-md mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-5">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="font-display text-xl font-bold text-gray-900 mb-2">Application not approved</h2>
        <p className="text-gray-500 text-sm">Unfortunately your application was not approved at this time. Please contact support for more information.</p>
      </div>
    );
  }

  const stats = [
    { label: "Total lessons", value: profile.total_lessons || 0, icon: Users, color: "bg-violet-50 text-violet-600" },
    { label: "Total minutes", value: profile.total_minutes || 0, icon: Clock, color: "bg-blue-50 text-blue-600" },
    { label: "Rating", value: profile.average_rating?.toFixed(1) || "N/A", icon: Star, color: "bg-amber-50 text-amber-600" },
    { label: "Earnings", value: `$${(profile.total_earnings || 0).toFixed(2)}`, icon: DollarSign, color: "bg-emerald-50 text-emerald-600" },
  ];

  return (
    <div className="pb-20 lg:pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Welcome back, {profile.full_name?.split(" ")[0]}</h1>
          <p className="text-gray-500 text-sm mt-1">Here's your teaching overview</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-100">
          <Label className="text-sm font-medium">Available for instant lessons</Label>
          <Switch checked={profile.is_available_now} onCheckedChange={toggleAvailability} />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Upcoming lessons */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Upcoming lessons</h2>
        {lessons.length === 0 ? (
          <p className="text-sm text-gray-500 py-4 text-center">No upcoming lessons scheduled</p>
        ) : (
          <div className="space-y-3">
            {lessons.map(l => (
              <div key={l.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                <div>
                  <p className="font-medium text-gray-900">{l.student_name}</p>
                  <p className="text-sm text-gray-500">{l.language} · {new Date(l.scheduled_at).toLocaleString()}</p>
                </div>
                <Link to={`/classroom/${l.id}`}>
                  <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">Join</Button>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}