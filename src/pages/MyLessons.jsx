import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Calendar, Clock, CheckCircle, Settings2, AlertTriangle } from "lucide-react";
import { getLanguageLabel, LESSON_JOIN_GRACE_PERIOD_MS, LESSON_JOIN_WINDOW_BEFORE_MS, getLessonTimeStatus } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import CancelRescheduleModal from "@/components/lessons/CancelRescheduleModal";
import StudentCancelModal from "@/components/lessons/StudentCancelModal";
import RescheduleRequestCard from "@/components/lessons/RescheduleRequestCard";
import { safeSubscribe } from "@/lib/safeSubscribe";

export default function MyLessons() {
  const { user } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managingLesson, setManagingLesson] = useState(null);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancellingLesson, setCancellingLesson] = useState(null);
  const [pendingRequests, setPendingRequests] = useState({});
  const [tick, setTick] = useState(0);
  const [busyTutors, setBusyTutors] = useState({});
  const [onlineTutors, setOnlineTutors] = useState({});
  const waitingMarkedRef = useRef(new Set());
  const lessonsRef = useRef(lessons);

  const T = (key) => t(lang, key);

  useEffect(() => { lessonsRef.current = lessons; }, [lessons]);

  // Tick to refresh countdown and join button visibility — ticks every 30s
  // normally, but speeds up to every 1s while a lesson is in its post-scheduled
  // no-show grace window (negative countdown), then slows back down.
  useEffect(() => {
    let timeoutId;
    const scheduleTick = () => {
      const now = Date.now();
      const anyInGrace = lessonsRef.current.some(l => {
        if (l.status !== "scheduled" || !l.scheduled_at) return false;
        const diff = now - new Date(l.scheduled_at).getTime();
        return diff > 0 && diff <= LESSON_JOIN_GRACE_PERIOD_MS;
      });
      timeoutId = setTimeout(() => {
        setTick(n => n + 1);
        scheduleTick();
      }, anyInGrace ? 1000 : 30_000);
    };
    scheduleTick();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => { loadData(); }, [user]);

  // Real-time refresh for LessonChangeRequest (proposals accepted/rejected/new message)
  useEffect(() => {
    if (!user) return;
    return safeSubscribe(() => base44.entities.LessonChangeRequest.subscribe((event) => {
      const r = event.data;
      if (!r) return;
      if (user.role === "tutor" && r.tutor_id !== user.id) return;
      if (user.role === "student" && r.student_id !== user.id) return;
      loadPendingRequests();
      loadData(); // sempre recarrega — leituras leves, sem depender de event.type
    }));
  }, [user?.id, user?.role]);

  const loadPendingRequests = async () => {
    if (!user) return;
    try {
      let requests = [];
      if (user.role === "tutor") {
        requests = await base44.entities.LessonChangeRequest.filter({ tutor_id: user.id, status: "pending" });
      } else if (user.role === "student") {
        requests = await base44.entities.LessonChangeRequest.filter({ student_id: user.id, status: "pending" });
      }
      const map = {};
      requests.forEach(r => { map[r.lesson_id] = r; });
      setPendingRequests(map);
    } catch {}
  };

  // Real-time refresh for tutors
  useEffect(() => {
    if (user?.role !== "tutor") return;
    const unsubscribe = base44.entities.Lesson.subscribe((event) => {
      if (event.type === "create" && event.data?.tutor_id === user.id) {
        setLessons(prev => {
          if (prev.find(l => l.id === event.data.id)) return prev;
          return [event.data, ...prev];
        });
      }
      if ((event.type === "update" || event.type === "delete") && event.data?.tutor_id === user.id) {
        setLessons(prev => prev.map(l => l.id === event.data.id ? { ...l, ...event.data } : l));
      }
    });
    return unsubscribe;
  }, [user?.id, user?.role]);

  const loadData = async () => {
    try {
      let data;
      if (user?.role === "tutor") {
        data = await base44.entities.Lesson.filter({ tutor_id: user.id }, "-created_date");
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setTutorProfile(profiles[0]);
      } else {
        data = await base44.entities.Lesson.filter({ student_id: user.id }, "-created_date");
      }
      setLessons(data || []);
      loadPendingRequests();
    } catch {} finally { setLoading(false); }
  };

  const handleStudentCancel = async (message) => {
    if (!cancellingLesson) return;
    setActionLoading(true);
    try {
      const response = await base44.functions.invoke('cancelLesson', { lesson_id: cancellingLesson.id, message });
      if (response.data?.error) throw new Error(response.data.error);
      setLessons(prev => prev.map(l => l.id === cancellingLesson.id ? { ...l, status: "cancelled" } : l));
      setCancellingLesson(null);
      toast({ title: T("cancelLesson"), description: message ? T("msgToTutor") : "" });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Please try again.";
      toast({ title: "Error cancelling", description: msg, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleCancel = async (message) => {
    if (!managingLesson) return;
    setActionLoading(true);
    try {
      const response = await base44.functions.invoke('cancelLesson', { lesson_id: managingLesson.id, message });
      if (response.data?.error) throw new Error(response.data.error);
      setLessons(prev => prev.map(l => l.id === managingLesson.id ? { ...l, status: "cancelled" } : l));
      setManagingLesson(null);
      toast({ title: "Lesson cancelled", description: message ? "Message sent to student." : "" });
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Please try again.";
      toast({ title: "Error cancelling", description: msg, variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReschedule = async (newScheduledAt, message) => {
    if (!managingLesson) return false;
    setActionLoading(true);
    try {
      const response = await base44.functions.invoke('proposeReschedule', { lesson_id: managingLesson.id, proposed_scheduled_at: newScheduledAt, message });
      if (response.data?.error) throw new Error(response.data.error);
      // Lesson stays at original time — don't update scheduled_at.
      // Refresh pending requests so the card shows up on the lesson.
      loadPendingRequests();
      toast({ title: "Proposta enviada! 📅", description: "Aguardando resposta do aluno." });
      return true;
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Please try again.";
      toast({ title: "Error proposing reschedule", description: msg, variant: "destructive" });
      return false;
    } finally { setActionLoading(false); }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const now = Date.now(); // refreshes on tick
  const upcoming = lessons
    .filter(l => l.status === "scheduled" && (!l.scheduled_at || new Date(l.scheduled_at).getTime() + LESSON_JOIN_GRACE_PERIOD_MS > now))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const completed = lessons.filter(l => l.status === "completed" || l.status === "no_show");
  const inProgress = lessons.filter(l => l.status === "in_progress");

  const canJoin = (l) => {
    if (!l.scheduled_at) return true;
    return new Date(l.scheduled_at).getTime() - now <= LESSON_JOIN_WINDOW_BEFORE_MS;
  };

  // Checa se o tutor está em outra aula ativa e se está online — só para
  // alunos, e só para aulas que já estão na janela de "pode entrar" (canJoin).
  // Reverifica a cada 20s para que o botão apareça assim que o tutor ficar
  // pronto. Enquanto o tutor não estiver pronto (offline ou ocupado), marca
  // silenciosamente que o aluno está esperando essa aula (uma vez só por
  // aula) — isso é o que permite ao sistema de no-show culpar o tutor
  // corretamente mesmo quando o botão de entrar nunca chega a aparecer.
  const ONLINE_THRESHOLD_MS = 90 * 1000;
  useEffect(() => {
    if (user?.role !== "student") return;

    const checkTutorReadiness = () => {
      const lessonsToCheck = lessons.filter(l =>
        canJoin(l) && l.status === "scheduled" && l.tutor_id
      );
      lessonsToCheck.forEach(async (l) => {
        try {
          const [busyRes, tutorProfiles] = await Promise.all([
            base44.functions.invoke("checkTutorBusy", { tutor_id: l.tutor_id }),
            base44.entities.TutorProfile.filter({ user_id: l.tutor_id }),
          ]);
          const busy = busyRes.data?.busy || false;
          const tp = tutorProfiles[0];
          const online = tp?.last_seen && (Date.now() - new Date(tp.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
          setBusyTutors(prev => ({ ...prev, [l.tutor_id]: busy }));
          setOnlineTutors(prev => ({ ...prev, [l.tutor_id]: online }));

          const ready = online && !busy;
          if (!ready && !waitingMarkedRef.current.has(l.id)) {
            waitingMarkedRef.current.add(l.id);
            base44.functions.invoke("markStudentWaiting", { lesson_id: l.id }).catch(() => {});
          }
        } catch { /* falha silenciosa, não bloqueia nada */ }
      });
    };

    checkTutorReadiness(); // checagem imediata
    const interval = setInterval(checkTutorReadiness, 20000); // reverifica a cada 20s
    return () => clearInterval(interval);
  }, [lessons, user?.role]);

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-4">
        {user?.role === "student" ? T("myLessons") : "My Lessons"}
      </h1>

      {user?.role === "student" && (
        <div className="mb-4 space-y-2">
          {/* Cancellation policy */}
          <div className="flex gap-2 items-start rounded-2xl p-4 text-sm" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F26A1B" }} />
            <span style={{ color: "var(--app-text-primary)" }}>
              <strong style={{ color: "#F26A1B" }}>{T("cancelPolicy")}:</strong>{" "}
              {T("cancelPolicyText")}
            </span>
          </div>
          {/* No-show policy */}
          <div className="flex gap-2 items-start rounded-2xl p-4 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span style={{ color: "var(--app-text-primary)" }}>
              <strong className="text-red-400">{T("noShowPolicy")}:</strong>{" "}
              {T("noShowPolicyText")}
            </span>
          </div>
        </div>
      )}

      {user?.role === "tutor" && (
        <div className="mb-4 space-y-2">
          {/* Cancellation policy — tutor side */}
          <div className="flex gap-2 items-start rounded-2xl p-4 text-sm" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F26A1B" }} />
            <span style={{ color: "var(--app-text-primary)" }}>
              <strong style={{ color: "#F26A1B" }}>Cancellation policy:</strong>{" "}
              You may cancel a scheduled lesson up to 2 hours before its start time without penalty — just make sure to notify the student.
            </span>
          </div>
          {/* No-show policy — tutor side */}
          <div className="flex gap-2 items-start rounded-2xl p-4 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span style={{ color: "var(--app-text-primary)" }}>
              <strong className="text-red-400">No-show policy:</strong>{" "}
              3 no-shows without advance cancellation result in a 7-day suspension from scheduled bookings (instant lessons still allowed). A further no-show after that leads to permanent ban and contract termination.
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            {user?.role === "student" ? T("upcomingTab") : "Upcoming"} ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            {user?.role === "student" ? T("completedTab") : "Completed"} ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {inProgress.length > 0 && (
            <div className="mb-4 space-y-3">
              {inProgress.map(l => (
                <div key={l.id} className="theme-card bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="theme-heading font-semibold text-white">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="theme-subtext text-sm text-gray-500">{getLanguageLabel(l.language)} · {user?.role === "student" ? T("inProgress") : "In progress"}</p>
                    </div>
                  </div>
                  <Link to={`/classroom/${l.id}`}>
                    <Button size="sm" className="bg-blue-500 text-white hover:bg-blue-600 border-0">
                      {user?.role === "student" ? T("rejoinBtn") : "Rejoin"}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
          {upcoming.length === 0 ? (
            <div className="theme-empty text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
              <Calendar className="theme-muted-icon w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="theme-heading font-display font-bold text-white mb-1">
                {user?.role === "student" ? T("noUpcomingLessons2") : "No upcoming lessons"}
              </h3>
              <p className="theme-subtext text-sm text-gray-600 mb-5">
                {user?.role === "student" ? T("noUpcomingLessonsSub") : ""}
              </p>
              {user?.role === "student" && (
                <Link to="/dashboard">
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0">
                    {T("findTutors")}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(l => (
                <div key={l.id} className="space-y-2">
                  {pendingRequests[l.id] && (
                    <RescheduleRequestCard
                      lesson={l}
                      request={pendingRequests[l.id]}
                      onResolved={() => { loadPendingRequests(); loadData(); }}
                    />
                  )}
                  <div className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
                  {user?.role === "student" && canJoin(l) && l.status === "scheduled" && busyTutors[l.tutor_id] && (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3"
                      style={{ background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.2)" }}>
                      <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="text-xs text-amber-500">
                        Seu tutor está terminando outra aula. Aguarde um instante antes de entrar.
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-violet-400" />
                      <div>
                        <p className="theme-heading font-semibold text-white">
                          {user?.role === "tutor" ? l.student_name : l.tutor_name}
                        </p>
                        <p className="theme-subtext text-sm text-gray-500">
                          {getLanguageLabel(l.language)} · {l.scheduled_at ? new Date(l.scheduled_at).toLocaleDateString() : ""}
                          {l.scheduled_at ? " · " + new Date(l.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {canJoin(l) && (
                        <Link to={`/classroom/${l.id}`}>
                          <Button size="sm" className="bg-orange-500 text-white hover:bg-orange-600 border-0">
                            {user?.role === "student" ? T("joinBtn") : "Join"}
                          </Button>
                        </Link>
                      )}
                      {user?.role === "tutor" && (
                        <Button size="sm" variant="outline" onClick={() => setManagingLesson(l)}>
                          Manage
                        </Button>
                      )}
                      {user?.role === "student" && (
                        <Button size="sm" variant="outline" onClick={() => setCancellingLesson(l)}>
                          {T("cancelBtn")}
                        </Button>
                      )}
                    </div>
                  </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completed.length === 0 ? (
            <div className="theme-empty text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
              <CheckCircle className="theme-muted-icon w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="theme-heading font-display font-bold text-white mb-1">
                {user?.role === "student" ? T("noCompletedLessons") : "No completed lessons yet"}
              </h3>
              <p className="theme-subtext text-sm text-gray-600">
                {user?.role === "student" ? T("noCompletedLessonsSub") : "Your lesson history will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map(l => (
                <div key={l.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/8 transition-all">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="theme-heading font-semibold text-white">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                        {l.status === "no_show" && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400">
                            {T("noShowBadge")}
                          </span>
                        )}
                      </div>
                      <p className="theme-subtext text-sm text-gray-500">{getLanguageLabel(l.language)} · {l.duration_minutes || 0} min{l.is_recorded && " · Recorded"}</p>
                    </div>
                  </div>
                  <div className="theme-subtext flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3 h-3" /> {new Date(l.ended_at || l.created_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {cancellingLesson && (
        <StudentCancelModal
          lesson={cancellingLesson}
          onClose={() => setCancellingLesson(null)}
          onCancel={handleStudentCancel}
          loading={actionLoading}
          lang={lang}
        />
      )}

      {managingLesson && (
        <CancelRescheduleModal
          lesson={managingLesson}
          tutorAvailability={tutorProfile?.availability}
          bookedSlots={tutorProfile?.booked_slots}
          onClose={() => setManagingLesson(null)}
          onCancel={handleCancel}
          onReschedule={handleReschedule}
          loading={actionLoading}
        />
      )}
    </div>
  );
}