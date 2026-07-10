import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, "0")}:00`);

export default function TutorSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState({});

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) { setProfile(profiles[0]); setAvailability(profiles[0].availability || {}); }
    } catch {} finally { setLoading(false); }
  };

  const toggleSlot = (day, hour) => {
    setAvailability(prev => {
      const daySlots = prev[day] || [];
      const updated = daySlots.includes(hour) ? daySlots.filter(h => h !== hour) : [...daySlots, hour].sort();
      return { ...prev, [day]: updated };
    });
  };

  const saveSchedule = async () => {
    if (!profile) return;
    try {
      await base44.entities.TutorProfile.update(profile.id, { availability });
      toast({ title: "Schedule saved! ✅" });
    } catch { toast({ title: "Error saving", variant: "destructive" }); }
  };

  const toggleAvailableNow = async () => {
    if (!profile) return;
    await base44.entities.TutorProfile.update(profile.id, { is_available_now: !profile.is_available_now });
    setProfile({ ...profile, is_available_now: !profile.is_available_now });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">My Schedule</h1>
          <p className="theme-subtext text-gray-500 text-sm mt-1">Set your weekly availability</p>
        </div>
        <div className="theme-card flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
          <div className={`w-2.5 h-2.5 rounded-full ${profile?.is_available_now ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
          <Label className="theme-subtext text-sm font-medium text-gray-500">Available now</Label>
          <Switch checked={profile?.is_available_now} onCheckedChange={toggleAvailableNow} />
        </div>
      </div>

      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="theme-subtext text-xs text-gray-500 font-medium p-2">Time</div>
            {DAYS.map(d => <div key={d} className="theme-subtext text-xs text-gray-500 font-semibold p-2 text-center">{d.slice(0, 3)}</div>)}
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {HOURS.map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-1">
                <div className="theme-subtext text-xs text-gray-500 p-2 flex items-center">{hour}</div>
                {DAYS.map(day => {
                  const active = (availability[day] || []).includes(hour);
                  return (
                    <button key={day} onClick={() => toggleSlot(day, hour)}
                      className={`h-8 rounded-xl text-xs font-semibold transition-all ${
                        active ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-600" : "bg-white/3 border border-white/5 hover:bg-violet-500/10 hover:border-violet-500/20"
                      }`}
                    >
                      {active ? "✓" : ""}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button onClick={saveSchedule} className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all">
          Save schedule
        </Button>
      </div>
    </div>
  );
}