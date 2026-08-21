import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, ToggleLeft, ToggleRight, Tag, Copy, Check, Pencil, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const DISCOUNT_TYPES = [
  { value: "none", label: "Sem desconto" },
  { value: "first_month", label: "Apenas 1º mês" },
  { value: "bimestral", label: "Bimestral (2 meses)" },
  { value: "trimestral", label: "Trimestral (3 meses)" },
  { value: "semestral", label: "Semestral (6 meses)" },
  { value: "anual", label: "Anual (12 meses)" },
  { value: "period", label: "Período personalizado" },
];

const EMPTY_FORM = {
  code: "", credits_minutes: 0, max_uses: 100, description: "",
  discount_percent: 0, discount_type: "none", discount_start: "", discount_end: "",
  expires_at: "",
};

export default function AdminCoupons() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null); // null = criando novo; senão, id do cupom em edição

  useEffect(() => { loadCoupons(); }, []);

  const startEdit = (c) => {
    setEditingId(c.id);
    setForm({
      code: c.code,
      credits_minutes: c.credits_minutes || 0,
      max_uses: c.max_uses || 100,
      description: c.description || "",
      discount_percent: c.discount_percent || 0,
      discount_type: c.discount_type || "none",
      discount_start: c.discount_start || "",
      discount_end: c.discount_end || "",
      expires_at: c.expires_at || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const loadCoupons = async () => {
    try {
      const data = await base44.entities.Coupon.list("-created_date");
      setCoupons(data);
    } finally { setLoading(false); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setCreating(true);
    const isEditing = Boolean(editingId);
    try {
      const code = form.code.trim().toUpperCase();
      if (!code) return;
      const payload = {
        code,
        credits_minutes: Number(form.credits_minutes) || 0,
        discount_percent: Number(form.discount_percent) || 0,
        discount_type: form.discount_percent > 0 ? form.discount_type : "none",
        max_uses: Number(form.max_uses),
        description: form.description,
      };
      if (form.discount_type === "period") {
        payload.discount_start = form.discount_start || undefined;
        payload.discount_end = form.discount_end || undefined;
      }
      if (form.expires_at) {
        payload.expires_at = form.expires_at;
      }
      if (isEditing) payload.coupon_id = editingId;

      const response = await base44.functions.invoke("adminManageCoupon", { action: isEditing ? "update" : "create", payload });
      if (response.data?.error) throw new Error(response.data.error);
      setForm(EMPTY_FORM);
      setEditingId(null);
      toast({ title: isEditing ? "Cupom atualizado! ✏️" : "Cupom criado! 🎟️" });
      loadCoupons();
    } catch (err) {
      toast({ title: "Erro", description: err?.message || `Não foi possível ${isEditing ? "atualizar" : "criar"} o cupom.`, variant: "destructive" });
    } finally { setCreating(false); }
  };

  const toggleActive = async (coupon) => {
    const response = await base44.functions.invoke("adminManageCoupon", { action: "toggle_active", payload: { coupon_id: coupon.id } });
    if (response.data?.error) {
      toast({ title: "Erro", description: response.data.error, variant: "destructive" });
      return;
    }
    loadCoupons();
  };

  const deleteCoupon = async (coupon) => {
    if (!confirm(`Excluir cupom "${coupon.code}"?`)) return;
    const response = await base44.functions.invoke("adminManageCoupon", { action: "delete", payload: { coupon_id: coupon.id } });
    if (response.data?.error) {
      toast({ title: "Erro", description: response.data.error, variant: "destructive" });
      return;
    }
    loadCoupons();
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopied(code);
    setTimeout(() => setCopied(null), 1500);
  };

  const discountLabel = (c) => {
    if (!c.discount_percent) return null;
    const type = DISCOUNT_TYPES.find(t => t.value === c.discount_type);
    if (c.discount_type === "period" && c.discount_start && c.discount_end) {
      return `${c.discount_percent}% · ${new Date(c.discount_start).toLocaleDateString("pt-BR")} a ${new Date(c.discount_end).toLocaleDateString("pt-BR")}`;
    }
    return `${c.discount_percent}% · ${type?.label || c.discount_type}`;
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
          <Tag className="w-4 h-4 text-white" />
        </div>
        <div>
          <h1 className="theme-heading font-display text-xl font-bold">Cupons</h1>
          <p className="theme-subtext text-sm text-gray-500">Crie códigos com minutos grátis e/ou descontos nas assinaturas</p>
        </div>
      </div>

      {/* Create / edit form */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-6">
        <h2 className="theme-heading font-semibold mb-4">{editingId ? `Editar cupom — ${form.code}` : "Novo Cupom"}</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Código do cupom *</Label>
              <Input
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                placeholder="Ex: BEMVINDO20"
                className="theme-input uppercase font-mono disabled:opacity-60"
                required
                disabled={Boolean(editingId)}
                title={editingId ? "O código não pode ser alterado depois de criado" : undefined}
              />
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Minutos grátis</Label>
              <Input
                type="number" min={0} max={120}
                value={form.credits_minutes}
                onChange={e => setForm(f => ({ ...f, credits_minutes: e.target.value }))}
                className="theme-input"
              />
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Desconto (%)</Label>
              <Input
                type="number" min={0} max={100}
                value={form.discount_percent}
                onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                placeholder="0 = sem desconto"
                className="theme-input"
              />
            </div>
            <div>
              <Label className="theme-subtext text-sm mb-1 block">Tipo de desconto</Label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
                disabled={!Number(form.discount_percent)}
                className="theme-input w-full h-9 rounded-md border border-white/10 bg-transparent px-3 py-1 text-sm disabled:opacity-40"
              >
                {DISCOUNT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            {form.discount_type === "period" && Number(form.discount_percent) > 0 && (
              <>
                <div>
                  <Label className="theme-subtext text-sm mb-1 block">Data início</Label>
                  <Input type="date" value={form.discount_start}
                    onChange={e => setForm(f => ({ ...f, discount_start: e.target.value }))}
                    className="theme-input" />
                </div>
                <div>
                  <Label className="theme-subtext text-sm mb-1 block">Data fim</Label>
                  <Input type="date" value={form.discount_end}
                    onChange={e => setForm(f => ({ ...f, discount_end: e.target.value }))}
                    className="theme-input" />
                </div>
              </>
            )}
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
              <Label className="theme-subtext text-sm mb-1 block">Validade do cupom (opcional)</Label>
              <Input
                type="date"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
                className="theme-input"
              />
              <p className="text-xs text-gray-500 mt-1">
                Depois dessa data, o cupom para de funcionar por completo — desconto e minutos de bônus juntos. Vale pra qualquer cupom, com ou sem desconto. Vazio = nunca expira.
              </p>
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
          <div className="flex items-center gap-2">
            <Button type="submit" disabled={creating || !form.code.trim()}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
              {editingId ? <Check className="w-4 h-4 mr-1.5" /> : <Plus className="w-4 h-4 mr-1.5" />}
              {creating ? "Salvando..." : editingId ? "Salvar alterações" : "Criar cupom"}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={cancelEdit} className="theme-subtext">
                <X className="w-4 h-4 mr-1.5" /> Cancelar edição
              </Button>
            )}
          </div>
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
            {coupons.map(c => {
              const dl = discountLabel(c);
              return (
                <div key={c.id} className="flex items-center justify-between px-6 py-4 gap-4 flex-wrap">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-violet-400 text-sm bg-violet-500/10 border border-violet-500/20 px-3 py-1 rounded-lg">
                      {c.code}
                    </span>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {c.credits_minutes > 0 && (
                          <p className="theme-heading text-sm font-semibold">{c.credits_minutes} min grátis</p>
                        )}
                        {dl && (
                          <span className="text-xs font-medium text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 rounded-full">
                            🏷 {dl}
                          </span>
                        )}
                      </div>
                      {c.description && <p className="theme-subtext text-xs text-gray-500">{c.description}</p>}
                      <p className="theme-subtext text-xs text-gray-500">
                        {c.used_count || 0} / {c.max_uses} usos ·{" "}
                        <span className={c.is_active ? "text-emerald-500" : "text-red-500"}>
                          {c.is_active ? "Ativo" : "Inativo"}
                        </span>
                        {c.expires_at && (() => {
                          const expired = new Date() > new Date(c.expires_at + "T23:59:59");
                          return (
                            <>
                              {" · "}
                              <span className={expired ? "text-red-500 font-semibold" : "text-gray-400"}>
                                {expired ? "Expirou em " : "Válido até "}
                                {new Date(c.expires_at).toLocaleDateString("pt-BR")}
                              </span>
                            </>
                          );
                        })()}
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}