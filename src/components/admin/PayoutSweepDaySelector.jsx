import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";

const WEEKDAYS = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda" },
  { value: 2, label: "Terça" },
  { value: 3, label: "Quarta" },
  { value: 4, label: "Quinta" },
  { value: 5, label: "Sexta" },
  { value: 6, label: "Sábado" },
];

// Admin control for the weekday used to review/sweep pending tutor payouts.
// Persists to the PayoutSettings singleton via updatePayoutSettings.
export default function PayoutSweepDaySelector() {
  const { toast } = useToast();
  const [sweepWeekday, setSweepWeekday] = useState(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    const settings = await base44.entities.PayoutSettings.list("-created_date", 1);
    if (settings[0]) setSweepWeekday(settings[0].sweep_weekday);
  };

  const handleChange = async (value) => {
    const weekday = parseInt(value, 10);
    setSaving(true);
    try {
      const response = await base44.functions.invoke("updatePayoutSettings", { sweep_weekday: weekday });
      if (response.data?.error) throw new Error(response.data.error);
      setSweepWeekday(weekday);
      toast({ title: "Dia de revisão de pagamentos salvo! ✅" });
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <div className="theme-card flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-4 w-fit">
      <span className="theme-subtext text-sm text-gray-500">Dia da semana para revisão de pagamentos:</span>
      <Select value={String(sweepWeekday)} onValueChange={handleChange} disabled={saving}>
        <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="bg-white border-gray-200 text-gray-900">
          {WEEKDAYS.map(d => (
            <SelectItem key={d.value} value={String(d.value)} className="text-gray-900 focus:bg-orange-50 focus:text-orange-700">
              {d.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}