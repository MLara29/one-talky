import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, COUNTRIES, INTERESTS } from "@/lib/constants";
import { MessageCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import VideoRecorder from "@/components/VideoRecorder";

export default function OnboardingTutor() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    country: "",
    nationality: "",
    native_languages: [],
    bio: "",
    intro_video_url: "",
    interests: [],
    price_per_minute: 0.0833,
  });



  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleLang = (lang) => {
    set("native_languages", form.native_languages.includes(lang)
      ? form.native_languages.filter(l => l !== lang)
      : [...form.native_languages, lang]
    );
  };

  const toggleInterest = (interest) => {
    set("interests", form.interests.includes(interest)
      ? form.interests.filter(i => i !== interest)
      : [...form.interests, interest]
    );
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      // Profile creation handled server-side — financial fields always set to defaults
      await base44.functions.invoke('createTutorProfile', {
        profile: {
          full_name: form.full_name,
          country: form.country,
          nationality: form.nationality,
          native_languages: form.native_languages,
          bio: form.bio,
          interests: form.interests,
          intro_video_url: form.intro_video_url || undefined,
        },
      });
      await base44.functions.invoke('setUserRole', { role: 'tutor' });
      await base44.auth.updateMe({ profile_completed: true });
      base44.functions.invoke('notifyAdminNewUser', {
        full_name: form.full_name,
        role: 'tutor',
        plan: null,
        coupon_code: null,
      }).catch(() => {});
      toast({ title: "Application submitted! 🎉", description: "We'll review your profile and get back to you soon." });
      window.location.href = "/";
    } catch (e) {
      console.error("[OnboardingTutor] submit error:", e);
      toast({ title: "Erro ao enviar inscrição", description: "Não foi possível enviar sua inscrição. Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1.5 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 shadow-sm";
  const selectTriggerCls = "mt-1.5 bg-white border-gray-300 text-gray-900 shadow-sm";
  const selectContentCls = "bg-white border-gray-200 text-gray-900 shadow-xl z-50";
  const selectItemCls = "text-gray-900 focus:bg-orange-50 focus:text-orange-700";
  const labelCls = "text-gray-700 font-medium";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">One Talky</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Become a tutor</h1>
          <p className="text-gray-500 text-sm mt-1">Step {step} of 3</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-colors ${s <= step ? "bg-orange-500" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">

          {/* Step 1 — Basic info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className={labelCls}>Full name</Label>
                <Input
                  value={form.full_name}
                  onChange={e => set("full_name", e.target.value)}
                  placeholder="Your full name"
                  className={inputCls}
                />
              </div>
              <div>
                <Label className={labelCls}>Country of residence</Label>
                <Select value={form.country} onValueChange={v => set("country", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c} className={selectItemCls}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>Nationality</Label>
                <Select value={form.nationality} onValueChange={v => set("nationality", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Select your nationality" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c} className={selectItemCls}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={`${labelCls} mb-2 block`}>Native language(s)</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => toggleLang(l.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.native_languages.includes(l.value)
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-white text-gray-600 border-gray-300 hover:border-orange-400 hover:text-orange-600"
                      }`}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.full_name || !form.country || !form.nationality || form.native_languages.length === 0}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all mt-2"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2 — Bio + video */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className={labelCls}>Bio (up to 300 characters)</Label>
                <Textarea
                  value={form.bio}
                  onChange={e => set("bio", e.target.value.slice(0, 300))}
                  placeholder="Tell students about yourself..."
                  className={`mt-1.5 h-24 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 shadow-sm`}
                />
                <p className="text-xs text-gray-400 mt-1">{form.bio.length}/300</p>
              </div>

              <VideoRecorder
                onVideoReady={url => set("intro_video_url", url)}
                onVideoRemoved={() => set("intro_video_url", "")}
              />

              <div className="flex gap-3 mt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button type="button" onClick={() => setStep(3)} disabled={!form.bio} className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20">
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Interests + submit */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label className={`${labelCls} mb-1 block`}>Conversation topics you enjoy</Label>
                <p className="text-xs text-gray-500 mb-3">Select the subjects you feel most comfortable discussing</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {INTERESTS.map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInterest(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.interests.includes(i)
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-white text-gray-600 border-gray-300 hover:border-orange-400 hover:text-orange-600"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <Button type="button" variant="outline" onClick={() => setStep(2)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={form.interests.length === 0 || saving}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20 hover:scale-105 transition-all"
                >
                  {saving ? "Submitting..." : "Submit application"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}