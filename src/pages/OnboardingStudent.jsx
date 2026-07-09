import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, OBJECTIVES, LEVELS, ACCENTS } from "@/lib/constants";
import { MessageCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function OnboardingStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    native_language: "",
    target_language: "",
    level: "",
    objective: "",
    accent_preference: "",
  });

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ role: "student", profile_completed: true });
      await base44.entities.StudentProfile.create({
        ...form,
        user_id: (await base44.auth.me()).id,
      });
      toast({ title: "Welcome to Just Speak! 🎉", description: "Your profile has been created." });
      window.location.href = "/";
    } catch (e) {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const accents = ACCENTS[form.target_language] || [];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold">Just Speak</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Set up your learner profile</h1>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 w-16 rounded-full transition-colors ${s <= step ? "bg-violet-500" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-8 shadow-sm">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label>Full name</Label>
                <Input value={form.full_name} onChange={e => set("full_name", e.target.value)} placeholder="Your full name" className="mt-1.5" />
              </div>
              <div>
                <Label>Your native language</Label>
                <Select value={form.native_language} onValueChange={v => set("native_language", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.flag} {l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language you want to practice</Label>
                <Select value={form.target_language} onValueChange={v => set("target_language", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select language" /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.flag} {l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.full_name || !form.native_language || !form.target_language}
                className="w-full bg-violet-600 hover:bg-violet-700 text-white mt-2"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label>Your current level</Label>
                <Select value={form.level} onValueChange={v => set("level", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Your goal</Label>
                <Select value={form.objective} onValueChange={v => set("objective", v)}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="What's your objective?" /></SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {accents.length > 0 && (
                <div>
                  <Label>Accent preference (optional)</Label>
                  <Select value={form.accent_preference} onValueChange={v => set("accent_preference", v)}>
                    <SelectTrigger className="mt-1.5"><SelectValue placeholder="Any preference?" /></SelectTrigger>
                    <SelectContent>
                      {accents.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!form.level || !form.objective || saving}
                  className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
                >
                  {saving ? "Saving..." : "Start speaking!"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}