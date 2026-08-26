import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OBJECTIVES, LEVELS, INTERESTS } from "@/lib/constants";
import { ChevronRight, ChevronLeft, Tag, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

// Chaves de tradução dos objetivos/níveis/interesses, indexadas pelo mesmo
// "value" já usado nos dados (OBJECTIVES/LEVELS de constants.js, ou o próprio
// texto do INTERESTS). Não mexe nos dados em si, só no texto exibido.
const OBJ_KEY = { travel: "objTravel", work: "objWork", interview: "objInterview", relocation: "objRelocation", conversation: "objConversation", exams: "objExams" };
const LEVEL_KEY = { beginner: "levelBeginner", intermediate: "levelIntermediate", advanced: "levelAdvanced" };
const INTEREST_KEY = {
  "Travel": "interestTravel", "Business": "interestBusiness", "Pop Culture": "interestPopCulture",
  "Job Interviews": "interestJobInterviews", "Daily Life": "interestDailyLife", "Sports": "interestSports",
  "Technology": "interestTechnology", "Food & Cuisine": "interestFoodCuisine", "Movies & TV Shows": "interestMoviesTvShows",
  "Music": "interestMusic", "Politics": "interestPolitics", "Science": "interestScience",
  "Art & Design": "interestArtDesign", "Health & Fitness": "interestHealthFitness", "Education": "interestEducation",
};
const LANG_OPTIONS = ["en", "pt_br", "es", "fr", "de", "it", "ja", "ko"];
const LANG_LABELS = { en: "EN", pt_br: "PT", es: "ES", fr: "FR", de: "DE", it: "IT", ja: "JA", ko: "KO" };

export default function OnboardingStudent() {
  const { toast } = useToast();
  const { lang, changeLang } = useLang();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [form, setForm] = useState({
    full_name: "",
    nationality: "",
    native_language: "portuguese_br",
    target_language: "english",
    level: "",
    objective: "",
    conversation_topics: [],
  });
  const [couponCode, setCouponCode] = useState("");
  const [couponStatus, setCouponStatus] = useState(null);
  const [couponData, setCouponData] = useState(null);
  const [checkingCoupon, setCheckingCoupon] = useState(false);

  useEffect(() => {
    base44.auth.me().then(me => {
      setUserId(me.id);
      setUserEmail(me.email || "");
    }).catch(() => {});
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

      setCouponStatus("valid");
      setCouponData(c);
    } catch {
      setCouponStatus("invalid");
    } finally { setCheckingCoupon(false); }
  };

  const handleSubmit = async () => {
    if (!userId) {
      toast({ title: t(lang, "authErrorTitle"), description: t(lang, "authErrorDesc"), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await base44.functions.invoke('createStudentProfile', {
        profile: {
          full_name: form.full_name,
          nationality: "Brasil",
          native_language: form.native_language,
          target_language: form.target_language,
          level: form.level,
          objective: form.objective,
          accent_preference: "",
          conversation_topics: form.conversation_topics,
        },
        coupon_code: couponStatus === "valid" ? couponCode : null,
      });
      await base44.auth.updateMe({ profile_completed: true });
      await base44.functions.invoke('setUserRole', { role: 'student' });
      base44.functions.invoke('notifyAdminNewUser', {
        full_name: form.full_name,
        role: 'student',
        plan: 'free',
        coupon_code: couponStatus === "valid" ? couponCode : null,
      }).catch(() => {});
      toast({ title: t(lang, "welcomeToastTitle"), description: t(lang, "welcomeToastDesc") });
      // Dispara a conversão pro Reddit Ads aqui — cobre os dois jeitos de
      // cadastro (e-mail+código OU Google), já que os dois passam por aqui
      // pra criar o perfil, e dispara só uma vez, no momento em que o
      // cadastro está de fato concluído (perfil criado com sucesso).
      //
      // Dois caminhos, um reforçando o outro: o pixel do navegador (rdt)
      // e uma chamada pro servidor (sendRedditConversion) — o servidor não
      // depende do pixel carregar no navegador da pessoa nem é afetado por
      // bloqueador de anúncio, então continua funcionando mesmo se o pixel
      // client-side falhar por algum motivo (como a política de segurança
      // do navegador bloqueando, que foi o caso hoje).
      if (typeof window.rdt === "function") {
        window.rdt("track", "SignUp");
      }
      base44.functions.invoke("sendRedditConversion", {}).catch(() => {});
      setTimeout(() => { window.location.href = "/"; }, 300);
    } catch (e) {
      console.error("[OnboardingStudent] submit error:", e);
      toast({ title: t(lang, "profileErrorTitle"), description: t(lang, "profileErrorDesc"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1.5 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-orange-500 focus:ring-orange-500/20 shadow-sm";
  const selectTriggerCls = "mt-1.5 bg-white border-gray-300 text-gray-900 shadow-sm";
  const selectContentCls = "bg-white border-gray-200 text-gray-900 shadow-xl z-50";
  const selectItemCls = "text-gray-900 focus:bg-orange-50 focus:text-orange-700";
  const labelCls = "text-gray-700 font-medium";

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Seletor de idioma — essa tela fica fora do layout principal, então
            não herda o seletor que existe lá; sem isso, um usuário
            internacional não teria como trocar o idioma logo no primeiro
            contato com a plataforma. */}
        <div className="flex justify-center mb-4">
          <div className="flex items-center border rounded-full overflow-hidden" style={{ borderColor: "#e5e7eb", fontSize: 11 }}>
            {LANG_OPTIONS.map(l => (
              <button
                key={l}
                onClick={() => changeLang(l)}
                className="px-2.5 py-1 font-bold transition-colors"
                style={{
                  background: lang === l ? "#F26A1B" : "transparent",
                  color: lang === l ? "#fff" : "#888",
                  border: "none", cursor: "pointer", fontFamily: "inherit", fontWeight: 700,
                }}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/2ef13ca22_ChatGPTImage23dejulde202614_44_54.png"
              alt="One Talky"
              className="w-12 h-12 object-contain"
            />
          </div>

          <h1 className="font-display text-2xl font-bold text-gray-900">{t(lang, "setupProfileTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t(lang, "stepLabel").replace("{step}", step)}</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-14 rounded-full transition-colors ${s <= step ? "bg-orange-500" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <Label className={labelCls}>{t(lang, "fullNameLabel")}</Label>
                <Input
                  value={form.full_name}
                  onChange={e => set("full_name", e.target.value)}
                  placeholder={t(lang, "fullNamePlaceholder")}
                  className={inputCls}
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.full_name.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all mt-2"
              >
                {t(lang, "continueBtn")} <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className={labelCls}>{t(lang, "currentLevelLabel")}</Label>
                <Select value={form.level} onValueChange={v => set("level", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={t(lang, "selectLevelPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value} className={selectItemCls}>{t(lang, LEVEL_KEY[l.value])}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>{t(lang, "mainObjectiveLabel")}</Label>
                <Select value={form.objective} onValueChange={v => set("objective", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder={t(lang, "selectObjectivePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value} className={selectItemCls}>{t(lang, OBJ_KEY[o.value])}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t(lang, "backBtn")}
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!form.level || !form.objective}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all"
                >
                  {t(lang, "continueBtn")} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Tópicos de conversa */}
              <div>
                <Label className={`${labelCls} block mb-1`}>{t(lang, "favoriteTopicsLabel")}</Label>
                <p className="text-xs text-gray-500 mb-3">{t(lang, "favoriteTopicsSub")}</p>
                <div className="flex flex-wrap gap-2">
                  {INTERESTS.map(topic => (
                    <button
                      key={topic}
                      type="button"
                      onClick={() => toggleTopic(topic)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                        form.conversation_topics.includes(topic)
                          ? "bg-orange-500 text-white border-orange-500 shadow-sm"
                          : "bg-white text-gray-600 border-gray-300 hover:border-orange-400 hover:text-orange-600"
                      }`}
                    >
                      {t(lang, INTEREST_KEY[topic]) || topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cupom — destacado de propósito: coupons de minutos grátis só
                  podem ser aplicados aqui, nunca mais depois do cadastro. */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                <p className="text-sm font-bold text-orange-700 mb-1">{t(lang, "couponReminderTitle")}</p>
                <p className="text-xs text-orange-600 mb-3">{t(lang, "couponReminderDesc")}</p>
                <Label className={`${labelCls} flex items-center gap-1.5 mb-1.5`}>
                  <Tag className="w-3.5 h-3.5" /> {t(lang, "promoCouponLabel")} <span className="text-gray-400 font-normal">{t(lang, "optionalLabel")}</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); setCouponData(null); }}
                    placeholder={t(lang, "couponPlaceholder")}
                    className={`${inputCls} font-mono uppercase`}
                  />
                  <Button type="button" onClick={checkCoupon} disabled={!couponCode.trim() || checkingCoupon}
                    variant="outline" className="shrink-0 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white px-4">
                    {checkingCoupon ? "..." : t(lang, "applyBtn")}
                  </Button>
                </div>
                {couponStatus === "valid" && couponData && (
                  <p className="flex items-center gap-1.5 text-emerald-600 text-xs mt-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> {t(lang, "couponValidMsg").replace("{minutes}", couponData.credits_minutes)}
                  </p>
                )}
                {couponStatus === "invalid" && (
                  <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1.5">
                    <XCircle className="w-3.5 h-3.5" /> {t(lang, "couponInvalidMsg")}
                  </p>
                )}
                {couponStatus === "already_used" && (
                  <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1.5">
                    <XCircle className="w-3.5 h-3.5" /> {t(lang, "couponAlreadyUsedMsg")}
                  </p>
                )}
              </div>

              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(2)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> {t(lang, "backBtn")}
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all"
                >
                  {saving ? t(lang, "savingBtn") : t(lang, "startPracticingBtn")}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}