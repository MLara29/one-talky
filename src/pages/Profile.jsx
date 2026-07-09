import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { LANGUAGES, INTERESTS } from "@/lib/constants";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const role = user?.role;

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      if (role === "tutor") {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setProfile(profiles[0]);
      } else if (role === "student") {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setProfile(profiles[0]);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      if (role === "tutor") {
        await base44.entities.TutorProfile.update(profile.id, {
          full_name: profile.full_name,
          bio: profile.bio,
          price_per_minute: profile.price_per_minute,
        });
      } else {
        await base44.entities.StudentProfile.update(profile.id, {
          full_name: profile.full_name,
        });
      }
      toast({ title: "Profile saved! ✅" });
    } catch {
      toast({ title: "Error saving", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-4 max-w-lg mx-auto">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-violet-100 flex items-center justify-center">
            <User className="w-8 h-8 text-violet-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{profile?.full_name}</p>
            <p className="text-sm text-gray-500 capitalize">{role}</p>
          </div>
        </div>

        <div>
          <Label>Full name</Label>
          <Input
            value={profile?.full_name || ""}
            onChange={e => setProfile({ ...profile, full_name: e.target.value })}
            className="mt-1.5"
          />
        </div>

        {role === "tutor" && (
          <>
            <div>
              <Label>Bio</Label>
              <Textarea
                value={profile?.bio || ""}
                onChange={e => setProfile({ ...profile, bio: e.target.value.slice(0, 300) })}
                className="mt-1.5 h-24"
              />
              <p className="text-xs text-gray-400 mt-1">{(profile?.bio || "").length}/300</p>
            </div>
            <div>
              <Label>Price per minute (USD)</Label>
              <Input
                type="number"
                min={0.1}
                step={0.1}
                value={profile?.price_per_minute || 0.5}
                onChange={e => setProfile({ ...profile, price_per_minute: parseFloat(e.target.value) || 0 })}
                className="mt-1.5"
              />
            </div>
          </>
        )}

        <Button onClick={handleSave} disabled={saving} className="w-full bg-violet-600 hover:bg-violet-700 text-white">
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}