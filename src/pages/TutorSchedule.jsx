import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Clock, Info } from "lucide-react";

// Availability is stored as { "Monday": ["08:00","09:00",...], ... }
// This is the format ScheduleModal reads to convert tutor-tz → student-tz
const DAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
// 30-minute slots from 06:00 to 23:30
const HOURS = [];
for (let h = 6; h < 24; h++) {
  HOURS.push(`${String(h).padStart(2, "0")}:00`);
  HOURS.push(`${String(h).padStart(2, "0")}:30`);
}

const WEEKDAY_SHORT_PT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES_PT = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstWeekday(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

// Given a JS Date, return the English weekday name in the tutor's OWN timezone
// (because availability is keyed by the tutor's local weekday)
function getDayNameInTz(date, tz) {
  if (!tz) return DAYS_EN[date.getDay()];
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(date);
}

export default function TutorSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // { "Monday": ["06:00",...], "Tuesday": [...], ... }
  const [availability, setAvailability] = useState({});

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // JS Date

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const p = profiles[0];
        if (!p.timezone) {
          const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
          await base44.entities.TutorProfile.update(p.id, { timezone: tz });
          p.timezone = tz;
        }
        setProfile(p);
        setAvailability(p.availability || {});
      }
    } catch {} finally { setLoading(false); }
  };

  // The tutor's timezone (saved on profile)
  const tutorTz = profile?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // For a given JS Date, get the weekday name AS SEEN IN THE TUTOR'S TIMEZONE
  const getDayKey = (date) => getDayNameInTz(date, tutorTz);

  const toggleHour = (hour) => {
    if (!selectedDate) return;
    const dayKey = getDayKey(selectedDate);
    setAvailability(prev => {
      const slots = prev[dayKey] || [];
      const updated = slots.includes(hour)
        ? slots.filter(h => h !== hour)
        : [...slots, hour].sort();
      return { ...prev, [dayKey]: updated };
    });
  };

  // How many hours configured for a given calendar date
  const getHoursForDate = (date) => {
    const dayKey = getDayKey(date);
    return availability[dayKey] || [];
  };

  const saveSchedule = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await base44.entities.TutorProfile.update(profile.id, { availability });
      toast({ title: "Agenda salva! ✅", description: "Seus horários foram atualizados com sucesso." });
    } catch (err) {
      toast({ title: "Erro ao salvar", description: err?.message || "Tente novamente.", variant: "destructive" });
    } finally { setSaving(false); }
  };

  const toggleAvailableNow = async () => {
    if (!profile) return;
    await base44.entities.TutorProfile.update(profile.id, { is_available_now: !profile.is_available_now });
    setProfile({ ...profile, is_available_now: !profile.is_available_now });
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekday(viewYear, viewMonth);
  const todayStr = today.toDateString();

  const selectedDayKey = selectedDate ? getDayKey(selectedDate) : null;
  const selectedSlots = selectedDayKey ? (availability[selectedDayKey] || []) : [];

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const canGoPrev = viewYear > today.getFullYear() || viewMonth > today.getMonth();

  // Total hours configured this month (unique days × hours, but since it's weekly, show total unique slots)
  const totalSlots = Object.values(availability).reduce((sum, arr) => sum + (arr?.length || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">Minha Agenda</h1>
          <p className="theme-subtext text-gray-500 text-sm mt-1">
            Defina sua disponibilidade semanal
          </p>
        </div>
        <div className="theme-card flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
          <div className={`w-2.5 h-2.5 rounded-full ${profile?.is_available_now ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
          <Label className="theme-subtext text-sm font-medium text-gray-500">Disponível agora</Label>
          <Switch checked={profile?.is_available_now} onCheckedChange={toggleAvailableNow} />
        </div>
      </div>

      {/* Timezone info banner */}
      <div className="mb-5 flex items-start gap-2 px-4 py-3 rounded-2xl bg-violet-500/10 border border-violet-500/20">
        <Info className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
        <p className="text-xs text-violet-300">
          Seus horários são salvos no seu fuso horário:{" "}
          <strong className="text-violet-200">{tutorTz}</strong>. Os alunos verão os horários convertidos automaticamente para o fuso deles.
          {totalSlots > 0 && <span className="ml-2 text-violet-400">· {totalSlots} horário{totalSlots > 1 ? "s" : ""} configurado{totalSlots > 1 ? "s" : ""} na semana</span>}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} disabled={!canGoPrev}
              className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white disabled:opacity-30">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <p className="theme-heading font-semibold text-white text-lg">
              {MONTH_NAMES_PT[viewMonth]} {viewYear}
            </p>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAY_SHORT_PT.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`e-${i}`} />)}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const date = new Date(viewYear, viewMonth, day);
              const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isToday = date.toDateString() === todayStr;
              const isSelected = selectedDate?.toDateString() === date.toDateString();
              const hours = getHoursForDate(date);
              const hasSlots = hours.length > 0;

              return (
                <button
                  key={day}
                  onClick={() => !isPast && setSelectedDate(isSelected ? null : date)}
                  disabled={isPast}
                  className={`
                    relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all
                    ${isPast ? "opacity-25 cursor-not-allowed" : "cursor-pointer"}
                    ${isSelected
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30 scale-105"
                      : isToday
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-300 hover:bg-violet-500/30"
                        : hasSlots
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                          : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <span>{day}</span>
                  {hasSlots && (
                   <span className="text-[9px] font-normal opacity-80">{hours.length}×</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-emerald-500/20 border border-emerald-500/30" />
              Com horários
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-violet-600" />
              Selecionado
            </div>
            <div className="flex items-center gap-1.5 text-xs text-gray-500">
              <div className="w-3 h-3 rounded-sm bg-white/5 border border-white/10" />
              Sem horários
            </div>
          </div>
        </div>

        {/* Hours panel */}
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5">
          {!selectedDate ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <Clock className="w-8 h-8 text-violet-400" />
              </div>
              <p className="theme-heading font-semibold text-white">Selecione um dia</p>
              <p className="theme-subtext text-sm text-gray-500 max-w-[220px]">
                Clique em um dia para definir os horários disponíveis. Dias da mesma semana compartilham a mesma configuração.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-4">
                <p className="theme-heading font-semibold text-white text-lg">
                  {selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Disponibilidade para toda <strong className="text-violet-400">{
                    new Intl.DateTimeFormat("pt-BR", { timeZone: tutorTz, weekday: "long" }).format(selectedDate)
                  }s</strong> · {selectedSlots.length === 0 ? "Nenhum horário" : `${selectedSlots.length} slot${selectedSlots.length > 1 ? "s" : ""} de 30min`}
                </p>
              </div>

              <div className="grid grid-cols-4 gap-2 max-h-[380px] overflow-y-auto pr-1">
                {HOURS.map(hour => {
                  const active = selectedSlots.includes(hour);
                  return (
                    <button
                      key={hour}
                      onClick={() => toggleHour(hour)}
                      className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                        active
                          ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                          : "bg-white/5 border border-white/10 text-gray-400 hover:bg-violet-500/10 hover:border-violet-500/20 hover:text-violet-300"
                      }`}
                    >
                      {hour}
                    </button>
                  );
                })}
              </div>

              {selectedSlots.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-xs text-gray-500 mb-2">Horários selecionados (no seu fuso):</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedSlots.map(h => (
                      <span key={h} className="text-xs bg-emerald-500/15 border border-emerald-500/25 text-emerald-400 px-2 py-0.5 rounded-lg">
                        {h}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          onClick={saveSchedule}
          disabled={saving}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20 hover:scale-105 transition-all"
        >
          {saving ? "Salvando..." : "Salvar agenda"}
        </Button>
      </div>
    </div>
  );
}