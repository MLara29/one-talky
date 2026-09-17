import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Gift, Save, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminSignupPromo() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [amount, setAmount] = useState(0);
  const [recordId, setRecordId] = useState(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const records = await base44.entities.SignupPromoSettings.list();
      if (records.length > 0) {
        const r = records[0];
        setRecordId(r.id);
        setEnabled(r.auto_free_minutes_enabled || false);
        setAmount(r.auto_free_minutes_amount || 0);
      }
    } catch (e) {
      console.error("[AdminSignupPromo] load error:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = {
        auto_free_minutes_enabled: enabled,
        auto_free_minutes_amount: Number(amount) || 0,
      };
      if (recordId) {
        await base44.entities.SignupPromoSettings.update(recordId, data);
      } else {
        const created = await base44.entities.SignupPromoSettings.create(data);
        setRecordId(created.id);
      }
      toast({ title: "Configurações salvas!" });
    } catch (e) {
      console.error("[AdminSignupPromo] save error:", e);
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Gift className="w-6 h-6 text-orange-500" />
          Minutos Grátis Automáticos
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Configure minutos grátis automáticos para novos cadastros sem cupom.
        </p>
      </div>

      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-800 dark:text-gray-200">
              Ativar minutos grátis automáticos para novos cadastros
            </p>
            <p className="text-sm text-gray-500 mt-1">
              Quando ativo, qualquer aluno novo que se cadastrar sem cupom recebe os minutos configurados abaixo.
            </p>
          </div>
          <Switch checked={enabled} onCheckedChange={setEnabled} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Quantidade de minutos
          </label>
          <Input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={!enabled}
            className="max-w-xs"
          />
        </div>

        <Button onClick={handleSave} disabled={saving} className="bg-orange-500 hover:bg-orange-600 text-white border-0">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>
    </div>
  );
}