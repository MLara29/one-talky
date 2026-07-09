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
  const [userId, setUserId] = useState(null);
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

  // Fetch user id once on mount — before submit to avoid race condition
  useEffect(() => {
    base44.auth.me().then(me => setUserId(me.id)).catch(() => {});
  }, []);

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
    if (!userId) {
      toast({ title: "Erro de autenticação", description: "Recarregue a página e tente novamente.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const profileData = {
        full_name: form.full_name,
        country: form.country,
        nationality: form.nationality,
        native_languages: form.native_languages,
        bio: form.bio,
        interests: form.interests,
        price_per_minute: Number(form.price_per_minute) || 0.5,
        status: "pending",
        user_id: userId,
      };
      if (form.intro_video_url) profileData.intro_video_url = form.intro_video_url;

      await base44.entities.TutorProfile.create(profileData);
      await base44.auth.updateMe({ profile_completed: true });
      toast({ title: "Candidatura enviada! 🎉", description: "Vamos revisar o seu perfil e entraremos em contato em breve." });
      window.location.href = "/";
    } catch (e) {
      console.error("TutorProfile create error:", e);
      toast({ title: "Erro ao finalizar cadastro", description: String(e?.message || "Tente novamente."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">Just Speak</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-white">Torne-se um tutor</h1>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-colors ${s <= step ? "bg-emerald-500" : "bg-white/10"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl backdrop-blur">

          {/* Step 1 — Basic info */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-gray-300">Nome completo</Label>
                <Input
                  value={form.full_name}
                  onChange={e => set("full_name", e.target.value)}
                  placeholder="Seu nome completo"
                  className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
                />
              </div>
              <div>
                <Label className="text-gray-300">País de residência</Label>
                <Select value={form.country} onValueChange={v => { set("country", v); set("nationality", v); }}>
                  <SelectTrigger className="mt-1.5 bg-white/5 border-white/10 text-white">
                    <SelectValue placeholder="Selecione o país" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-900 border-white/10 text-white max-h-60">
                    {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300 mb-2 block">Idioma(s) nativo(s)</Label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.value}
                      type="button"
                      onClick={() => toggleLang(l.value)}
                      className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                        form.native_languages.includes(l.value)
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white/5 text-gray-400 border-white/10 hover:border-emerald-500/50"
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
                disabled={!form.full_name || !form.country || form.native_languages.length === 0}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all mt-2"
              >
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2 — Bio + video + price */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-gray-300">Bio (até 300 caracteres)</Label>
                <Textarea
                  value={form.bio}
                  onChange={e => set("bio", e.target.value.slice(0, 300))}
                  placeholder="Fale sobre você para os alunos..."
                  className="mt-1.5 h-24 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-emerald-500/50"
                />
                <p className="text-xs text-gray-500 mt-1">{form.bio.length}/300</p>
              </div>

              <VideoRecorder
                onVideoReady={url => set("intro_video_url", url)}
                onVideoRemoved={() => set("intro_video_url", "")}
              />

              <div>
                <Label className="text-gray-300">Preço por minuto (USD)</Label>
                <Input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={form.price_per_minute}
                  onChange={e => set("price_per_minute", parseFloat(e.target.value) || 0)}
                  className="mt-1.5 bg-white/5 border-white/10 text-white focus:border-emerald-500/50"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-white/10 text-gray-300 hover:bg-white/10 bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!form.bio}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0"
                >
                  Continuar <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3 — Interests + submit */}
          {step === 3 && (
            <div className="space-y-5">
              <div>
                <Label className="text-gray-300 mb-2 block">Tópicos de conversa que você gosta</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {INTERESTS.map(i => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleInterest(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.interests.includes(i)
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-white/5 text-gray-400 border-white/10 hover:border-emerald-500/50"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 mt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(2)}
                  className="flex-1 border-white/10 text-gray-300 hover:bg-white/10 bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={form.interests.length === 0 || saving || !userId}
                  className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-0 shadow-lg shadow-emerald-500/20 hover:scale-105 transition-all"
                >
                  {saving ? "Enviando..." : "Enviar candidatura"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}