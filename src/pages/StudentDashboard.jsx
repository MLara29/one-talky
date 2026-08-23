import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Search, X, MessageSquare, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import TutorCard from "@/components/tutors/TutorCard";
import CreditsBanner from "@/components/student/CreditsBanner";
import SupportModal from "@/components/support/SupportModal";
import { isFirstWeekActive } from "@/lib/firstWeekWindow";
import { LESSON_JOIN_GRACE_PERIOD_MS, LESSON_JOIN_WINDOW_BEFORE_MS, getLessonTimeStatus } from "@/lib/constants";

const UPCOMING_CARD_WINDOW_MS = 5 * 60 * 1000; // card aparece a partir de 5min antes
const ONLINE_THRESHOLD_MS = 90 * 1000;

export default function StudentDashboard() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [tutors, setTutors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [tick, setTick] = useState(0);

  // Aula agendada prestes a começar (aparece 5min antes) + prontidão do tutor dela
  const [upcomingLesson, setUpcomingLesson] = useState(null);
  const [upcomingTutorReady, setUpcomingTutorReady] = useState(false);
  const [upcomingTutorBusy, setUpcomingTutorBusy] = useState(false);
  const upcomingLessonRef = useRef(null);
  const waitingMarkedRef = useRef(new Set());

  useEffect(() => { loadData(); }, [user]);
  useEffect(() => { upcomingLessonRef.current = upcomingLesson; }, [upcomingLesson]);

  // Mantém os minutos do card de créditos sempre atualizados em tempo real —
  // sem isso, se o aluno gastar minutos numa aula (em outra tela) e voltar
  // pro dashboard sem recarregar a página, o número ficava desatualizado.
  useEffect(() => {
    if (!user?.id) return;
    const unsub = base44.entities.StudentProfile.subscribe((event) => {
      if (event.type === 'update' && event.data?.user_id === user.id) {
        setProfile(prev => (prev ? { ...prev, ...event.data } : event.data));
      }
    });
    return () => unsub();
  }, [user?.id]);

  // Realtime: update tutor cards when availability or rating changes
  useEffect(() => {
    const unsubTutor = base44.entities.TutorProfile.subscribe((event) => {
      if (event.type === 'update') {
        setTutors(prev =>
          prev
            .map(t => t.id === event.data.id ? { ...t, ...event.data } : t)
            // status "hidden" (ou qualquer não-aprovado) sai da lista assim
            // que o admin muda em tempo real, sem precisar recarregar a página.
            .filter(t => Boolean(t.photo_url) && t.status === "approved")
        );
      } else if (event.type === 'create') {
        if (event.data.photo_url && event.data.status === "approved") {
          setTutors(prev => [...prev, event.data]);
        }
      } else if (event.type === 'delete') {
        setTutors(prev => prev.filter(t => t.id !== event.data.id));
      }
    });
    // When a new review is created, reload tutor list so ratings refresh
    const unsubReview = base44.entities.Review.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        base44.entities.TutorProfile.filter({ status: "approved" }).then(data => setTutors(data.filter(t => Boolean(t.photo_url)))).catch(() => {});
      }
    });
    return () => { unsubTutor(); unsubReview(); };
  }, []);

  // Tick — normalmente a cada 30s, acelera pra 1s enquanto tem uma aula na
  // janela de cronômetro ativo (2min antes até 10min de tolerância depois).
  useEffect(() => {
    let timeoutId;
    const scheduleTick = () => {
      const now = Date.now();
      const l = upcomingLessonRef.current;
      const fast = l && l.scheduled_at && (() => {
        const diff = now - new Date(l.scheduled_at).getTime();
        return diff > -LESSON_JOIN_WINDOW_BEFORE_MS && diff <= LESSON_JOIN_GRACE_PERIOD_MS;
      })();
      timeoutId = setTimeout(() => {
        setTick(n => n + 1);
        scheduleTick();
      }, fast ? 1000 : 30_000);
    };
    scheduleTick();
    return () => clearTimeout(timeoutId);
  }, []);

  // Busca a próxima aula agendada do aluno, dentro da janela de 5min antes
  // até a tolerância de 10min depois — essa é a que aparece no card.
  useEffect(() => {
    if (!user?.id) return;
    const checkUpcoming = async () => {
      try {
        const lessons = await base44.entities.Lesson.filter({ student_id: user.id, status: "scheduled" });
        const now = Date.now();
        const next = lessons.find(l => {
          if (!l.scheduled_at) return false;
          const diff = now - new Date(l.scheduled_at).getTime();
          return diff > -UPCOMING_CARD_WINDOW_MS && diff <= LESSON_JOIN_GRACE_PERIOD_MS;
        });
        setUpcomingLesson(next || null);
      } catch { /* silencioso — não bloqueia o resto do dashboard */ }
    };
    checkUpcoming();
    const interval = setInterval(checkUpcoming, 20_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Checa se o tutor da próxima aula está pronto (online e livre) — mesma
  // regra usada em My Lessons. Enquanto não estiver pronto, marca
  // silenciosamente "aluno esperando" (uma vez por aula), pro sistema de
  // no-show conseguir culpar o tutor corretamente mesmo sem o aluno abrir a sala.
  useEffect(() => {
    if (!upcomingLesson?.tutor_id) {
      setUpcomingTutorReady(false);
      setUpcomingTutorBusy(false);
      return;
    }
    const check = async () => {
      try {
        const [busyRes, tutorProfiles] = await Promise.all([
          base44.functions.invoke("checkTutorBusy", { tutor_id: upcomingLesson.tutor_id }),
          base44.entities.TutorProfile.filter({ user_id: upcomingLesson.tutor_id }),
        ]);
        const busy = busyRes.data?.busy || false;
        const tp = tutorProfiles[0];
        const online = tp?.last_seen && (Date.now() - new Date(tp.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
        setUpcomingTutorBusy(busy);
        setUpcomingTutorReady(Boolean(online) && !busy);

        const ready = online && !busy;
        if (!ready && !waitingMarkedRef.current.has(upcomingLesson.id)) {
          waitingMarkedRef.current.add(upcomingLesson.id);
          base44.functions.invoke("markStudentWaiting", { lesson_id: upcomingLesson.id }).catch(() => {});
        }
      } catch { /* silencioso */ }
    };
    check();
    const interval = setInterval(check, 20_000);
    return () => clearInterval(interval);
  }, [upcomingLesson?.id, upcomingLesson?.tutor_id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, profiles] = await Promise.all([
        base44.entities.TutorProfile.filter({ status: "approved" }),
        base44.entities.StudentProfile.filter({ user_id: user?.id }),
      ]);
      // TutorProfile.filter({status:"approved"}) já exclui sozinho qualquer
      // tutor com status "hidden" (escondido pelo admin) — não precisa de
      // filtro extra aqui.
      setTutors(data.filter(t => Boolean(t.photo_url)));
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch { setTutors([]); } finally { setLoading(false); }
  };

  const isOnline = (t) => {
    if (!t.last_seen) return false;
    return (Date.now() - new Date(t.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
  };

  const hasOpenSchedule = (tutor) => {
    if (!tutor.availability) return false;
    const days = Object.values(tutor.availability);
    return days.some(slots => Array.isArray(slots) && slots.length > 0);
  };

  const getTutorPriority = (tutor) => {
    const online = isOnline(tutor);
    const availNow = tutor.is_available_now && online;
    const openSchedule = hasOpenSchedule(tutor);
    if (availNow) return 0;                    // online + available now
    if (online && openSchedule) return 1;      // online + has schedule slots
    if (!online && openSchedule) return 2;     // offline + has schedule slots
    return 3;                                  // everything else
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = React.useMemo(() => tutors
    .filter(t => {
      if (search && !t.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (availableNow && !(t.is_available_now && isOnline(t))) return false;
      return true;
    })
    .sort((a, b) => getTutorPriority(a) - getTutorPriority(b)),
  // tick forces re-sort every 30s; tutors/search/availableNow on change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tutors, search, availableNow, tick]);

  const upcomingStatus = upcomingLesson?.scheduled_at ? getLessonTimeStatus(upcomingLesson.scheduled_at, Date.now()) : null;
  const canShowJoin = upcomingLesson && upcomingStatus && (upcomingStatus.live || upcomingStatus.negative)
    && new Date(upcomingLesson.scheduled_at).getTime() - Date.now() <= LESSON_JOIN_WINDOW_BEFORE_MS
    && upcomingTutorReady;

  return (
    <div>
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}

      {/* Credits Banner */}
      {profile && <CreditsBanner profile={profile} onUpdate={setProfile} />}

      {/* Upcoming lesson card — aparece 5min antes da aula agendada */}
      {upcomingLesson && (
        <div className="mb-6 rounded-3xl bg-white border border-orange-200 shadow-sm p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-orange-100 flex items-center justify-center shrink-0">
              <Calendar className="w-5 h-5 text-orange-500" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-gray-900 truncate">{t(lang, "upcomingLessonWith")} {upcomingLesson.tutor_name}</p>
              <p className="text-sm text-gray-500 truncate">
                {upcomingLesson.language} · {new Date(upcomingLesson.scheduled_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {!upcomingTutorReady && (
                  <span className="text-amber-600"> · {upcomingTutorBusy ? t(lang, "tutorFinishingAnotherLesson") : t(lang, "waitingForTutorOnline")}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            {upcomingStatus?.label && (
              <span className={
                upcomingStatus.negative
                  ? "text-sm font-bold px-3 py-1.5 rounded-xl bg-red-50 border border-red-200 text-red-500 animate-pulse tabular-nums"
                  : upcomingStatus.live
                    ? "text-sm font-bold px-3 py-1.5 rounded-xl bg-orange-50 border border-orange-200 text-orange-500 tabular-nums"
                    : "text-sm text-gray-500 font-medium"
              }>
                {upcomingStatus.label}
              </span>
            )}
            {canShowJoin && (
              <Link to={`/classroom/${upcomingLesson.id}`}>
                <Button size="sm" className="bg-orange-500 text-white hover:bg-orange-600 border-0">
                  {t(lang, "joinBtn")}
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
          {t(lang, "welcomeBack")}, {profile?.full_name?.split(" ")[0] || user?.full_name?.split(" ")[0] || "there"}
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all text-sm font-medium shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" /> {t(lang, "support")}
          </button>
        </div>
      </div>

      {/* Search row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(lang, "searchByName")}
            className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={() => setAvailableNow(!availableNow)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold border transition-all shadow-sm ${
            availableNow
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${availableNow ? "bg-white" : "bg-emerald-500"}`} />
          {t(lang, "availableNow")}
          {availableNow && <X className="w-3 h-3 ml-1" />}
        </button>
      </div>

      {/* Tutors grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-800 mb-1">{t(lang, "noTutorsFound")}</h3>
          <p className="text-sm text-gray-400">{t(lang, "noTutorsSub")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {filtered.map(t => <TutorCard key={t.id} tutor={t} firstWeekActive={isFirstWeekActive(profile)} />)}
        </div>
      )}
    </div>
  );
}
