import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { X, AlertTriangle } from "lucide-react";

const STATUS_STYLES = {
  completed: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  no_show: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  cancelled: "bg-gray-500/15 text-gray-400 border-gray-500/25",
  scheduled: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  in_progress: "bg-violet-500/15 text-violet-400 border-violet-500/25",
};

const STATUS_LABELS = {
  completed: "Concluída",
  no_show: "Falta",
  cancelled: "Cancelada",
  scheduled: "Agendada",
  in_progress: "Em andamento",
};

function toInputDate(d) {
  return d.toISOString().slice(0, 10);
}

const SHORTCUTS = [
  { label: "Últimos 7 dias", days: 7 },
  { label: "Últimos 30 dias", days: 30 },
  { label: "Este mês", thisMonth: true },
  { label: "Tudo", all: true },
];

export default function TutorLedgerModal({ tutor, onClose }) {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState(toInputDate(new Date()));
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const load = useCallback(async (start, end) => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("getTutorLedger", {
        tutor_user_id: tutor.user_id,
        start_date: start || undefined,
        end_date: end || undefined,
      });
      setData(res.data);
    } catch {
      setData(null);
    }
    setLoading(false);
  }, [tutor.user_id]);

  useEffect(() => {
    // Default: last 30 days
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
    load(toInputDate(start), toInputDate(end));
  }, [load]);

  const applyShortcut = (s) => {
    if (s.all) {
      setStartDate("");
      setEndDate(toInputDate(new Date()));
      load("", toInputDate(new Date()));
      return;
    }
    const end = new Date();
    let start;
    if (s.thisMonth) {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else {
      start = new Date();
      start.setDate(start.getDate() - s.days);
    }
    setStartDate(toInputDate(start));
    setEndDate(toInputDate(end));
    load(toInputDate(start), toInputDate(end));
  };

  const applyCustomRange = () => load(startDate, endDate);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-950 border border-gray-200 dark:border-white/10 rounded-2xl w-full max-w-2xl max-h-[88vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-white/10 shrink-0">
          <div>
            <span className="text-gray-900 dark:text-white font-semibold text-sm">Extrato de aulas</span>
            <p className="text-xs text-gray-500">{tutor.full_name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-5 py-3 border-b border-gray-200 dark:border-white/10 shrink-0 space-y-2">
          <div className="flex flex-wrap gap-1.5">
            {SHORTCUTS.map((s) => (
              <button
                key={s.label}
                onClick={() => applyShortcut(s)}
                className="text-xs px-2.5 py-1 rounded-lg border bg-gray-100 dark:bg-white/5 border-gray-300 dark:border-white/10 text-gray-700 dark:text-gray-400 hover:border-violet-500/40 hover:text-violet-700 dark:hover:text-white transition-all"
              >
                {s.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs rounded-lg px-2 py-1.5"
            />
            <span className="text-gray-500 text-xs">até</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-gray-100 dark:bg-white/5 border border-gray-300 dark:border-white/10 text-gray-900 dark:text-white text-xs rounded-lg px-2 py-1.5"
            />
            <button
              onClick={applyCustomRange}
              className="text-xs px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-all"
            >
              Aplicar
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : !data ? (
            <p className="text-center text-sm text-gray-500 py-16">Erro ao carregar o extrato.</p>
          ) : (
            <>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 px-5 py-4 border-b border-gray-200 dark:border-white/10">
                <Stat label="Total" value={data.summary.total_lessons} />
                <Stat label="Concluídas" value={data.summary.completed_count} color="text-emerald-400" />
                <Stat label="Faltas" value={data.summary.no_show_count} color="text-amber-400" />
                <Stat label="Canceladas" value={data.summary.cancelled_count} color="text-gray-400" />
                <Stat label="Minutos" value={data.summary.total_minutes} />
                <Stat label="Ganho" value={`$${data.summary.total_earned.toFixed(2)}`} color="text-emerald-400" />
              </div>

              <div className="divide-y divide-gray-200 dark:divide-white/5">
                {data.lessons.length === 0 && (
                  <p className="text-center text-sm text-gray-500 py-12">Nenhuma aula neste período</p>
                )}
                {data.lessons.map((l) => (
                  <div key={l.id} className="flex items-center justify-between gap-3 px-5 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{l.student_name || "—"}</p>
                        {l.flagged_for_review && (
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" titleAccess="Duração capada por anomalia — revisar" />
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {l.scheduled_at ? new Date(l.scheduled_at).toLocaleString("pt-BR") : "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[l.status] || "bg-white/5 border-white/10 text-gray-400"}`}>
                        {STATUS_LABELS[l.status] || l.status}
                      </span>
                      <span className="text-xs text-gray-500 w-14 text-right">{l.duration_minutes || 0} min</span>
                      <span className="text-sm font-semibold text-emerald-400 w-16 text-right">
                        {l.earned_amount != null ? `$${l.earned_amount.toFixed(2)}` : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color = "text-gray-900 dark:text-white" }) {
  return (
    <div className="bg-gray-100 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl p-2.5 text-center">
      <p className={`text-sm font-bold ${color}`}>{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  );
}