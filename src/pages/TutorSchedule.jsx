import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";

// Hours shown in the day detail panel
const HOURS = Array.from({ length: 18 }, (_, i) => `${(i + 6).toString().padStart(2, "0")}:00`);

const WEEKDAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTH_NAMES = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"
];

// key format used to store availability: "YYYY-MM-DD"
function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstWeekday(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun
}

export default function TutorSchedule() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // availability: { "YYYY-MM-DD": ["06:00", "07:00", ...], ... }
  const [availability, setAvailability] = useState({});

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState(null); // "YYYY-MM-DD" or null

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

  const toggleHour = (hour) => {
    if (!selectedDate) return;
    setAvailability(prev => {
      const slots = prev[selectedDate] || [];
      const updated = slots.includes(hour)
        ? slots.filter(h => h !== hour)
        : [...slots, hour].sort();
      return { ...prev, [selectedDate]: updated };
    });
  };

  const saveSchedule = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      await base44.entities.TutorProfile.update(profile.id, { availability });
      toast({ title: "Agenda salva! ✅" });
    } catch { toast({ title: "Erro ao salvar", variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const toggleAvailableNow = async () => {
    if (!profile) return;
    await base44.entities.TutorProfile.update(profile.id, { is_available_now: !profile.is_available_now });
    setProfile({ ...profile, is_available_now: !profile.is_available_now });
  };

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

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstWeekday = getFirstWeekday(viewYear, viewMonth);
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());

  const selectedSlots = selectedDate ? (availability[selectedDate] || []) : [];

  // Count total available hours this month
  const monthKeys = Object.keys(availability).filter(k => k.startsWith(`${viewYear}-${String(viewMonth + 1).padStart(2, "0")}`));
  const totalHoursThisMonth = monthKeys.reduce((sum, k) => sum + (availability[k]?.length || 0), 0);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">Minha Agenda</h1>
          <p className="theme-subtext text-gray-500 text-sm mt-1">
            Selecione os dias e horários em que você está disponível
          </p>
        </div>
        <div className="theme-card flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
          <div className={`w-2.5 h-2.5 rounded-full ${profile?.is_available_now ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
          <Label className="theme-subtext text-sm font-medium text-gray-500">Disponível agora</Label>
          <Switch checked={profile?.is_available_now} onCheckedChange={toggleAvailableNow} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Calendar */}
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5">
          {/* Month navigation */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <p className="theme-heading font-semibold text-white text-lg">
                {MONTH_NAMES[viewMonth]} {viewYear}
              </p>
              {totalHoursThisMonth > 0 && (
                <p className="text-xs text-violet-400 mt-0.5">{totalHoursThisMonth}h disponíveis este mês</p>
              )}
            </div>
            <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-gray-400 hover:text-white">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-2">
            {WEEKDAY_LABELS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-1">{d}</div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells for offset */}
            {Array.from({ length: firstWeekday }).map((_, i) => <div key={`empty-${i}`} />)}

            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
              const key = dateKey(viewYear, viewMonth, day);
              const slots = availability[key] || [];
              const hasSlots = slots.length > 0;
              const isToday = key === todayKey;
              const isSelected = key === selectedDate;
              const isPast = key < todayKey;

              return (
                <button
                  key={day}
                  onClick={() => !isPast && setSelectedDate(isSelected ? null : key)}
                  disabled={isPast}
                  className={`
                    relative aspect-square rounded-xl flex flex-col items-center justify-center text-sm font-semibold transition-all
                    ${isPast ? "opacity-30 cursor-not-allowed" : "cursor-pointer"}
                    ${isSelected
                      ? "bg-violet-600 text-white shadow-lg shadow-violet-500/30"
                      : isToday
                        ? "bg-violet-500/20 border border-violet-500/40 text-violet-300"
                        : hasSlots
                          ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25"
                          : "bg-white/5 border border-white/5 text-gray-400 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  <span>{day}</span>
                  {hasSlots && !isSelected && (
                    <span className="text-[9px] font-normal mt-0.5 opacity-80">{slots.length}h</span>
                  )}
                  {isSelected && hasSlots && (
                    <span className="text-[9px] font-normal mt-0.5 opacity-80">{slots.length}h</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-white/5">
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
              Livre
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
                Clique em um dia no calendário para definir seus horários disponíveis
              </p>
            </div>
          ) : (
            <>
              <div className="mb-5">
                <p className="theme-heading font-semibold text-white text-lg">
                  {new Date(selectedDate + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {selectedSlots.length === 0
                    ? "Nenhum horário selecionado"
                    : `${selectedSlots.length} horário${selectedSlots.length > 1 ? "s" : ""} selecionado${selectedSlots.length > 1 ? "s" : ""}`}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 max-h-[420px] overflow-y-auto pr-1">
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
                  <p className="text-xs text-gray-500 mb-2">Horários confirmados:</p>
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