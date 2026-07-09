import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, COUNTRIES, INTERESTS } from "@/lib/constants";
import { MessageCircle, ChevronRight, ChevronLeft, Upload, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function OnboardingTutor() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    country: "",
    nationality: "",
    native_languages: [],
    bio: "",
    intro_video_url: "",
    interests: [],
    price_per_minute: 0.5,
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

  const handleVideoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      set("intro_video_url", file_url);
    } catch {
      toast({ title: "Upload failed", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const me = await base44.auth.me();
      await base44.auth.updateMe({ role: "tutor", profile_completed: true });
      await base44.entities.TutorProfile.create({
        ...form,
        user_id: me.id,
        status: "pending",
      });
      toast({ title: "Application submitted! 🎉", description: "We'll review your profile and get back to you soon." });
      window.location.href = "/";
    } catch (e) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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
          <h1 className="font-display text-2xl font-bold text-gray-900">Become a tutor</h1>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-colors ${s <= step ? "bg-emerald-500" : "bg-gray-200"}`} />
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
                <Label>Country</Label>
                <Select value={form.country} onValueChange={v => { set("country", v); set("nationality", v); }}>
                  <SelectTrigger className="mt-1.5"><SelectValue placeholder="Select country" /></SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Native language(s)</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.value}
                      onClick={() => toggleLang(l.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.native_languages.includes(l.value)
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.full_name || !form.country || form.native_languages.length === 0}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white mt-2"
              >
                Continue <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label>Bio (up to 300 characters)</Label>
                <Textarea
                  value={form.bio}
                  onChange={e => set("bio", e.target.value.slice(0, 300))}
                  placeholder="Tell students about yourself..."
                  className="mt-1.5 h-24"
                />
                <p className="text-xs text-gray-400 mt-1">{form.bio.length}/300</p>
              </div>
              <div>
                <Label>Intro video (30-60 seconds)</Label>
                <div className="mt-1.5">
                  {form.intro_video_url ? (
                    <div className="flex items-center gap-2 p-3 bg-emerald-50 rounded-xl text-emerald-700 text-sm">
                      <Check className="w-4 h-4" /> Video uploaded successfully
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-emerald-300 transition-colors">
                      <Upload className="w-6 h-6 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">{uploading ? "Uploading..." : "Click to upload video"}</span>
                      <input type="file" accept="video/*" onChange={handleVideoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>
              <div>
                <Label>Price per minute (USD)</Label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={form.price_per_minute}
                  onChange={e => set("price_per_minute", parseFloat(e.target.value) || 0)}
                  className="mt-1.5"
                />
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!form.bio}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Continue <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label>Conversation topics you enjoy</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {INTERESTS.map(i => (
                    <button
                      key={i}
                      onClick={() => toggleInterest(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.interests.includes(i)
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white text-gray-600 border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Back
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={form.interests.length === 0 || saving}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
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