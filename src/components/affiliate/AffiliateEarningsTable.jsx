import React from "react";
import { Clock, CheckCircle, DollarSign } from "lucide-react";

function fmtBRL(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function fmtDate(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("pt-BR");
}

const STATUS_CONFIG = {
  aguardando_7_dias: { label: "Em carência", icon: Clock, cls: "bg-amber-500/10 border-amber-500/20 text-amber-400" },
  liberado: { label: "Liberado", icon: CheckCircle, cls: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" },
  pago: { label: "Pago", icon: DollarSign, cls: "bg-blue-500/10 border-blue-500/20 text-blue-400" },
};

export default function AffiliateEarningsTable({ earnings }) {
  if (earnings.length === 0) {
    return (
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
        <Clock className="w-8 h-8 text-gray-600 mx-auto mb-3" />
        <p className="theme-subtext text-gray-500">Nenhuma comissão registrada ainda.</p>
        <p className="theme-subtext text-gray-600 text-sm mt-1">As comissões aparecem aqui assim que um aluno assinar usando seu cupom.</p>
      </div>
    );
  }

  return (
    <div className="theme-card bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
      {/* Mobile cards */}
      <div className="divide-y divide-white/5 sm:hidden">
        {earnings.map(e => {
          const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.aguardando_7_dias;
          const Icon = cfg.icon;
          return (
            <div key={e.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <p className="theme-heading font-semibold text-sm">{e.student_name || "Aluno"}</p>
                <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1 ${cfg.cls}`}>
                  <Icon className="w-3 h-3" /> {cfg.label}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>Plano: <strong className="text-gray-300">{e.plan_id || "-"}</strong></span>
                <span>Venda: {fmtBRL(e.sale_amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">{fmtDate(e.sale_date)}</span>
                <span className="font-bold text-emerald-400">{fmtBRL(e.commission_amount)}</span>
              </div>
              {e.status === "aguardando_7_dias" && e.release_date && (
                <p className="text-xs text-gray-600">Libera em: {fmtDate(e.release_date)}</p>
              )}
            </div>
          );
        })}
      </div>

      {/* Desktop table */}
      <table className="w-full hidden sm:table">
        <thead>
          <tr className="border-b border-white/10">
            {["Aluno", "Plano", "Valor Venda", "Comissão", "Data", "Libera em", "Status"].map(h => (
              <th key={h} className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {earnings.map(e => {
            const cfg = STATUS_CONFIG[e.status] || STATUS_CONFIG.aguardando_7_dias;
            const Icon = cfg.icon;
            return (
              <tr key={e.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-5 py-3 theme-heading text-sm font-medium">{e.student_name || "Aluno"}</td>
                <td className="px-5 py-3 theme-subtext text-sm text-gray-400 capitalize">{e.plan_id || "-"}</td>
                <td className="px-5 py-3 theme-subtext text-sm text-gray-400">{fmtBRL(e.sale_amount)}</td>
                <td className="px-5 py-3 font-bold text-emerald-400">{fmtBRL(e.commission_amount)}</td>
                <td className="px-5 py-3 theme-subtext text-sm text-gray-400">{fmtDate(e.sale_date)}</td>
                <td className="px-5 py-3 theme-subtext text-sm text-gray-400">
                  {e.status === "aguardando_7_dias" ? fmtDate(e.release_date) : "-"}
                </td>
                <td className="px-5 py-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium flex items-center gap-1 w-fit ${cfg.cls}`}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}