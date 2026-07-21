import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LANGUAGES, OBJECTIVES, LEVELS, ACCENTS, COUNTRIES, UI_LANGUAGES, INTERESTS } from "@/lib/constants";
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
    conversation_topics: [],
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponData, setCouponData] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    base44.auth.me().then(me => setUserId(me.id)).catch(() => {});
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const toggleTopic = (topic) => {
    set("conversation_topics", form.conversation_topics.includes(topic)
      ? form.conversation_topics.filter(t => t !== topic)
      : [...form.conversation_topics, topic]
    );
  };

  const checkCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCheckingCoupon(true);
    setCouponStatus(null);
    try {
      const results = await base44.entities.Coupon.filter({ code, is_active: true });
      const c = results[0];
      if (!c || (c.used_count || 0) >= c.max_uses) {
        setCouponStatus("invalid");
        setCouponData(null);
        return;
      }
      // Verificar se este usuário já usou este cupom (amarrado ao user_id/email)
      if (userId && c.affiliate_id) {
        const alreadyUsed = await base44.entities.AffiliateEarning.filter({
          student_id: userId,
          coupon_code: c.code,
        });
        if (alreadyUsed.length > 0) {
          setCouponStatus("already_used");
          setCouponData(null);
          return;
        }
      }
      setCouponStatus("valid");
      setCouponData(c);
    } catch {
      setCouponStatus("invalid");
    } finally { setCheckingCoupon(false); }
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast({ title: "Authentication error", description: "Please reload the page and try again.", variant: "destructive" });
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
        conversation_topics: form.conversation_topics,
        user_id: userId,
        credits_minutes: freeCredits,
      });
      if (couponStatus === "valid" && couponData) {
        await base44.entities.Coupon.update(couponData.id, { used_count: (couponData.used_count || 0) + 1 }).catch(() => {});
      }
      await base44.auth.updateMe({ profile_completed: true });
      await base44.functions.invoke('setUserRole', { role: 'student' });
      base44.functions.invoke('notifyAdminNewUser', {
        full_name: form.full_name,
        role: 'student',
        plan: 'free',
        coupon_code: couponStatus === "valid" ? couponCode : null,
      }).catch(() => {});
      toast({ title: t(uiLang, "welcomeTitle"), description: t(uiLang, "welcomeDesc") });
      window.location.href = "/";
    } catch (e) {
      toast({ title: "Error", description: String(e?.message || t(uiLang, "errorMsg")), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const accents = ACCENTS[form.target_language] || [];
  const levelLabels = LEVELS_LABELS[uiLang] || LEVELS_LABELS.en;

  const inputCls = "mt-1.5 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-violet-500 focus:ring-violet-500/20 shadow-sm";
  const selectTriggerCls = "mt-1.5 bg-white border-gray-300 text-gray-900 shadow-sm";
  const selectContentCls = "bg-white border-gray-200 text-gray-900 shadow-xl z-50";
  const selectItemCls = "text-gray-900 focus:bg-violet-50 focus:text-violet-700";
  const labelCls = "text-gray-700 font-medium";

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">One Talky</span>
          </div>

          <div className="flex items-center justify-center gap-2 mb-5">
            <Globe className="w-4 h-4 text-gray-400" />
            <select
              value={uiLang}
              onChange={e => setUiLang(e.target.value)}
              className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-violet-500 shadow-sm"
            >
              {UI_LANGUAGES.map(l => (
                <option key={l.value} value={l.value}>{l.flag} {l.label}</option>
              ))}
            </select>
          </div>

          <h1 className="font-display text-2xl font-bold text-gray-900">{t(uiLang, "setupProfile")}</h1>
          <p className="text-gray-500 text-sm mt-1">Step {step} of 3</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-14 rounded-full transition-colors ${s <= step ? "bg-violet-600" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className={labelCls}>{t(uiLang, "fullName")}</Label>
                <Input
                  value={form.full_name}
                  onChange={e => set("full_name", e.target.value)}
                  placeholder={t(uiLang, "fullNamePlaceholder")}
                  className={inputCls}
                />
              </div>
              <div>
                <Label className={labelCls}>{t(uiLang, "nationality")}</Label>
                <Select value={form.nationality} onValueChange={v => set("nationality", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={t(uiLang, "selectCountry")} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {COUNTRIES.map(c => <SelectItem key={c} value={c} className={selectItemCls}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>{t(uiLang, "nativeLanguage")}</Label>
                <Select value={form.native_language} onValueChange={v => set("native_language", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={t(uiLang, "selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value} className={selectItemCls}>{l.flag} {l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>{t(uiLang, "targetLanguage")}</Label>
                <Select value={form.target_language} onValueChange={v => set("target_language", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={t(uiLang, "selectLanguage")} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value} className={selectItemCls}>{l.flag} {l.label}</SelectItem>)}
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
                <Label className={labelCls}>{t(uiLang, "level")}</Label>
                <Select value={form.level} onValueChange={v => set("level", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={t(uiLang, "selectLevel")} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value} className={selectItemCls}>{levelLabels[l.value] || l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>{t(uiLang, "goal")}</Label>
                <Select value={form.objective} onValueChange={v => set("objective", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={t(uiLang, "selectGoal")} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value} className={selectItemCls}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {accents.length > 0 && (
                <div>
                  <Label className={labelCls}>{t(uiLang, "accentPref")}</Label>
                  <Select value={form.accent_preference} onValueChange={v => set("accent_preference", v)}>
                    <SelectTrigger className={selectTriggerCls}>
                      <SelectValue placeholder={t(uiLang, "accentPlaceholder")} />
                    </SelectTrigger>
                    <SelectContent className={selectContentCls}>
                      {accents.map(a => <SelectItem key={a} value={a} className={selectItemCls}>{a}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t(uiLang, "back")}
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!form.level || !form.objective}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all"
                >
                  {t(uiLang, "continue")} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              {/* Conversation Topics */}
              <div>
                <Label className={`${labelCls} block mb-1`}>{t(uiLang, "favoriteTopics") || "Favorite conversation topics"}</Label>
                <p className="text-xs text-gray-500 mb-3">Choose the topics you enjoy discussing most (select as many as you like)</p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.conversation_topics.includes(topic)
                          ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                          : "bg-white text-gray-600 border-gray-300 hover:border-violet-400 hover:text-violet-600"
                      }`}
                    >
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Coupon field */}
              <div>
                <Label className={`${labelCls} flex items-center gap-1.5 mb-1.5`}>
                  <Tag className="w-3.5 h-3.5" /> Promo coupon <span className="text-gray-400 font-normal">(optional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); setCouponData(null); }}
                    placeholder="Ex: WELCOME10"
                    className={`${inputCls} font-mono uppercase`}
                  />
                  <Button type="button" onClick={checkCoupon} disabled={!couponCode.trim() || checkingCoupon}
                    variant="outline" className="shrink-0 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white px-4">
                    {checkingCoupon ? "..." : "Apply"}
                  </Button>
                </div>
                {couponStatus === "valid" && couponData && (
                  <p className="flex items-center gap-1.5 text-emerald-600 text-xs mt-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Valid coupon! You get {couponData.credits_minutes} free minutes 🎉
                  </p>
                )}
                {couponStatus === "invalid" && (
                  <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Invalid or expired coupon.
                  </p>
                )}
                {couponStatus === "already_used" && (
                  <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Este cupom já foi utilizado pela sua conta.
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t(uiLang, "back")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
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