import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminCoupons() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState({ code: "", credits_minutes: 10, max_uses: 100, description: "" });

  useEffect(() => { loadCoupons(); }, []);

  const loadCoupons = async () => {
    try {
      const data = await base44.entities.Coupon.list("-created_date");
      setCoupons(data);
    } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const code = form.code.trim().toUpperCase();
      if (!code) return;
      await base44.entities.Coupon.create({
        code,
        credits_minutes: Number(form.credits_minutes),
        max_uses: Number(form.max_uses),
        description: form.description,
        used_count: 0,
        is_active: true,
      });
      setForm({ code: "", credits_minutes: 10, max_uses: 100, description: "" });
      toast({ title: "Cupom criado! 🎟️" });
      loadCoupons();
    } catch (e) {
      toast({ title: "Erro", description: e?.message || "Não foi possível criar o cupom.", variant: "destructive" });
    } finally { setCreating(false); }
  };

  const toggleActive = async (coupon) => {
    await base44.entities.Coupon.update(coupon.id, { is_active: !coupon.is_active });
    loadCoupons();
  };

  const deleteCoupon = async (coupon) => {
    if (!confirm(`Excluir cupom "${coupon.code}"?`)) return;
    await base44.entities.Coupon.delete(coupon.id);
    loadCoupons();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
          <Tag className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="theme-heading font-display text-xl font-bold">Cupons de Boas-Vindas</h1>
          <p className="theme-subtext text-sm text-gray-500">Crie códigos que concedem minutos grátis a novos alunos</p>
        </div>
      </div>

      {/* Create form */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="theme-heading font-semibold mb-4">Novo Cupom</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Código do cupom *</Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: BEMVINDO10"
                className="theme-input uppercase font-mono"
                required
              />
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Minutos grátis</Label>
              <Input
                type="number" min={1} max={60}
                value={form.credits_minutes}
                onChange={e => setForm(f => ({ ...f, credits_minutes: e.target.value }))}
                className="theme-input"
              />
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Máximo de usos</Label>
              <Input
                type="number" min={1}
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                className="theme-input"
              />
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Descrição (opcional)</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Ex: Campanha julho 2026"
                className="theme-input"
              />
            </div>
          </div>
          <Button type="submit" disabled={creating || !form.code.trim()}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
            <Plus className="w-4 h-4 mr-1.5" /> {creating ? "Criando..." : "Criar cupom"}
          </Button>
        </form>
      </div>

      {/* Coupon list */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : coupons.length === 0 ? (
          <p className="theme-subtext text-center text-gray-500 py-12">Nenhum cupom criado ainda.</p>
        ) : (
          <div className="divide-y" style={{ borderColor: "var(--app-border)" }}>
            {coupons.map(c => (
              <div key={c.id} className="flex items-center justify-between px-6 py-4 gap-4 flex-wrap">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-violet-400 text-sm bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-lg">
                    {c.code}
                  </span>
                  <div>
                    <p className="theme-heading text-sm font-semibold">{c.credits_minutes} min grátis</p>
                    {c.description && <p className="theme-subtext text-xs text-gray-500">{c.description}</p>}
                    <p className="theme-subtext text-xs text-gray-500">
                      {c.used_count || 0} / {c.max_uses} usos ·{" "}
                      <span className={c.is_active ? "text-emerald-500" : "text-red-500"}>
                        {c.is_active ? "Ativo" : "Inativo"}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => copyCode(c.code)} title="Copiar código"
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors theme-subtext text-gray-400">
                    {copied === c.code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  </button>
                  <button onClick={() => toggleActive(c)} title="Ativar/Desativar"
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    {c.is_active
                      ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                      : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                  </button>
                  <button onClick={() => deleteCoupon(c)} title="Excluir"
                    className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}