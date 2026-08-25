import React, { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { DollarSign, Users, Clock, ChevronLeft, ChevronRight, Copy, Download, RefreshCw } from "lucide-react";

// Painel pra calcular quanto pagar a cada tutor da Upwork, por período —
// resolve o problema descoberto na conversa: contratos "0hrs/week + bônus"
// não são aceitos pela Upwork, e o caminho recomendado (Fixed-Price) precisa
// desse cálculo pronto, por semana, pra criar o marco com o valor certo.

function fmtUSD(v) {
  return (v || 0).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay(); // 0 = domingo
  date.setDate(date.getDate() - day);
  date.setHours(0, 0, 0, 0);
  return date;
}
function endOfWeek(d) {
  const start = startOfWeek(d);
  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  return end;
}
function fmtDateShort(d) {
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

export default function AdminTutorPayouts() {
  const { toast } = useToast();
  const [weekAnchor, setWeekAnchor] = useState(() => new Date());
  const [tutors, setTutors] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  const rangeStart = useMemo(() => startOfWeek(weekAnchor), [weekAnchor]);
  const rangeEnd = useMemo(() => endOfWeek(weekAnchor), [weekAnchor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tutorData, lessonData] = await Promise.all([
        base44.entities.TutorProfile.filter({ contract_type: "upwork" }),
        // Base44 não filtra por intervalo de data direto — trazemos todas as
        // aulas completas e filtramos por data em memória (comportamento já
        // conhecido da plataforma).
        base44.entities.Lesson.filter({ status: "completed" }),
      ]);
      setTutors(tutorData || []);
      setLessons(lessonData || []);
    } catch (err) {
      toast({ title: "Erro ao carregar dados", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  // ── Agrega minutos e valor por tutor, só dentro da semana selecionada ──
  const rows = useMemo(() => {
    const byTutor = {};
    for (const l of lessons) {
      const ended = l.ended_at ? new Date(l.ended_at) : null;
      if (!ended || ended < rangeStart || ended >= rangeEnd) continue;
      const minutes = l.duration_minutes || 0;
      const rate = l.rate_applied ?? 0; // taxa que valia NA HORA da aula, não a atual
      if (!byTutor[l.tutor_id]) byTutor[l.tutor_id] = { minutes: 0, lessons: 0, value: 0 };
      byTutor[l.tutor_id].minutes += minutes;
      byTutor[l.tutor_id].lessons += 1;
      byTutor[l.tutor_id].value += minutes * rate;
    }
    return tutors
      .map(t => ({
        id: t.id,
        name: t.full_name,
        photo: t.photo_url,
        ratePerHour: (t.price_per_minute || 0) * 60,
        minutes: byTutor[t.id]?.minutes || 0,
        lessonsCount: byTutor[t.id]?.lessons || 0,
        value: byTutor[t.id]?.value || 0,
      }))
      .filter(r => r.minutes > 0) // esconde tutor sem aula nenhuma na semana
      .sort((a, b) => b.value - a.value);
  }, [tutors, lessons, rangeStart, rangeEnd]);

  const totals = useMemo(() => ({
    minutes: rows.reduce((s, r) => s + r.minutes, 0),
    value: rows.reduce((s, r) => s + r.value, 0),
    tutorCount: rows.length,
  }), [rows]);

  const copyRow = (r) => {
    navigator.clipboard.writeText(`${r.name}: ${fmtUSD(r.value)} (${r.minutes.toFixed(0)} min)`);
    toast({ title: "Copiado!", description: `${r.name} — ${fmtUSD(r.value)}` });
  };

  const copyAll = () => {
    const text = rows.map(r => `${r.name}: ${fmtUSD(r.value)} (${r.minutes.toFixed(0)} min, ${r.lessonsCount} aulas)`).join("\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Lista completa copiada!", description: `${rows.length} tutores` });
  };

  const exportCSV = () => {
    const headers = ["Tutor", "Minutos", "Aulas", "USD/hora", "Valor a pagar (USD)"];
    const csvRows = rows.map(r => [r.name, r.minutes.toFixed(2), r.lessonsCount, r.ratePerHour.toFixed(2), r.value.toFixed(2)]);
    const csv = [headers, ...csvRows].map(row => row.join(";")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pagamentos-tutores-${fmtDateShort(rangeStart).replace("/", "-")}.csv`;
    a.click();
  };

  const prevWeek = () => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n; });
  const nextWeek = () => setWeekAnchor(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n; });

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Pagamentos aos Tutores (Upwork)</h1>
          <p className="theme-subtext text-gray-500 text-sm">Minutos e valor calculados a partir das aulas reais dadas na plataforma — pronto pra criar o marco Fixed-Price na Upwork.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={load} variant="outline" size="sm" className="bg-white/5 border-white/10 text-gray-300">
            <RefreshCw className="w-4 h-4 mr-2" /> Atualizar
          </Button>
          <Button onClick={exportCSV} size="sm" className="bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10">
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
        </div>
      </div>

      {/* Seletor de semana */}
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div className="flex items-center gap-3">
          <button onClick={prevWeek} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <ChevronLeft className="w-4 h-4 text-gray-400" />
          </button>
          <span className="theme-heading font-display font-bold text-white text-lg min-w-[180px] text-center">
            {fmtDateShort(rangeStart)} – {fmtDateShort(new Date(rangeEnd.getTime() - 86400000))}
          </span>
          <button onClick={nextWeek} className="w-9 h-9 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <Button onClick={copyAll} disabled={rows.length === 0} size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20">
          <Copy className="w-4 h-4 mr-2" /> Copiar lista inteira
        </Button>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        <div className="theme-card rounded-2xl p-5 bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-emerald-500/10 border border-emerald-500/25">
            <DollarSign className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="theme-subtext text-xs text-gray-500 uppercase tracking-wide">Total a pagar essa semana</p>
            <p className="theme-heading font-display text-xl font-bold text-white">{fmtUSD(totals.value)}</p>
          </div>
        </div>
        <div className="theme-card rounded-2xl p-5 bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500/10 border border-blue-500/25">
            <Clock className="w-5 h-5 text-blue-500" />
          </div>
          <div>
            <p className="theme-subtext text-xs text-gray-500 uppercase tracking-wide">Minutos dados</p>
            <p className="theme-heading font-display text-xl font-bold text-white">{totals.minutes.toFixed(0)} min</p>
          </div>
        </div>
        <div className="theme-card rounded-2xl p-5 bg-white/5 border border-white/10 flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 border border-violet-500/25">
            <Users className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <p className="theme-subtext text-xs text-gray-500 uppercase tracking-wide">Tutores com aula essa semana</p>
            <p className="theme-heading font-display text-xl font-bold text-white">{totals.tutorCount}</p>
          </div>
        </div>
      </div>

      {/* Tabela */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : rows.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-10 h-10 text-gray-600 mx-auto mb-3" />
            <p className="theme-subtext text-sm text-gray-500">Nenhuma aula completa dessa semana ainda</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {["Tutor", "Aulas", "Minutos", "USD/hora", "Valor a pagar", ""].map(h => (
                    <th key={h} className="text-left px-6 py-3 text-xs text-gray-500 font-medium uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.photo || `https://ui-avatars.com/api/?name=${encodeURIComponent(r.name)}&background=7c3aed&color=fff&size=40`}
                          alt={r.name} className="w-8 h-8 rounded-xl object-cover"
                        />
                        <span className="theme-heading font-medium text-white">{r.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-300">{r.lessonsCount}</td>
                    <td className="px-6 py-4 text-gray-300">{r.minutes.toFixed(0)} min</td>
                    <td className="px-6 py-4 text-gray-400">{fmtUSD(r.ratePerHour)}</td>
                    <td className="px-6 py-4">
                      <span className="theme-heading font-bold text-emerald-400">{fmtUSD(r.value)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => copyRow(r)} className="text-gray-500 hover:text-violet-400 transition-colors" title="Copiar essa linha">
                        <Copy className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="theme-subtext text-xs text-gray-500 mt-4">
        Valor calculado com a taxa que estava valendo NA HORA de cada aula (rate_applied), não a taxa atual do tutor —
        assim o cálculo continua correto mesmo se a taxa de algum tutor mudar no futuro.
      </p>
    </div>
  );
}
