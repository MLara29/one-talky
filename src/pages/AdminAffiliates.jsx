import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, DollarSign, ToggleLeft, ToggleRight, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function AdminAffiliates() {
  const { toast } = useToast();
  const [affiliates, setAffiliates] = useState([]);
  const [earnings, setEarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [form, setForm] = useState({
    full_name: "", email: "", coupon_code: "", commission_percent: 15, user_id: "",
  });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [affs, earns] = await Promise.all([
        base44.entities.Affiliate.list("-created_date"),
        base44.entities.AffiliateEarning.list("-sale_date", 500),
      ]);
      setAffiliates(affs);
      setEarnings(earns);
    } finally { setLoading(false); }
  };

  const getAffiliateEarnings = (affiliateId) =>
    earnings.filter(e => e.affiliate_id === affiliateId);

  const getSummary = (affiliateId) => {
    const earns = getAffiliateEarnings(affiliateId);
    const total = earns.reduce((s, e) => s + (e.commission_amount || 0), 0);
    const available = earns.filter(e => e.status === "liberado").reduce((s, e) => s + (e.commission_amount || 0), 0);
    const students = new Set(earns.map(e => e.student_id)).size;
    return { total, available, students, count: earns.length };
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    try {
      const code = form.coupon_code.trim().toUpperCase();
      if (!code) throw new Error("Código do cupom obrigatório");

      // Ensure a Coupon record exists with this code
      const existingCoupons = await base44.entities.Coupon.filter({ code });
      if (existingCoupons.length === 0) {
        throw new Error(`Cupom "${code}" não existe. Crie o cupom em Cupons primeiro.`);
      }

      // Create affiliate
      const affiliate = await base44.entities.Affiliate.create({
        full_name: form.full_name,
        email: form.email,
        coupon_code: code,
        commission_percent: Number(form.commission_percent),
        status: "active",
        user_id: form.user_id || undefined,
      });

      // Link coupon to affiliate
      await base44.entities.Coupon.update(existingCoupons[0].id, { affiliate_id: affiliate.id });

      toast({ title: "Afiliado criado! 🎉" });
      setForm({ full_name: "", email: "", coupon_code: "", commission_percent: 15, user_id: "" });
      loadData();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const toggleStatus = async (aff) => {
    await base44.entities.Affiliate.update(aff.id, { status: aff.status === "active" ? "inactive" : "active" });
    loadData();
  };

  const markAsPaid = async (earningId) => {
    await base44.entities.AffiliateEarning.update(earningId, {
      status: "pago",
      paid_at: new Date().toISOString(),
    });
    toast({ title: "Marcado como pago ✅" });
    loadData();
  };

  const deleteAffiliate = async (aff) => {
    if (!confirm(`Excluir afiliado "${aff.full_name}"?`)) return;
    await base44.entities.Affiliate.delete(aff.id);
    loadData();
  };

  const STATUS_CFG = {
    aguardando_7_dias: { label: "Em carência", cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    liberado: { label: "Liberado", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
    pago: { label: "Pago", cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
          <Users className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="theme-heading font-display text-xl font-bold">Afiliados</h1>
          <p className="theme-subtext text-sm text-gray-500">Gerencie influenciadores e suas comissões</p>
        </div>
      </div>

      {/* Create form */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="theme-heading font-semibold mb-4">Novo Afiliado</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Nome completo *</Label>
              <Input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                placeholder="João Silva" className="theme-input" required />
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">E-mail *</Label>
              <Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="joao@email.com" className="theme-input" required />
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Código do Cupom (já existente) *</Label>
              <Input value={form.coupon_code}
                onChange={e => setForm(f => ({ ...f, coupon_code: e.target.value.toUpperCase() }))}
                placeholder="JOAO15" className="theme-input font-mono uppercase" required />
              <p className="text-xs text-gray-600 mt-1">Crie o cupom em Cupons antes de vincular aqui</p>
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Comissão (%)</Label>
              <Input type="number" min={1} max={50} value={form.commission_percent}
                onChange={e => setForm(f => ({ ...f, commission_percent: e.target.value }))}
                className="theme-input" />
            </div>
            <div className="sm:col-span-2">
              <Label className="theme-subtext text-sm mb-1 block">User ID (opcional — para vincular ao login)</Label>
              <Input value={form.user_id} onChange={e => setForm(f => ({ ...f, user_id: e.target.value }))}
                placeholder="ID do usuário na plataforma" className="theme-input font-mono text-xs" />
            </div>
          </div>
          <Button type="submit" disabled={creating}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
            <Plus className="w-4 h-4 mr-1.5" /> {creating ? "Criando..." : "Criar Afiliado"}
          </Button>
        </form>
      </div>

      {/* Affiliates list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : affiliates.length === 0 ? (
        <p className="theme-subtext text-center text-gray-500 py-12">Nenhum afiliado cadastrado ainda.</p>
      ) : (
        <div className="space-y-3">
          {affiliates.map(aff => {
            const summary = getSummary(aff.id);
            const isExpanded = expanded === aff.id;
            const affEarnings = getAffiliateEarnings(aff.id);

            return (
              <div key={aff.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {/* Header row */}
                <div className="flex items-center justify-between px-5 py-4 gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-500/20 border border-violet-500/20 flex items-center justify-center">
                      <span className="text-violet-400 font-bold text-sm">{aff.full_name.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="theme-heading font-semibold">{aff.full_name}</p>
                      <p className="theme-subtext text-xs text-gray-500">{aff.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="text-center">
                      <p className="theme-heading text-sm font-bold">{summary.students}</p>
                      <p className="theme-subtext text-xs text-gray-500">alunos</p>
                    </div>
                    <div className="text-center">
                      <p className="theme-heading text-sm font-bold text-emerald-400">{fmtBRL(summary.total)}</p>
                      <p className="theme-subtext text-xs text-gray-500">total</p>
                    </div>
                    <div className="text-center">
                      <p className="theme-heading text-sm font-bold text-amber-400">{fmtBRL(summary.available)}</p>
                      <p className="theme-subtext text-xs text-gray-500">disponível</p>
                    </div>
                    <span className="font-mono text-xs text-violet-400 bg-violet-500/10 border border-violet-500/20 px-2.5 py-1 rounded-lg">
                      {aff.coupon_code}
                    </span>
                    <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${aff.status === "active" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-500/10 border-red-500/20 text-red-400"}`}>
                      {aff.status === "active" ? "Ativo" : "Inativo"}
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setExpanded(isExpanded ? null : aff.id)}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors theme-subtext text-gray-400">
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                      <button onClick={() => toggleStatus(aff)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                        {aff.status === "active"
                          ? <ToggleRight className="w-5 h-5 text-emerald-400" />
                          : <ToggleLeft className="w-5 h-5 text-gray-500" />}
                      </button>
                      <button onClick={() => deleteAffiliate(aff)} className="p-2 rounded-lg hover:bg-red-500/10 transition-colors text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expanded earnings */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="theme-heading font-semibold text-sm">Comissões ({affEarnings.length})</h4>
                      {aff.pix_key && (
                        <p className="text-xs text-gray-500">
                          Pix: <strong className="text-gray-300">{aff.pix_key}</strong> ({aff.pix_key_type})
                        </p>
                      )}
                    </div>
                    {affEarnings.length === 0 ? (
                      <p className="text-gray-600 text-sm">Nenhuma comissão ainda.</p>
                    ) : (
                      <div className="space-y-2">
                        {affEarnings.map(e => {
                          const cfg = STATUS_CFG[e.status] || STATUS_CFG.aguardando_7_dias;
                          return (
                            <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 gap-4 flex-wrap">
                              <div>
                                <p className="theme-heading text-sm font-medium">{e.student_name}</p>
                                <p className="theme-subtext text-xs text-gray-500">
                                  {e.plan_id} · {new Date(e.sale_date).toLocaleDateString("pt-BR")}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-emerald-400">{fmtBRL(e.commission_amount)}</span>
                                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.cls}`}>
                                  {cfg.label}
                                </span>
                                {e.status === "liberado" && (
                                  <Button size="sm" onClick={() => markAsPaid(e.id)}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-7 text-xs">
                                    Marcar pago
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}