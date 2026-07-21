import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageCircle, ChevronRight, ChevronLeft } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PIX_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave Aleatória" },
];

export default function OnboardingAffiliate() {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);
  const [userEmail, setUserEmail] = useState("");
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    coupon_code: "",
    pix_key_type: "",
    pix_key: "",
    bank_info: "",
  });

  useEffect(() => {
    base44.auth.me().then(async (me) => {
      setUserId(me.id);
      setUserEmail(me.email || "");
      setForm(f => ({ ...f, full_name: me.full_name || "" }));
      // Check if already registered as affiliate (by user_id or by email)
      let existing = await base44.entities.Affiliate.filter({ user_id: me.id });
      if (existing.length === 0 && me.email) {
        existing = await base44.entities.Affiliate.filter({ email: me.email });
        if (existing.length > 0) {
          // Link user_id and redirect
          await base44.entities.Affiliate.update(existing[0].id, { user_id: me.id });
          await base44.auth.updateMe({ role: "affiliate" });
          window.location.href = "/affiliate";
          return;
        }
      }
      if (existing.length > 0) {
        await base44.auth.updateMe({ role: "affiliate" });
        window.location.href = "/affiliate";
      }
    }).catch(() => {});
  }, []);

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const handleSubmit = async () => {
    if (!userId) {
      toast({ title: "Erro de autenticação", description: "Recarregue a página e tente novamente.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const code = form.coupon_code.trim().toUpperCase();

      // Validate coupon exists and is affiliate-linked or available
      const coupons = await base44.entities.Coupon.filter({ code });
      if (coupons.length === 0) {
        throw new Error(`Cupom "${code}" não encontrado. Verifique com o administrador.`);
      }
      const coupon = coupons[0];
      if (coupon.affiliate_id && coupon.affiliate_id !== "") {
        // Check if linked to another affiliate
        const existing = await base44.entities.Affiliate.filter({ coupon_code: code });
        if (existing.length > 0 && existing[0].user_id !== userId) {
          throw new Error("Este cupom já está vinculado a outro afiliado.");
        }
      }

      await base44.entities.Affiliate.create({
        user_id: userId,
        full_name: form.full_name,
        email: userEmail,
        coupon_code: code,
        commission_percent: 15,
        status: "active",
        pix_key: form.pix_key,
        pix_key_type: form.pix_key_type,
        bank_info: form.bank_info,
      });

      // Link coupon to this affiliate
      await base44.entities.Coupon.update(coupon.id, { affiliate_id: userId });

      toast({ title: "Cadastro realizado! 🎉", description: "Seu perfil de afiliado foi criado com sucesso." });
      setAlreadyRegistered(true);
      window.location.href = "/affiliate";
    } catch (e) {
      toast({ title: "Erro", description: String(e?.message || "Tente novamente."), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "mt-1.5 bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-violet-500 shadow-sm";
  const selectTriggerCls = "mt-1.5 bg-white border-gray-300 text-gray-900 shadow-sm";
  const selectContentCls = "bg-white border-gray-200 text-gray-900 shadow-xl z-50";
  const selectItemCls = "text-gray-900 focus:bg-violet-50 focus:text-violet-700";
  const labelCls = "text-gray-700 font-medium";

  if (alreadyRegistered) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center bg-white border border-gray-200 rounded-3xl p-10 shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-500/30">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display text-2xl font-bold text-gray-900 mb-2">Você já é afiliado!</h2>
          <p className="text-gray-500 mb-6">Seu perfil de afiliado já está cadastrado na plataforma.</p>
          <Button onClick={() => window.location.href = "/affiliate"}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 w-full">
            Ver meu painel de afiliado
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">One Talky</span>
          </div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Cadastro de Afiliado</h1>
          <p className="text-gray-500 text-sm mt-1">Etapa {step} de 2</p>
          <div className="flex justify-center gap-2 mt-4">
            {[1, 2].map(s => (
              <div key={s} className={`h-1.5 w-16 rounded-full transition-colors ${s <= step ? "bg-violet-600" : "bg-gray-200"}`} />
            ))}
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-3xl p-8 shadow-xl">

          {/* Step 1 — Personal info + coupon */}
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
              <div>
                <Label className={labelCls}>Código do seu cupom</Label>
                <Input
                  value={form.coupon_code}
                  onChange={e => set("coupon_code", e.target.value.toUpperCase())}
                  placeholder="Ex: JOAO15"
                  className={`${inputCls} font-mono uppercase`}
                />
                <p className="text-xs text-gray-400 mt-1">O código do cupom foi fornecido pelo administrador da plataforma.</p>
              </div>
              <Button
                type="button"
                onClick={() => setStep(2)}
                disabled={!form.full_name || !form.coupon_code}
                className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all mt-2"
              >
                Continuar <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}

          {/* Step 2 — Pix info */}
          {step === 2 && (
            <div className="space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-4">Dados para recebimento de comissões via Pix</p>
                <Label className={labelCls}>Tipo de chave Pix</Label>
                <Select value={form.pix_key_type} onValueChange={v => set("pix_key_type", v)}>
                  <SelectTrigger className={selectTriggerCls}>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent className={selectContentCls}>
                    {PIX_TYPES.map(t => (
                      <SelectItem key={t.value} value={t.value} className={selectItemCls}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className={labelCls}>Chave Pix</Label>
                <Input
                  value={form.pix_key}
                  onChange={e => set("pix_key", e.target.value)}
                  placeholder="Sua chave Pix"
                  className={inputCls}
                />
              </div>
              <div>
                <Label className={labelCls}>Informações adicionais (opcional)</Label>
                <Input
                  value={form.bank_info}
                  onChange={e => set("bank_info", e.target.value)}
                  placeholder="Banco, agência, conta... (opcional)"
                  className={inputCls}
                />
              </div>
              <div className="flex gap-3 mt-2">
                <Button type="button" variant="outline" onClick={() => setStep(1)} className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 bg-white">
                  <ChevronLeft className="w-4 h-4 mr-1" /> Voltar
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!form.pix_key_type || !form.pix_key || saving}
                  className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all"
                >
                  {saving ? "Salvando..." : "Finalizar cadastro"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}