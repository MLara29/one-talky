import React, { useState, useEffect, useRef } from "react";
import { LESSON_JOIN_GRACE_PERIOD_MS, LESSON_JOIN_WINDOW_BEFORE_MS, getLessonTimeStatus } from "@/lib/constants";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, DollarSign, Star, Users, AlertCircle, X, Bell, MessageSquare, Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import SupportModal from "@/components/support/SupportModal";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

function AutoDismissAlert({ children, onDismiss, className }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, []);
  return <div className={className}>{children}</div>;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

export default function TutorDashboard() {
  const { user } = useAuth();
  const lang = "en"; // Tutors always see the interface in English
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState(null);
  // upcomingAlert removido — era uma implementação duplicada do aviso "aula
  // em 5 minutos", com um bug: a lista de "já mostrados" (shownUpcomingRef)
  // vivia só na memória do componente e resetava toda vez que o tutor saía
  // e voltava pra essa página, fazendo o aviso repetir. O LessonReminderPopup
  // (montado globalmente no AppLayout) já cobre exatamente esse aviso, sem
  // esse problema — não precisa de duas implementações da mesma coisa.
  const [showSupport, setShowSupport] = useState(false);
  const prevLessonsRef = useRef([]);
  const shownLiveRef = useRef(new Set());
  const lessonsRef = useRef([]);
  const [tick, setTick] = useState(0);
  const today = new Date();
  const [calMonth, setCalMonth] = useState(today.getMonth());
  const [calYear, setCalYear] = useState(today.getFullYear());
  const [selectedCalDay, setSelectedCalDay] = useState(null);

  useEffect(() => { loadData(); }, [user]);

  useEffect(() => { lessonsRef.current = lessons; }, [lessons]);

  // Ticks every 30s normally, speeding up to every 1s while a lesson is within
  // its last 2 minutes before scheduled_at (live countdown) OR inside its
  // post-scheduled no-show grace window (negative countdown badge).
  useEffect(() => {
    let timeoutId;
    const scheduleTick = () => {
      const now = Date.now();
      const anyInGrace = lessonsRef.current.some(l => {
        if (l.status !== "scheduled" || !l.scheduled_at) return false;
        const diff = now - new Date(l.scheduled_at).getTime();
        return diff > -LESSON_JOIN_WINDOW_BEFORE_MS && diff <= LESSON_JOIN_GRACE_PERIOD_MS;
      });
      timeoutId = setTimeout(() => {
        setTick(n => n + 1);
        scheduleTick();
      }, anyInGrace ? 1000 : 30_000);
    };
    scheduleTick();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    const check = async () => {
      if (!user) return;
      try {
        const live = await base44.entities.Lesson.filter({ tutor_id: user.id, status: "in_progress" });
        const sched = await base44.entities.Lesson.filter({ tutor_id: user.id, status: "scheduled" });
        const allLessons = [...live, ...sched];

        // Live alert: só mostra pra aulas em andamento genuinamente recentes,
        // nunca vistas antes NESSA sessão do componente. O corte por tempo
        // (15 min desde que começou) é o que realmente evita o popup
        // reaparecer pra uma aula "presa" (esquecida, nunca fechada direito)
        // toda vez que o tutor sai da página e volta — sem esse corte, o
        // shownLiveRef sozinho não resolve, porque ele reseta a cada remount.
        const LIVE_ALERT_MAX_AGE_MS = 15 * 60 * 1000;
        const newLive = live.find(l => {
          if (shownLiveRef.current.has(l.id)) return false;
          if (!l.started_at) return true;
          return (Date.now() - new Date(l.started_at).getTime()) <= LIVE_ALERT_MAX_AGE_MS;
        });
        if (newLive) {
          shownLiveRef.current.add(newLive.id);
          setLiveAlert(newLive);
          toast({ title: "📞 Live lesson!", description: `${newLive.student_name} is waiting for you!` });
        }

        // Auto-dismiss liveAlert if lesson is no longer in_progress
        setLiveAlert(prev => {
          if (!prev) return null;
          const stillLive = live.find(l => l.id === prev.id);
          return stillLive ? prev : null;
        });

        prevLessonsRef.current = allLessons;
        setLessons(allLessons);
      } catch {}
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, [user]);



  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        const [live, sched] = await Promise.all([
          base44.entities.Lesson.filter({ tutor_id: user.id, status: "in_progress" }),
          base44.entities.Lesson.filter({ tutor_id: user.id, status: "scheduled" }),
        ]);
        const allLessons = [...live, ...sched];
        prevLessonsRef.current = allLessons;
        setLessons(allLessons);

        // Load student profiles for upcoming lessons
        const studentIds = [...new Set(allLessons.map(l => l.student_id).filter(Boolean))];
        if (studentIds.length > 0) {
          const res = await base44.functions.invoke('getMyStudentsProfiles', { student_ids: studentIds });
          const map = {};
          (res.data?.profiles || []).forEach(sp => { map[sp.user_id] = sp; });
          setStudentProfiles(map);
        }
      }
    } catch {} finally { setLoading(false); }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    const newVal = !profile.is_available_now;
    await base44.functions.invoke('updateMyProfile', { updates: { is_available_now: newVal } });
    setProfile({ ...profile, is_available_now: newVal });
  };

  const endActiveLesson = async (lesson) => {
    try {
      await base44.functions.invoke('endLesson', { lesson_id: lesson.id, is_recorded: false });
      setLessons(prev => prev.filter(l => l.id !== lesson.id));
      toast({ title: "Lesson ended" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="text-center py-24">
      <AlertCircle className="theme-muted-icon w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="theme-heading font-display font-bold text-white mb-1">Profile not found</h3>
      <p className="theme-subtext text-sm text-gray-500">Complete your tutor onboarding first.</p>
    </div>
  );

  if (profile.status === "pending") return (
    <div className="text-center py-24 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="theme-heading font-display text-2xl font-bold text-white mb-3">{t(lang, "appUnderReview")}</h2>
      <p className="theme-subtext text-gray-500 text-sm">{t(lang, "appUnderReviewDesc")}</p>
    </div>
  );

  if (profile.status === "rejected") return (
    <div className="text-center py-24 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="theme-heading font-display text-2xl font-bold text-white mb-3">{t(lang, "appNotApproved")}</h2>
      <p className="theme-subtext text-gray-500 text-sm">{t(lang, "appNotApprovedDesc")}</p>
    </div>
  );

  const stats = [
    { label: t(lang, "totalLessons"), value: profile.total_lessons || 0, icon: Users, gradient: "from-orange-500 to-amber-500" },
    { label: t(lang, "minutesTaught"), value: profile.total_minutes || 0, icon: Clock, gradient: "from-blue-500 to-cyan-500" },
    { label: t(lang, "rating"), value: profile.average_rating?.toFixed(1) || "N/A", icon: Star, gradient: "from-amber-400 to-orange-500" },
    { label: t(lang, "earnings"), value: `$${(profile.total_earnings || 0).toFixed(2)}`, icon: DollarSign, gradient: "from-emerald-500 to-teal-500" },
  ];

  const now = Date.now();

  // Só libera quando o aluno já entrou de verdade (status vira "in_progress"
  // só via startLesson, que só o aluno pode disparar) — não é mais baseado
  // em janela de tempo antes do horário marcado.
  const canJoinLesson = (l) => l.status === "in_progress";

  const isUpcoming = (l) => l.status === "in_progress" || !l.scheduled_at || new Date(l.scheduled_at).getTime() + LESSON_JOIN_GRACE_PERIOD_MS > now;
  const upcomingLessons = lessons.filter(isUpcoming).sort((a, b) => {
    if (a.status === "in_progress") return -1;
    if (b.status === "in_progress") return 1;
    return new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime();
  }).slice(0, 10);

  const lessonDayMap = {};
  lessons.forEach(l => {
    if (!l.scheduled_at) return;
    const date = new Date(l.scheduled_at);
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    if (!lessonDayMap[key]) lessonDayMap[key] = [];
    lessonDayMap[key].push(l);
  });
  const getDayLessons = (d) => lessonDayMap[`${calYear}-${calMonth}-${d}`];
  const calendarDays = buildCalendarDays(calYear, calMonth);
  const prevCalMonth = () => {
    if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1);
    setSelectedCalDay(null);
  };
  const nextCalMonth = () => {
    if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1);
    setSelectedCalDay(null);
  };

  return (
    <div>
      {liveAlert && (
        <AutoDismissAlert onDismiss={() => setLiveAlert(null)}
          className="mb-6 flex items-center justify-between gap-4 bg-gradient-to-r from-orange-500/20 to-orange-700/10 border border-orange-500/50 rounded-2xl px-5 py-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="font-semibold text-white text-sm">📞 {liveAlert.student_name} is calling!</p>
              <p className="text-xs text-orange-400">Live lesson — join now</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/classroom/${liveAlert.id}`}>
              <Button size="sm" className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/30">
                Join now
              </Button>
            </Link>
            <button onClick={() => setLiveAlert(null)} className="text-orange-300 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </AutoDismissAlert>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">
            {t(lang, "welcomeBack")}, {profile.full_name?.split(" ")[0]}
          </h1>
          <p className="theme-subtext text-gray-500 text-sm mt-1">{t(lang, "teachingOverview")}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowSupport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
          >
            <MessageSquare className="w-4 h-4" /> {t(lang, "speakWithSupport")}
          </button>
          <div className="theme-card flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
            <div className={`w-2.5 h-2.5 rounded-full ${profile.is_available_now ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
            <Label className="theme-subtext text-sm font-medium text-gray-500">{t(lang, "availableNowToggle")}</Label>
            <Switch checked={profile.is_available_now} onCheckedChange={toggleAvailability} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/8 transition-all">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 shadow-lg`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="theme-heading font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="theme-subtext text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
          <h2 className="theme-heading font-display font-bold text-white mb-5">{t(lang, "upcomingLessons")}</h2>
          {upcomingLessons.length === 0 ? (
            <p className="theme-subtext text-sm text-gray-500 py-6 text-center">{t(lang, "noUpcomingLessons")}</p>
          ) : (
            <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 440 }}>
              {upcomingLessons.map(l => {
                const sp = studentProfiles[l.student_id];
                return (
                  <div key={l.id} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="theme-heading font-semibold text-white">{l.student_name}</p>
                        <p className="theme-subtext text-sm text-gray-500 mt-0.5">
                          {l.language} · {l.status === "in_progress" ? t(lang, "liveNow") : new Date(l.scheduled_at).toLocaleString()}
                        </p>
                        {sp && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-300 font-medium capitalize">
                              {sp.level}
                            </span>
                            {sp.conversation_topics?.slice(0, 3).map(topic => (
                              <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                                {topic}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {l.scheduled_at && l.status !== "in_progress" && (() => {
                          const status = getLessonTimeStatus(l.scheduled_at, now);
                          if (!status.label) return null;
                          const cls = status.negative
                            ? "text-xs font-bold px-2.5 py-1 rounded-lg bg-ot-danger/10 border border-ot-danger/30 text-ot-danger animate-pulse tabular-nums"
                            : status.live
                              ? "text-xs font-bold px-2.5 py-1 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 tabular-nums"
                              : "text-xs text-gray-400 font-medium";
                          return <span className={cls}>{status.label}</span>;
                        })()}
                        {canJoinLesson(l) ? (
                          <Link to={`/classroom/${l.id}`}>
                            <Button size="sm" className={`text-white border-0 hover:scale-105 transition-transform shadow-lg ${l.status === "in_progress" ? "bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/20" : "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20"}`}>
                              {l.status === "in_progress" ? t(lang, "joinNow") : t(lang, "join")}
                            </Button>
                          </Link>
                        ) : null}
                        {l.status === "in_progress" && (
                          <button
                            onClick={() => endActiveLesson(l)}
                            className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 border border-red-500/20 transition-all hover:scale-105"
                            title="End lesson"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                        {l.status === "scheduled" && (
                          <Link to="/my-lessons" className="text-xs text-gray-500 hover:text-orange-400 hover:underline">
                            Manage in My Lessons →
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lessons Calendar — só desktop */}
        <div className="hidden lg:block theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="theme-heading font-display font-bold text-white">Lessons Calendar</h2>
            <div className="flex items-center gap-2">
              <button onClick={prevCalMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <ChevronLeft className="w-4 h-4 text-gray-400" />
              </button>
              <span className="text-sm font-semibold text-gray-300 min-w-[110px] text-center">{MONTH_NAMES[calMonth]} {calYear}</span>
              <button onClick={nextCalMonth} className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 mb-2">
            {DAY_LABELS.map(d => (
              <div key={d} className="text-center text-[10px] font-semibold uppercase tracking-wide py-1 text-gray-500">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`e-${idx}`} />;
              const dayLessons = getDayLessons(day);
              const isToday = calYear === today.getFullYear() && calMonth === today.getMonth() && day === today.getDate();
              const isSelected = selectedCalDay === day;
              return (
                <button
                  key={idx}
                  onClick={() => setSelectedCalDay(isSelected ? null : day)}
                  className={`relative flex flex-col items-start rounded-xl p-2 transition-all border
                    ${isSelected ? "bg-orange-600/20 border-orange-500/40" : dayLessons ? "bg-orange-500/10 border-orange-500/20 hover:bg-orange-500/15 cursor-pointer" : "border-white/5 hover:bg-white/5 cursor-default"}`}
                  style={{ minHeight: 60 }}
                >
                  <span className={`text-sm font-bold ${isToday ? "text-orange-400" : dayLessons ? "text-gray-300" : "text-gray-600"}`}>
                    {day}
                  </span>
                  {dayLessons && (
                    <p className="text-[10px] font-semibold mt-0.5" style={{ color: "#F26A1B" }}>{dayLessons.length} lesson{dayLessons.length !== 1 ? "s" : ""}</p>
                  )}
                </button>
              );
            })}
          </div>

          {selectedCalDay && getDayLessons(selectedCalDay) && (
            <div className="mt-5 pt-5 border-t border-white/10 space-y-3">
              {getDayLessons(selectedCalDay).map(l => {
                const sp = studentProfiles[l.student_id];
                return (
                  <div key={l.id} className="p-3 rounded-2xl bg-white/5 border border-white/5">
                    <p className="theme-heading font-semibold text-white text-sm">{l.student_name || "Student"}</p>
                    <p className="theme-subtext text-xs text-gray-500 mt-0.5">
                      {l.language} · {new Date(l.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {sp && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-300 font-medium capitalize">
                          {sp.level}
                        </span>
                        {sp.conversation_topics?.slice(0, 2).map(topic => (
                          <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                            {topic}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}