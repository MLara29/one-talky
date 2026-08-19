import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Users, DollarSign, ToggleLeft, ToggleRight, Trash2, ChevronDown, ChevronUp, Copy, Link } from "lucide-react";
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
  const [editingCommission, setEditingCommission] = useState({});
  const [savingCommission, setSavingCommission] = useState(null);
  const [formMode, setFormMode] = useState("new"); // "new" | "link"
  const [form, setForm] = useState({
    full_name: "", email: "", coupon_code: "", commission_percent: 15, user_id: "",
  });
  const [linkForm, setLinkForm] = useState({ affiliate_id: "", coupon_code: "" });
  const [linking, setLinking] = useState(false);

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

      const response = await base44.functions.invoke("adminManageAffiliate", {
        action: "create",
        payload: { full_name: form.full_name, email: form.email, coupon_code: code, commission_percent: Number(form.commission_percent), user_id: form.user_id || undefined },
      });
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: "Afiliado criado! 🎉" });
      setForm({ full_name: "", email: "", coupon_code: "", commission_percent: 15, user_id: "" });
      loadData();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const toggleStatus = async (aff) => {
    try {
      const response = await base44.functions.invoke("adminManageAffiliate", { action: "toggle_status", payload: { affiliate_id: aff.id } });
      if (response.data?.error) throw new Error(response.data.error);
      loadData();
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const markAsPaid = async (earningId) => {
    try {
      const response = await base44.functions.invoke("adminManageAffiliate", { action: "mark_earning_paid", payload: { earning_id: earningId } });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Marcado como pago ✅" });
      loadData();
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const deleteEarning = async (earning) => {
    if (!window.confirm(`Excluir este registro de comissão de ${earning.student_name || "aluno"} (${fmtBRL(earning.commission_amount)})? Essa ação não pode ser desfeita.`)) return;
    try {
      const response = await base44.functions.invoke("adminManageAffiliate", { action: "delete_earning", payload: { earning_id: earning.id } });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Registro excluído" });
      loadData();
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const saveCommission = async (aff) => {
    const newPct = Number(editingCommission[aff.id]);
    if (isNaN(newPct) || newPct < 1 || newPct > 100) {
      toast({ title: "Valor inválido", description: "Comissão deve ser entre 1 e 100%.", variant: "destructive" });
      return;
    }
    setSavingCommission(aff.id);
    try {
      const response = await base44.functions.invoke("adminManageAffiliate", { action: "update_commission", payload: { affiliate_id: aff.id, commission_percent: newPct } });
      if (response.data?.error) throw new Error(response.data.error);
      toast({ title: "Comissão atualizada ✅" });
      setEditingCommission(prev => { const n = { ...prev }; delete n[aff.id]; return n; });
      loadData();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setSavingCommission(null); }
  };

  const handleLinkCoupon = async (e) => {
    e.preventDefault();
    setLinking(true);
    try {
      const code = linkForm.coupon_code.trim().toUpperCase();
      if (!code || !linkForm.affiliate_id) throw new Error("Selecione um afiliado e informe o cupom");

      const affiliate = affiliates.find(a => a.id === linkForm.affiliate_id);
      const response = await base44.functions.invoke("adminManageAffiliate", {
        action: "link_coupon",
        payload: { affiliate_id: linkForm.affiliate_id, coupon_code: code },
      });
      if (response.data?.error) throw new Error(response.data.error);

      toast({ title: "Cupom vinculado! 🎉", description: `Cupom "${code}" vinculado ao afiliado "${affiliate.full_name}".` });
      setLinkForm({ affiliate_id: "", coupon_code: "" });
      loadData();
    } catch (err) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally { setLinking(false); }
  };

  const deleteAffiliate = async (aff) => {
    if (!confirm(`Excluir afiliado "${aff.full_name}"?`)) return;
    try {
      const response = await base44.functions.invoke("adminManageAffiliate", { action: "delete", payload: { affiliate_id: aff.id } });
      if (response.data?.error) throw new Error(response.data.error);
      loadData();
    } catch (err) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const STATUS_CFG = {
    aguardando_7_dias: { label: "Em carência", cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
    liberado: { label: "Liberado", cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
    pago: { label: "Pago", cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
    cancelado: { label: "Cancelado (venda reembolsada)", cls: "bg-red-500/10 border-red-500/20 text-red-400" },
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="theme-heading font-display text-xl font-bold">Afiliados</h1>
            <p className="theme-subtext text-sm text-gray-500">Gerencie influenciadores e suas comissões</p>
          </div>
        </div>
        <Button
          onClick={() => {
            const link = `${window.location.origin}/register?next=/onboarding/affiliate`;
            navigator.clipboard.writeText(link);
            toast({ title: "Link copiado! 🔗", description: "Envie este link para o influencer se cadastrar." });
          }}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20"
        >
          <Link className="w-4 h-4 mr-1.5" /> Copiar link de cadastro
        </Button>
      </div>

      {/* Create / Link form */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
        {/* Mode toggle */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setFormMode("new")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${formMode === "new" ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            + Novo Afiliado
          </button>
          <button
            onClick={() => setFormMode("link")}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${formMode === "link" ? "bg-violet-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"}`}
          >
            🔗 Vincular Cupom a Afiliado Existente
          </button>
        </div>

        {formMode === "new" ? (
          <>
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
          </>
        ) : (
          <>
            <h2 className="theme-heading font-semibold mb-1">Vincular Novo Cupom a Afiliado Existente</h2>
            <p className="text-sm text-gray-500 mb-4">Cria um novo registro de afiliado com o mesmo nome/e-mail mas com um cupom diferente.</p>
            <form onSubmit={handleLinkCoupon} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label className="theme-subtext text-sm mb-1 block">Selecionar Afiliado *</Label>
                  <select
                    value={linkForm.affiliate_id}
                    onChange={e => setLinkForm(f => ({ ...f, affiliate_id: e.target.value }))}
                    className="theme-input w-full h-9 rounded-md border px-3 text-sm bg-white/5 border-white/10"
                    required
                  >
                    <option value="">— Escolha um afiliado —</option>
                    {affiliates.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name} ({a.email}) — cupom atual: {a.coupon_code}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="theme-subtext text-sm mb-1 block">Novo Código de Cupom *</Label>
                  <Input
                    value={linkForm.coupon_code}
                    onChange={e => setLinkForm(f => ({ ...f, coupon_code: e.target.value.toUpperCase() }))}
                    placeholder="JOAO20" className="theme-input font-mono uppercase" required
                  />
                  <p className="text-xs text-gray-600 mt-1">Crie o cupom em Cupons antes de vincular aqui</p>
                </div>
              </div>
              <Button type="submit" disabled={linking}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
                <Link className="w-4 h-4 mr-1.5" /> {linking ? "Vinculando..." : "Vincular Cupom"}
              </Button>
            </form>
          </>
        )}
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
            // Esconde os marcadores de "cadastro pelo cupom" (onboarding_bonus,
            // sempre R$ 0,00, criados no momento do cadastro, não são comissão
            // de verdade) — só polui o extrato sem agregar nada útil pro admin.
            const affEarnings = getAffiliateEarnings(aff.id).filter(e => e.plan_id !== "onboarding_bonus");

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

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="border-t border-white/10 p-5 space-y-6">

                    {/* Summary cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Total ganho", value: fmtBRL(summary.total), color: "text-emerald-400" },
                        { label: "Disponível p/ pagar", value: fmtBRL(summary.available), color: "text-amber-400" },
                        { label: "Total pago", value: fmtBRL(affEarnings.filter(e => e.status === "pago").reduce((s, e) => s + (e.commission_amount || 0), 0)), color: "text-blue-400" },
                        { label: "Alunos únicos", value: summary.students, color: "theme-heading" },
                      ].map(card => (
                        <div key={card.label} className="bg-white/3 border border-white/5 rounded-xl p-3 text-center">
                          <p className={`text-base font-bold ${card.color}`}>{card.value}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{card.label}</p>
                        </div>
                      ))}
                    </div>

                    {/* Commission editor */}
                    <div className="bg-white/3 border border-white/5 rounded-xl p-4">
                      <h4 className="theme-heading font-semibold text-sm mb-3">Comissão do Afiliado</h4>
                      <div className="flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Atual:</span>
                          <span className="font-bold text-violet-400 text-sm">{aff.commission_percent}%</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="number" min={1} max={100}
                            placeholder="Nova %"
                            value={editingCommission[aff.id] ?? ""}
                            onChange={e => setEditingCommission(prev => ({ ...prev, [aff.id]: e.target.value }))}
                            className="theme-input w-24 h-8 text-sm"
                          />
                          <Button
                            size="sm"
                            disabled={!editingCommission[aff.id] || savingCommission === aff.id}
                            onClick={() => saveCommission(aff)}
                            className="h-8 text-xs bg-violet-600 hover:bg-violet-700 text-white border-0"
                          >
                            {savingCommission === aff.id ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2">⚠️ Apenas administradores podem alterar a comissão. A alteração é registrada no banco de dados com controle de acesso por role.</p>
                    </div>

                    {/* Payment info */}
                    <div className="bg-white/3 border border-white/5 rounded-xl p-4">
                      <h4 className="theme-heading font-semibold text-sm mb-3 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-violet-400" /> Dados para Pagamento
                      </h4>
                      {aff.pix_key ? (
                        <div className="space-y-2">
                          <div className="flex gap-2 flex-wrap">
                            <span className="text-xs text-gray-500">Tipo de chave Pix:</span>
                            <span className="text-xs font-medium theme-heading capitalize">{aff.pix_key_type || "—"}</span>
                          </div>
                          <div className="flex gap-2 flex-wrap items-center">
                            <span className="text-xs text-gray-500">Chave Pix:</span>
                            <span className="text-xs font-mono font-bold theme-heading bg-violet-500/10 border border-violet-500/20 text-violet-300 px-2 py-0.5 rounded-lg select-all">{aff.pix_key}</span>
                          </div>
                          {aff.bank_info && (
                            <div className="flex gap-2 flex-wrap">
                              <span className="text-xs text-gray-500">Info adicional:</span>
                              <span className="text-xs theme-heading">{aff.bank_info}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-600">Afiliado ainda não cadastrou dados de pagamento.</p>
                      )}
                    </div>

                    {/* Students / commissions list */}
                    <div>
                      <h4 className="theme-heading font-semibold text-sm mb-3">Alunos & Comissões ({affEarnings.length})</h4>
                      {affEarnings.length === 0 ? (
                        <p className="text-gray-600 text-sm">Nenhuma comissão registrada ainda.</p>
                      ) : (
                        <div className="space-y-2">
                          {affEarnings.map(e => {
                            const cfg = STATUS_CFG[e.status] || STATUS_CFG.aguardando_7_dias;
                            return (
                              <div key={e.id} className="flex items-center justify-between p-3 rounded-xl bg-white/3 border border-white/5 gap-4 flex-wrap">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs flex-shrink-0">
                                    {(e.student_name || "?").charAt(0).toUpperCase()}
                                  </div>
                                  <div>
                                    <p className="theme-heading text-sm font-medium">{e.student_name || "—"}</p>
                                    <p className="theme-subtext text-xs text-gray-500">
                                      {e.plan_id} · {e.sale_date ? new Date(e.sale_date).toLocaleDateString("pt-BR") : "—"}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 flex-wrap">
                                  <div className="text-right">
                                    <p className="text-xs text-gray-500">Venda: {fmtBRL(e.sale_amount)}</p>
                                    <p className="text-sm font-bold text-emerald-400">Comissão: {fmtBRL(e.commission_amount)}</p>
                                  </div>
                                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium ${cfg.cls}`}>
                                    {cfg.label}
                                  </span>
                                  {e.status === "liberado" && (
                                    <Button size="sm" onClick={() => markAsPaid(e.id)}
                                      className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 h-7 text-xs">
                                      Marcar pago
                                    </Button>
                                  )}
                                  <button
                                    onClick={() => deleteEarning(e)}
                                    title="Excluir registro"
                                    className="w-7 h-7 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

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