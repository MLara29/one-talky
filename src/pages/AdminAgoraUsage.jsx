import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { RefreshCw, Mic, Video, Clock, AlertCircle } from "lucide-react";

const PRESETS = [
  { label: "Este mês", key: "month" },
  { label: "Últimos 7 dias", key: "7d" },
  { label: "Últimos 30 dias", key: "30d" },
  { label: "Personalizado", key: "custom" },
];

function getDateRange(preset) {
  const today = new Date();
  const fmt = (d) => d.toISOString().split("T")[0];
  if (preset === "month") {
    return { from: fmt(new Date(today.getFullYear(), today.getMonth(), 1)), to: fmt(today) };
  }
  if (preset === "7d") {
    const d = new Date(today); d.setDate(d.getDate() - 6);
    return { from: fmt(d), to: fmt(today) };
  }
  if (preset === "30d") {
    const d = new Date(today); d.setDate(d.getDate() - 29);
    return { from: fmt(d), to: fmt(today) };
  }
  return null;
}

function minutesAgo(iso) {
  if (!iso) return null;
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "agora mesmo";
  if (diff === 1) return "1 min atrás";
  return `${diff} min atrás`;
}

export default function AdminAgoraUsage() {
  const [preset, setPreset] = useState("month");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      const range = preset === "custom"
        ? { from: customFrom, to: customTo }
        : getDateRange(preset);

      if (!range || !range.from || !range.to) {
        setError("Selecione um período válido.");
        setLoading(false);
        return;
      }

      const res = await base44.functions.invoke("agoraUsage", {
        from_date: range.from,
        to_date: range.to,
        force_refresh: forceRefresh,
      });
      setData(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Erro ao buscar dados.");
    } finally {
      setLoading(false);
    }
  }, [preset, customFrom, customTo]);

  useEffect(() => { fetch(false); }, [fetch]);

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="rounded-2xl p-5 flex items-center gap-4" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs font-medium mb-0.5" style={{ color: "var(--app-text-secondary)" }}>{label}</p>
        <p className="text-2xl font-bold font-display" style={{ color: "var(--app-text-primary)" }}>{value.toLocaleString()}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--app-text-muted)" }}>minutos</p>
      </div>
    </div>
  );

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold" style={{ color: "var(--app-text-primary)" }}>
            Uso Agora.io
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--app-text-secondary)" }}>
            Consumo de minutos de áudio e vídeo via API oficial da Agora
          </p>
        </div>
        <Button
          onClick={() => fetch(true)}
          disabled={loading}
          className="shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Period selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPreset(p.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              preset === p.key
                ? "bg-violet-500/20 border-violet-500/30 text-violet-400"
                : "border-transparent text-gray-400 hover:bg-white/5"
            }`}
            style={{ background: preset === p.key ? undefined : "var(--app-card-bg)" }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="flex flex-wrap gap-3 mb-6">
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--app-text-secondary)" }}>De</label>
            <Input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              className="w-40" style={{ background: "var(--app-card-bg)", borderColor: "var(--app-border)", color: "var(--app-text-primary)" }} />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1" style={{ color: "var(--app-text-secondary)" }}>Até</label>
            <Input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              className="w-40" style={{ background: "var(--app-card-bg)", borderColor: "var(--app-border)", color: "var(--app-text-primary)" }} />
          </div>
        </div>
      )}

      {/* Cache info */}
      {data?.fetched_at && (
        <p className="text-xs mb-4 flex items-center gap-1.5" style={{ color: "var(--app-text-muted)" }}>
          <Clock className="w-3 h-3" />
          {data.from_cache ? "Dados em cache" : "Dados atualizados"} · {minutesAgo(data.fetched_at)}
          {data.project_id_used && <span className="ml-2">· Project ID: {data.project_id_used}</span>}
        </p>
      )}

      {/* App ID currently in use by this app, for comparison against the Agora console */}
      {import.meta.env.VITE_AGORA_APP_ID && (
        <p className="text-xs mb-6" style={{ color: "var(--app-text-muted)" }}>
          App ID em uso neste app: <span className="font-mono">{import.meta.env.VITE_AGORA_APP_ID}</span>
        </p>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl p-4 mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/20">
          <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      )}

      {data && (
        <>
          {/* Stat cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            <StatCard icon={Mic} label="Total Áudio" value={data.total_audio_minutes} color="bg-violet-500/15 text-violet-400" />
            <StatCard icon={Video} label="Total Vídeo" value={data.total_video_minutes} color="bg-blue-500/15 text-blue-400" />
          </div>

          {/* Chart */}
          {data.usages?.length > 0 ? (
            <div className="rounded-2xl p-5" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
              <h2 className="font-display font-bold text-base mb-4" style={{ color: "var(--app-text-primary)" }}>Consumo por dia</h2>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.usages} barSize={14} barGap={4}>
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 11, fill: "var(--app-text-muted)" }}
                    tickFormatter={d => d?.slice(5)} // MM-DD
                    axisLine={false} tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "var(--app-text-muted)" }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "var(--app-text-primary)", fontWeight: 600 }}
                    formatter={(v, name) => [`${v} min`, name]}
                  />
                  <Legend wrapperStyle={{ fontSize: 12, paddingTop: 12 }} />
                  <Bar dataKey="audio_minutes" name="Áudio" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="video_hd_minutes" name="Vídeo HD" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="video_1080p_minutes" name="Vídeo 1080p" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="rounded-2xl p-8 text-center" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
              <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>Nenhum dado de uso encontrado para este período.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}