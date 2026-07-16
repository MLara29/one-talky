import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, OBJECTIVES, LEVELS, ACCENTS, COUNTRIES, UI_LANGUAGES } from "@/lib/constants";
import { MessageCircle, ChevronRight, ChevronLeft, Globe, Tag, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { t, detectLanguage } from "@/lib/i18n";

const LEVELS_LABELS = {
  en: { beginner: "Beginner", intermediate: "Intermediate", advanced: "Advanced" },
  pt_br: { beginner: "Iniciante", intermediate: "Intermediário", advanced: "Avançado" },
  pt_pt: { beginner: "Iniciante", intermediate: "Intermédio", advanced: "Avançado" },
  es: { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzado" },
  fr: { beginner: "Débutant", intermediate: "Intermédiaire", advanced: "Avancé" },
  de: { beginner: "Anfänger", intermediate: "Mittelstufe", advanced: "Fortgeschritten" },
  it: { beginner: "Principiante", intermediate: "Intermedio", advanced: "Avanzato" },
};

export default function OnboardingStudent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uiLang, setUiLang] = useState(() => detectLanguage());
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [form, setForm] = useState({
    full_name: "",
    nationality: "",
    native_language: "",
    target_language: "",
    level: "",
    objective: "",
    accent_preference: "",
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null); // null | "valid" | "invalid"
  const [couponData, setCouponData] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    base44.auth.me().then(me => setUserId(me.id)).catch(() => {});
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const checkCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    try {
      const results = await base44.entities.Coupon.filter({ code, is_active: true });
      const c = results[0];
      if (c && (c.used_count || 0) < c.max_uses) {
        setCouponStatus("valid");
        setCouponData(c);
      } else {
        setCouponStatus("invalid");
        setCouponData(null);
      }
    } catch {
      setCouponStatus("invalid");
    } finally { setCheckingCoupon(false); }
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast({ title: "Erro de autenticação", description: "Recarregue a página e tente novamente.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const freeCredits = couponStatus === "valid" && couponData ? couponData.credits_minutes : 0;
      await base44.entities.StudentProfile.create({
        full_name: form.full_name,
        nationality: form.nationality,
        native_language: form.native_language,
        target_language: form.target_language,
        level: form.level,
        objective: form.objective,
        accent_preference: form.accent_preference || "",
        user_id: userId,
        credits_minutes: freeCredits,
      });
      // Increment coupon used_count
      if (couponStatus === "valid" && couponData) {
        await base44.entities.Coupon.update(couponData.id, { used_count: (couponData.used_count || 0) + 1 }).catch(() => {});
      }
      await base44.auth.updateMe({ profile_completed: true });
      await base44.functions.invoke('setUserRole', { role: 'student' });
      toast({ title: t(uiLang, "welcomeTitle"), description: t(uiLang, "welcomeDesc") });
      window.location.href = "/";
    } catch (e) {
      console.error("StudentProfile create error:", e);
      toast({ title: "Erro", description: String(e?.message || t(uiLang, "errorMsg")), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const accents = ACCENTS[form.target_language] || [];
  const levelLabels = LEVELS_LABELS[uiLang] || LEVELS_LABELS.en;

  return (
    <div className="min-h-screen bg-[#0a0a1a] flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageCircle className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">One Talky</span>
          </div>

          {/* UI Language selector */}
          <div className="flex items-center justify-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-gray-500" />
            <select
              value={uiLang}
              onChange={e => setUiLang(e.target.value)}
              className="bg-white/5 border border-white/10 text-gray-300 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500/50"
            >
              {UI_LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>

          <h1 className="font-display text-2xl font-bold text-white">{t(uiLang, "setupProfile")}</h1>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 w-16 rounded-full transition-colors ${s <= step ? "bg-violet-500" : "bg-white/10"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 shadow-xl backdrop-blur">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className="text-gray-300">{t(uiLang, "fullName")}</Label>
                <Input
                  value={form.full_name}
                  onChange={e => set("full_name", e.target.value)}
                  placeholder={t(uiLang, "fullNamePlaceholder")}
                  className="mt-1.5 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50"
                />
              </div>
              <div>
                <Label className="text-gray-300">{t(uiLang, "nationality")}</Label>
                <Select value={form.nationality} onValueChange={v => set("nationality", v)}>
                    <SelectTrigger className="mt-1.5 bg-[#1e1e35] border-white/10 text-white">
                      <SelectValue placeholder={t(uiLang, "selectCountry")} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e35] border-[#333355] text-white max-h-60 z-50">
                      {COUNTRIES.map(c => <SelectItem key={c} value={c} className="text-white focus:bg-violet-600/30 focus:text-white">{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
              </div>
              <div>
                <Label className="text-gray-300">{t(uiLang, "nativeLanguage")}</Label>
                <Select value={form.native_language} onValueChange={v => set("native_language", v)}>
                  <SelectTrigger className="mt-1.5 bg-[#1e1e35] border-white/10 text-white">
                    <SelectValue placeholder={t(uiLang, "selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e35] border-[#333355] text-white z-50">
                    {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value} className="text-white focus:bg-violet-600/30 focus:text-white">{l.flag} {l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">{t(uiLang, "targetLanguage")}</Label>
                <Select value={form.target_language} onValueChange={v => set("target_language", v)}>
                  <SelectTrigger className="mt-1.5 bg-[#1e1e35] border-white/10 text-white">
                    <SelectValue placeholder={t(uiLang, "selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e35] border-[#333355] text-white z-50">
                    {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value} className="text-white focus:bg-violet-600/30 focus:text-white">{l.flag} {l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.full_name || !form.nationality || !form.native_language || !form.target_language}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all mt-2"
              >
                {t(uiLang, "continue")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className="text-gray-300">{t(uiLang, "level")}</Label>
                <Select value={form.level} onValueChange={v => set("level", v)}>
                  <SelectTrigger className="mt-1.5 bg-[#1e1e35] border-white/10 text-white">
                    <SelectValue placeholder={t(uiLang, "selectLevel")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e35] border-[#333355] text-white z-50">
                    {LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value} className="text-white focus:bg-violet-600/30 focus:text-white">{levelLabels[l.value] || l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-gray-300">{t(uiLang, "goal")}</Label>
                <Select value={form.objective} onValueChange={v => set("objective", v)}>
                  <SelectTrigger className="mt-1.5 bg-[#1e1e35] border-white/10 text-white">
                    <SelectValue placeholder={t(uiLang, "selectGoal")} />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1e1e35] border-[#333355] text-white z-50">
                    {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value} className="text-white focus:bg-violet-600/30 focus:text-white">{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {accents.length > 0 && (
                <div>
                  <Label className="text-gray-300">{t(uiLang, "accentPref")}</Label>
                  <Select value={form.accent_preference} onValueChange={v => set("accent_preference", v)}>
                    <SelectTrigger className="mt-1.5 bg-[#1e1e35] border-white/10 text-white">
                      <SelectValue placeholder={t(uiLang, "accentPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1e1e35] border-[#333355] text-white z-50">
                      {accents.map(a => <SelectItem key={a} value={a} className="text-white focus:bg-violet-600/30 focus:text-white">{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {/* Coupon field */}
              <div>
                <Label className="text-gray-300 flex items-center gap-1.5 mb-1.5">
                  <Tag className="w-3.5 h-3.5" /> Cupom promocional <span className="text-gray-600 font-normal">(opcional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); setCouponData(null); }}
                    placeholder="Ex: BEMVINDO10"
                    className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50 font-mono uppercase"
                  />
                  <Button type="button" onClick={checkCoupon} disabled={!couponCode.trim() || checkingCoupon}
                    variant="outline" className="shrink-0 border-white/10 text-gray-300 hover:bg-white/10 bg-transparent px-4">
                    {checkingCoupon ? "..." : "Aplicar"}
                  </Button>
                </div>
                {couponStatus === "valid" && couponData && (
                  <p className="flex items-center gap-1.5 text-emerald-400 text-xs mt-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Cupom válido! Você ganha {couponData.credits_minutes} minutos grátis 🎉
                  </p>
                )}
                {couponStatus === "invalid" && (
                  <p className="flex items-center gap-1.5 text-red-400 text-xs mt-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Cupom inválido ou expirado.
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-white/10 text-gray-300 hover:bg-white/10 bg-transparent"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t(uiLang, "back")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={!form.level || !form.objective || saving}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all"
                >
                  {saving ? t(uiLang, "saving") : t(uiLang, "startSpeaking")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}