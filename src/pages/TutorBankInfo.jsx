import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { User, Mail, Globe, Phone, Save } from "lucide-react";

export default function TutorBankInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    nationality: "",
    phone: "",
    bank_info: "",
    pioneer_email: "",
  });

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
    if (profiles.length > 0) {
      const p = profiles[0];
      setProfile(p);
      // bank_info stores a JSON string with the extra fields
      let extra = {};
      try { extra = JSON.parse(p.bank_info || "{}"); } catch {}
      setForm({
        full_name: p.full_name || "",
        nationality: p.nationality || "",
        phone: extra.phone || "",
        bank_info: extra.bank_info || "",
        pioneer_email: extra.pioneer_email || "",
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const extra = JSON.stringify({
      phone: form.phone,
      bank_info: form.bank_info,
      pioneer_email: form.pioneer_email,
    });
    await base44.entities.TutorProfile.update(profile.id, {
      full_name: form.full_name,
      nationality: form.nationality,
      bank_info: extra,
    });
    setSaving(false);
    toast({ title: "Personal info saved!" });
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  if (!profile) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg">
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-2">Personal Info</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-8">Update your contact details and payment information.</p>

      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <div>
          <label className="theme-subtext text-xs text-gray-500 mb-1.5 block">Full legal name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <Input value={form.full_name} onChange={set("full_name")} placeholder="Your full name" className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>

        <div>
          <label className="theme-subtext text-xs text-gray-500 mb-1.5 block">Nationality</label>
          <div className="relative">
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <Input value={form.nationality} onChange={set("nationality")} placeholder="e.g. Brazilian" className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>

        <div>
          <label className="theme-subtext text-xs text-gray-500 mb-1.5 block">Phone number</label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
            <Input value={form.phone} onChange={set("phone")} placeholder="+1 555 000 0000" className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
          </div>
        </div>

        <div className="border-t border-white/10 pt-5">
          <div className="mb-4">
            <label className="theme-subtext text-xs text-gray-500 mb-1.5 block">Contact email (for reminders & admin messages)</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
              <Input value={form.pioneer_email} onChange={set("pioneer_email")} type="email" placeholder="your@email.com" className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
            </div>
            <p className="text-xs text-gray-600 mt-1">Used for lesson reminders and messages from the platform.</p>
          </div>

          {profile.contract_type !== "upwork" && (
            <div>
              <p className="theme-heading text-sm font-semibold text-white mb-3">Payoneer Payment Details</p>
              <label className="theme-subtext text-xs text-gray-500 mb-1.5 block">Additional bank info (optional)</label>
              <Input value={form.bank_info} onChange={set("bank_info")} placeholder="e.g. Payoneer ID, bank name..." className="bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
              <p className="text-xs text-gray-600 mt-1">Earnings will be sent to your contact email via Payoneer on withdrawal dates.</p>
            </div>
          )}
          {profile.contract_type === "upwork" && (
            <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <p className="text-xs text-blue-400 font-medium">💼 Upwork contract — payments processed via Upwork. No Payoneer details needed.</p>
            </div>
          )}
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all">
          <Save className="w-4 h-4 mr-2" />
          {saving ? "Saving..." : "Save information"}
        </Button>
      </div>
    </div>
  );
}