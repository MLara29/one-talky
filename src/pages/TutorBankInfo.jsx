import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { COUNTRIES } from "@/lib/constants";
import { User, Mail, Globe, Save, Bell, BellOff, FileText } from "lucide-react";

const PAYOUT_FREQUENCY_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "biweekly", label: "Quinzenal" },
  { value: "monthly", label: "Mensal" },
];

export default function TutorBankInfo() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [savingFrequency, setSavingFrequency] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    nationality: "",
    bank_info: "",
    pioneer_email: "",
    reminder_enabled: true,
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
        bank_info: extra.bank_info || "",
        pioneer_email: extra.pioneer_email || "",
        reminder_enabled: extra.reminder_enabled !== false, // default true
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    const extra = JSON.stringify({
      bank_info: form.bank_info,
      pioneer_email: form.pioneer_email,
      reminder_enabled: form.reminder_enabled,
    });
    await base44.functions.invoke('updateMyProfile', {
      updates: {
        full_name: form.full_name,
        nationality: form.nationality,
        bank_info: extra,
      },
    });
    setSaving(false);
    toast({ title: "Personal info saved!" });
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const changePayoutFrequency = async (value) => {
    if (!profile) return;
    setSavingFrequency(true);
    try {
      await base44.functions.invoke('updateMyProfile', { updates: { payout_frequency: value } });
      setProfile(p => ({ ...p, payout_frequency: value }));
      toast({ title: "Payout frequency updated! ✅" });
    } catch (err) {
      toast({ title: "Error saving", description: err?.message || "Please try again.", variant: "destructive" });
    } finally { setSavingFrequency(false); }
  };

  if (!profile) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="max-w-lg">
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-2">Personal Info</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-4">Update your contact details and payment information.</p>

      <Link
        to="/tutor-agreement"
        target="_blank"
        className="flex items-center gap-2 text-sm font-medium text-orange-500 hover:underline mb-6 w-fit"
      >
        <FileText className="w-4 h-4" />
        View Tutor Service Agreement
      </Link>

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
            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600 z-10" />
            <Select value={form.nationality} onValueChange={v => setForm(f => ({ ...f, nationality: v }))}>
              <SelectTrigger className="pl-9 bg-white/5 border-white/10 text-white">
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent className="bg-white border-gray-200 text-gray-900 max-h-64 overflow-y-auto">
                {COUNTRIES.map(c => (
                  <SelectItem key={c} value={c} className="text-gray-900 focus:bg-orange-50 focus:text-orange-700">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5">
          {/* Reminder toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/10">
            <div className="flex items-center gap-2.5">
              {form.reminder_enabled
                ? <Bell className="w-4 h-4 text-violet-400" />
                : <BellOff className="w-4 h-4 text-gray-500" />}
              <div>
                <p className="text-sm font-medium text-white theme-heading">Lembretes por e-mail</p>
                <p className="text-xs text-gray-500">
                  {form.reminder_enabled ? "Você receberá lembretes antes das aulas" : "Lembretes desativados"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, reminder_enabled: !f.reminder_enabled }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                form.reminder_enabled ? "bg-violet-600" : "bg-white/20"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.reminder_enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        

          <div className="mb-5">
            <p className="theme-heading text-sm font-semibold text-white mb-1">Payout frequency</p>
            <p className="text-xs text-gray-600 mb-3">Less frequent payouts group more balance into each transfer.</p>
            <div className="flex flex-wrap gap-2">
              {PAYOUT_FREQUENCY_OPTIONS.map(opt => {
                const active = (profile.payout_frequency || "weekly") === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => changePayoutFrequency(opt.value)}
                    disabled={savingFrequency}
                    className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 ${
                      active
                        ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                        : "bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {profile.contract_type !== "upwork" && (
            <div>
              <p className="theme-heading text-sm font-semibold text-white mb-3">Payoneer Payment Details</p>
              <div className="mb-4">
                <label className="theme-subtext text-xs text-gray-500 mb-1.5 block">Contact email (for reminders & admin messages)</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
                  <Input value={form.pioneer_email} onChange={set("pioneer_email")} type="email" placeholder="your@email.com" className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-gray-600" />
                </div>
                <p className="text-xs text-gray-600 mt-1">Used for lesson reminders and messages from the platform.</p>
              </div>
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