import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { User, Save } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pioneerEmail, setPioneerEmail] = useState("");
  const role = user?.role;

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      if (role === "tutor") {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          const p = profiles[0];
          setProfile(p);
          try {
            const bi = JSON.parse(p.bank_info || "{}");
            setPioneerEmail(bi.pioneer_email || "");
          } catch {}
        }
      } else {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setProfile(profiles[0]);
      }
    } catch {} finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      if (role === "tutor") {
        const updates = { full_name: profile.full_name, bio: profile.bio, price_per_minute: profile.price_per_minute };
        // Only direct contract tutors set Payoneer email
        if (profile.contract_type !== "upwork") {
          updates.bank_info = JSON.stringify({ pioneer_email: pioneerEmail });
        }
        await base44.entities.TutorProfile.update(profile.id, updates);
      } else {
        await base44.entities.StudentProfile.update(profile.id, { full_name: profile.full_name });
      }
      await base44.auth.updateMe({ full_name: profile.full_name });
      toast({ title: "Profile saved! ✅" });
    } catch { toast({ title: "Error saving", variant: "destructive" }); } finally { setSaving(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const isUpwork = profile?.contract_type === "upwork";

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">My Profile</h1>

      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <div className="flex items-center gap-4 mb-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <User className="w-8 h-8 text-white" />
          </div>
          <div>
            <p className="theme-heading font-display font-bold text-white">{profile?.full_name}</p>
            <div className="flex items-center gap-2">
              <p className="theme-subtext text-sm text-gray-500 capitalize">{role}</p>
              {role === "tutor" && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                  isUpwork
                    ? "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                }`}>
                  {isUpwork ? "Upwork" : "Direct"}
                </span>
              )}
            </div>
          </div>
        </div>

        <div>
          <Label className="theme-subtext text-gray-500 text-sm">Full name</Label>
          <Input
            value={profile?.full_name || ""}
            onChange={e => setProfile({ ...profile, full_name: e.target.value })}
            className="theme-input mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-violet-500/50"
          />
        </div>

        {role === "tutor" && (
          <>
            <div>
              <Label className="theme-subtext text-gray-500 text-sm">Bio</Label>
              <Textarea
                value={profile?.bio || ""}
                onChange={e => setProfile({ ...profile, bio: e.target.value.slice(0, 300) })}
                className="theme-input mt-1.5 h-24 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-violet-500/50"
              />
              <p className="theme-subtext text-xs text-gray-500 mt-1">{(profile?.bio || "").length}/300</p>
            </div>

            {/* Contact email — for both contract types */}
            <div>
              <Label className="theme-subtext text-gray-500 text-sm">Contact email (for reminders & admin messages)</Label>
              <Input
                type="email"
                value={pioneerEmail}
                onChange={e => setPioneerEmail(e.target.value)}
                placeholder="your@email.com"
                className="theme-input mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-400 focus:border-violet-500/50"
              />
              <p className="theme-subtext text-xs text-gray-500 mt-1">Used to receive lesson reminders and messages from the admin.</p>
            </div>

            {/* Payoneer — only for direct contract tutors */}
            {isUpwork ? (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <p className="text-xs text-blue-400 font-medium">💼 Upwork contract — payments are processed directly through Upwork. No Payoneer details needed.</p>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <p className="text-xs text-emerald-600 font-medium">💳 Direct contract — make sure your contact email above matches your Payoneer account for withdrawals on the 15th and 30th.</p>
              </div>
            )}

            <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/20">
              <p className="theme-subtext text-xs text-violet-600 font-medium">
                💡 Your lesson rate is set by the platform administrator: <strong>${(profile?.price_per_minute || 0.5).toFixed(2)}/min</strong> (${((profile?.price_per_minute || 0.5) * 30).toFixed(2)} per 30-min session).
              </p>
            </div>
          </>
        )}

        <Button
          onClick={handleSave} disabled={saving}
          className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all"
        >
          <Save className="w-4 h-4 mr-2" /> {saving ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </div>
  );
}