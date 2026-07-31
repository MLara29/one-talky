import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Landmark } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const PIX_TYPES = [
  { value: "cpf", label: "CPF" },
  { value: "email", label: "E-mail" },
  { value: "telefone", label: "Telefone" },
  { value: "aleatoria", label: "Chave aleatória" },
];

export default function AffiliatePayoutTab({ affiliate, onSaved }) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    pix_key: affiliate?.pix_key || "",
    pix_key_type: affiliate?.pix_key_type || "cpf",
    bank_info: affiliate?.bank_info || "",
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const response = await base44.functions.invoke("updateMyAffiliateProfile", {
        updates: {
          pix_key: form.pix_key,
          pix_key_type: form.pix_key_type,
          bank_info: form.bank_info,
        },
      });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Dados salvos! ✅", description: "Usaremos esses dados para o próximo repasse." });
      onSaved?.();
    } catch {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-xl space-y-4">
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 space-y-5">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
            <Landmark className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="theme-heading font-semibold">Dados para Repasse</h3>
            <p className="theme-subtext text-xs text-gray-500">Os repasses são feitos manualmente todo mês via Pix</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <Label className="theme-subtext text-sm mb-1.5 block">Tipo de chave Pix</Label>
            <div className="grid grid-cols-2 gap-2">
              {PIX_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, pix_key_type: t.value }))}
                  className={`py-2.5 px-3 rounded-xl text-sm font-medium border transition-all ${
                    form.pix_key_type === t.value
                      ? "bg-violet-600/20 border-violet-500/50 text-violet-400"
                      : "bg-white/5 border-white/10 theme-subtext text-gray-400 hover:bg-white/8"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="theme-subtext text-sm mb-1.5 block">Chave Pix</Label>
            <Input
              value={form.pix_key}
              onChange={e => setForm(f => ({ ...f, pix_key: e.target.value }))}
              placeholder={
                form.pix_key_type === "cpf" ? "000.000.000-00" :
                form.pix_key_type === "email" ? "seu@email.com" :
                form.pix_key_type === "telefone" ? "+55 11 99999-9999" :
                "Chave aleatória"
              }
              className="theme-input"
              required
            />
          </div>

          <div>
            <Label className="theme-subtext text-sm mb-1.5 block">Informações bancárias adicionais (opcional)</Label>
            <textarea
              value={form.bank_info}
              onChange={e => setForm(f => ({ ...f, bank_info: e.target.value }))}
              placeholder="Banco, agência, conta, nome do titular... qualquer informação extra"
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:border-violet-500 transition-colors theme-input resize-none"
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !form.pix_key.trim()}
            className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white border-0 shadow-lg hover:scale-[1.01] transition-all"
          >
            <Save className="w-4 h-4 mr-2" />
            {saving ? "Salvando..." : "Salvar dados"}
          </Button>
        </form>
      </div>

      <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4">
        <p className="text-amber-400 text-xs font-semibold mb-1">💡 Como funciona o repasse?</p>
        <ul className="text-gray-400 text-xs space-y-1 list-disc list-inside">
          <li>Comissões ficam em carência por 7 dias após cada venda</li>
          <li>Após a carência, o status muda para "Liberado"</li>
          <li>O repasse é feito manualmente todo mês para as comissões liberadas</li>
          <li>Você recebe uma notificação por e-mail quando o repasse for enviado</li>
        </ul>
      </div>
    </div>
  );
}