import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { OBJECTIVES, LEVELS, INTERESTS } from "@/lib/constants";
import { ChevronRight, ChevronLeft, Tag, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const LEVELS_PT = {
  beginner: "Iniciante",
  intermediate: "Intermediário",
  advanced: "Avançado",
};

export default function OnboardingStudent() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [form, setForm] = useState({
    full_name: "",
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
      toast({ title: "Erro de autenticação", description: "Recarregue a página e tente novamente.", variant: "destructive" });
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
      toast({ title: "Bem-vindo à One Talky! 🎉", description: "Seu perfil foi criado com sucesso." });
      window.location.href = "/";
    } catch (e) {
      console.error("[OnboardingStudent] submit error:", e);
      toast({ title: "Erro ao criar perfil", description: "Não foi possível criar seu perfil. Tente novamente.", variant: "destructive" });
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
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <img
              src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/2ef13ca22_ChatGPTImage23dejulde202614_44_54.png"
              alt="One Talky"
              className="w-12 h-12 object-contain"
            />
          </div>

          <h1 className="font-display text-2xl font-bold text-gray-900">Configure seu perfil</h1>
          <p className="text-gray-500 text-sm mt-1">Passo {step} de 3</p>
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
                <Label className={labelCls}>Nome completo</Label>
                <Input
                  value={form.full_name}
                  onChange={e => set("full_name", e.target.value)}
                  placeholder="Seu nome completo"
                  className={inputCls}
                />
              </div>
              <Button
                onClick={() => setStep(2)}
                disabled={!form.full_name.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all mt-2"
              >
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <Label className={labelCls}>Nível atual</Label>
                <Select value={form.level} onValueChange={v => set("level", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Selecione seu nível" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {LEVELS.map(l => (
                      <SelectItem key={l.value} value={l.value} className={selectItemCls}>{LEVELS_PT[l.value]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>Objetivo principal</Label>
                <Select value={form.objective} onValueChange={v => set("objective", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Selecione seu objetivo" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {OBJECTIVES.map(o => <SelectItem key={o.value} value={o.value} className={selectItemCls}>{o.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button
                  onClick={() => setStep(3)}
                  disabled={!form.level || !form.objective}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all"
                >
                  Continuar <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-5">
              {/* Tópicos de conversa */}
              <div>
                <Label className={`${labelCls} block mb-1`}>Tópicos favoritos de conversa</Label>
                <p className="text-xs text-gray-500 mb-3">Escolha os temas que você mais gosta de conversar (pode selecionar vários)</p>
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
                      {topic}
                    </button>
                  ))}
                </div>
              </div>

              {/* Cupom */}
              <div>
                <Label className={`${labelCls} flex items-center gap-1.5 mb-1.5`}>
                  <Tag className="w-3.5 h-3.5" /> Cupom promocional <span className="text-gray-400 font-normal">(opcional)</span>
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={couponCode}
                    onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponStatus(null); setCouponData(null); }}
                    placeholder="Ex: BEMVINDO10"
                    className={`${inputCls} font-mono uppercase`}
                  />
                  <Button type="button" onClick={checkCoupon} disabled={!couponCode.trim() || checkingCoupon}
                    variant="outline" className="shrink-0 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white px-4">
                    {checkingCoupon ? "..." : "Aplicar"}
                  </Button>
                </div>
                {couponStatus === "valid" && couponData && (
                  <p className="flex items-center gap-1.5 text-emerald-600 text-xs mt-1.5">
                    <CheckCircle className="w-3.5 h-3.5" /> Cupom válido! Você ganha {couponData.credits_minutes} minutos grátis 🎉
                  </p>
                )}
                {couponStatus === "invalid" && (
                  <p className="flex items-center gap-1.5 text-red-500 text-xs mt-1.5">
                    <XCircle className="w-3.5 h-3.5" /> Cupom inválido ou expirado.
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
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white border-0 shadow-lg shadow-orange-500/20 hover:opacity-90 transition-all"
                >
                  {saving ? "Salvando..." : "Começar a praticar! 🚀"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}