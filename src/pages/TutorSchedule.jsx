import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Clock, Circle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, "0")}:00`);

export default function TutorSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [availability, setAvailability] = useState({});

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        setAvailability(profiles[0].availability || {});
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const toggleSlot = (day, hour) => {
    setAvailability(prev => {
      const daySlots = prev[day] || [];
      const updated = daySlots.includes(hour)
        ? daySlots.filter(h => h !== hour)
        : [...daySlots, hour].sort();
      return { ...prev, [day]: updated };
    });
  };

  const saveSchedule = async () => {
    if (!profile) return;
    try {
      await base44.entities.TutorProfile.update(profile.id, { availability });
      toast({ title: "Schedule saved! ✅" });
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    }
  };

  const toggleAvailableNow = async () => {
    if (!profile) return;
    await base44.entities.TutorProfile.update(profile.id, { is_available_now: !profile.is_available_now });
    setProfile({ ...profile, is_available_now: !profile.is_available_now });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">My Schedule</h1>
          <p className="text-gray-500 text-sm mt-1">Set your weekly availability</p>
        </div>
        <div className="flex items-center gap-3 bg-white px-4 py-3 rounded-xl border border-gray-100">
          <Circle className={`w-3 h-3 ${profile?.is_available_now ? "fill-emerald-400 text-emerald-400" : "text-gray-300"}`} />
          <Label className="text-sm font-medium">Available now</Label>
          <Switch checked={profile?.is_available_now} onCheckedChange={toggleAvailableNow} />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="text-xs text-gray-400 font-medium p-2">Time</div>
            {DAYS.map(d => (
              <div key={d} className="text-xs text-gray-600 font-semibold p-2 text-center">{d.slice(0, 3)}</div>
            ))}
          </div>
          <div className="space-y-1 max-h-[500px] overflow-y-auto">
            {HOURS.filter((_, i) => i >= 6 && i <= 23).map(hour => (
              <div key={hour} className="grid grid-cols-8 gap-1">
                <div className="text-xs text-gray-400 p-2 flex items-center">{hour}</div>
                {DAYS.map(day => {
                  const active = (availability[day] || []).includes(hour);
                  return (
                    <button
                      key={day}
                      onClick={() => toggleSlot(day, hour)}
                      className={`h-8 rounded-lg text-xs font-medium transition-all ${
                        active
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-gray-50 text-gray-300 hover:bg-gray-100 border border-transparent"
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

      <div className="mt-4 flex justify-end">
        <Button onClick={saveSchedule} className="bg-violet-600 hover:bg-violet-700 text-white">
          Save schedule
        </Button>
      </div>
    </div>
  );
}