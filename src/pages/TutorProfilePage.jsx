import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Star, Globe, Clock, MapPin, Video, Calendar, ChevronLeft } from "lucide-react";
import { getCountryFlag, getLanguageLabel, REDIRECT_TO_PLANS_ERROR_CODES } from "@/lib/constants";
import CountryFlagImg from "@/components/shared/CountryFlagImg";
import { useToast } from "@/components/ui/use-toast";
import ScheduleModal from "@/components/tutors/ScheduleModal";
import { isFirstWeekActive } from "@/lib/firstWeekWindow";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";

const FRIENDLY_WARNING_CODES = ["insufficient_credits_for_booking", "first_week_limit"];

function getBookingErrorDisplay(errorCode, fallbackTitle) {
  const isFriendly = FRIENDLY_WARNING_CODES.includes(errorCode);
  const title = errorCode === "first_week_limit"
    ? "Sua próxima aula já tem uma data 😊"
    : errorCode === "insufficient_credits_for_booking"
    ? "Você já usou todo o seu saldo"
    : fallbackTitle;
  return { variant: isFriendly ? "warning" : "destructive", title };
}

export default function TutorProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { lang } = useLang();
  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);
  const [inLesson, setInLesson] = useState(false);
  const [studentProfile, setStudentProfile] = useState(null);

  const ONLINE_THRESHOLD_MS = 90 * 1000;
  const isOnline = (t) => t?.last_seen && (Date.now() - new Date(t.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
  const isLive = (t) => t?.is_available_now && isOnline(t);

  useEffect(() => { loadTutor(); }, [id]);

  const loadTutor = async () => {
    try {
      const t = await base44.entities.TutorProfile.get(id);
      setTutor(t);
      const r = await base44.entities.Review.filter({ tutor_id: t.user_id, is_visible: true });
      setReviews(r);
      setInLesson(Boolean(t.in_lesson));
      if (user?.role === "student") {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setStudentProfile(profiles[0]);
      }
    } catch {} finally { setLoading(false); }
  };

  // Client-side check kept only for UX (pre-emptively disabling the schedule
  // button / redirecting to plans) — the real, final validation always happens
  // server-side inside startInstantLesson / bookSlot.
  const checkCredits = async () => {
    if (user?.role !== "student") return true; // tutors/admins bypass
    const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
    const credits = profiles[0]?.credits_minutes ?? 0;
    if (credits < 1) {
      navigate("/plans");
      toast({ title: "Sem minutos disponíveis", description: "Adicione créditos para continuar.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const startInstantLesson = async () => {
    setBooking(true);
    try {
      const res = await base44.functions.invoke('startInstantLesson', { tutor_user_id: tutor.user_id });
      if (res.data?.error) throw new Error(res.data.error);
      navigate(`/classroom/${res.data.lesson.id}`);
    } catch (err) {
      const message = err?.response?.data?.error || err?.message;
      const errorCode = err?.response?.data?.error_code;
      if (REDIRECT_TO_PLANS_ERROR_CODES.includes(errorCode)) navigate("/plans");
      const { variant, title } = getBookingErrorDisplay(errorCode, "Não foi possível iniciar a aula");
      toast({ title, description: message || "Tente novamente.", variant });
    } finally { setBooking(false); }
  };

  const scheduleLesson = async (scheduledAt) => {
    setBooking(true);
    try {
      const studentProfiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      const sp = studentProfiles[0];

      // Call bookSlot FIRST — it performs all server-side validations
      // (first-month restriction + time conflict). Only create the Lesson record if it succeeds.
      // bookSlot handles: eligibility check + slot lock + Lesson creation — all server-side.
      // This prevents race conditions from double-clicks or concurrent requests.
      const bookRes = await base44.functions.invoke('bookSlot', {
        tutor_profile_id: tutor.id,
        scheduled_at: scheduledAt,
        action: 'book',
        duration_minutes: 30,
        tutor_user_id: tutor.user_id,
        tutor_name: tutor.display_name || tutor.full_name,
        student_name: sp?.full_name || user.full_name,
        language: tutor.native_languages?.[0] || 'english',
      });

      if (bookRes.data?.error) {
        const { variant, title } = getBookingErrorDisplay(bookRes.data?.error_code, "Agendamento bloqueado");
        toast({ title, description: bookRes.data.error, variant });
        if (REDIRECT_TO_PLANS_ERROR_CODES.includes(bookRes.data?.error_code)) {
          navigate("/plans");
        }
        return;
      }

      // Refresh tutor with updated booked_slots so modal stays accurate
      if (bookRes.data?.booked_slots) {
        setTutor(prev => ({ ...prev, booked_slots: bookRes.data.booked_slots }));
      }
      setShowSchedule(false);
      toast({ title: "Lesson scheduled! 📅", description: "Check 'My Lessons' to see your booking." });
      // Notify tutor via email (fire and forget) — pass the real lesson_id so the
      // backend can verify the lesson exists instead of trusting client fields.
      if (bookRes.data?.lesson?.id) {
        base44.functions.invoke('notifyTutorBooking', {
          lesson_id: bookRes.data.lesson.id,
        }).catch(() => {});
      }
    } catch (err) {
      const msg = err?.response?.data?.error || err?.message || "Could not schedule.";
      const errorCode = err?.response?.data?.error_code;
      const { variant, title } = getBookingErrorDisplay(errorCode, "Agendamento bloqueado");
      toast({ title, description: msg, variant });
    } finally { setBooking(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!tutor) return <div className="theme-subtext text-center py-24 text-gray-500">Tutor not found</div>;

  // Tutor escondido pelo admin (status "hidden") não deve ser acessível por
  // link direto por um aluno novo — mesmo tratamento visual de "não
  // encontrado". Admin e o próprio tutor continuam acessando normalmente.
  if (tutor.status === "hidden" && user?.role === "student") {
    return <div className="theme-subtext text-center py-24 text-gray-500">Tutor not found</div>;
  }

  const showLessonNow = isLive(tutor) && !inLesson && !isFirstWeekActive(studentProfile);

  return (
    <div className="max-w-3xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="theme-subtext flex items-center gap-1 text-sm text-gray-500 hover:text-orange-400 mb-6 transition-colors font-medium"
      >
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      {/* Main card */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative shrink-0">
              <img
                src={tutor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.display_name || tutor.full_name)}&background=F26A1B&color=fff&size=120`}
                alt={tutor.display_name || tutor.full_name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover ring-2 ring-orange-500/20"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.display_name || tutor.full_name)}&background=F26A1B&color=fff&size=120`;
                }}
              />
              {isLive(tutor) && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 border-2 border-white rounded-full">
                  <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-60" />
                </div>
              )}
            </div>
            <div className="flex-1">
              <h1 className="theme-heading font-display text-2xl font-bold text-white">{tutor.display_name || tutor.full_name}</h1>
              <p className="theme-subtext text-gray-500 flex items-center gap-1 mt-1 text-sm">
                <MapPin className="w-3.5 h-3.5" /> <CountryFlagImg country={tutor.country} /> {tutor.country}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1 text-amber-500 font-bold">
                  <Star className="w-4 h-4 fill-amber-400" /> {tutor.average_rating?.toFixed(1) || "New"}
                </span>
                <span className="theme-subtext text-sm text-gray-500">{tutor.total_reviews || 0} reviews</span>
                <span className="theme-subtext text-sm text-gray-500">{tutor.total_lessons || 0} lessons</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {tutor.native_languages?.map(l => (
                  <span key={l} className="text-xs px-3 py-1 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-300 font-medium">
                    {getLanguageLabel(l)} (Native)
                  </span>
                ))}
                {inLesson && (
                  <span className="text-xs px-3 py-1 rounded-full bg-red-500/15 border border-red-500/20 text-red-400 font-semibold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> In a lesson
                  </span>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Divider */}
        <div className="mx-6 sm:mx-8 border-t border-white/10" style={{ borderColor: "var(--app-border)" }} />

        {tutor.intro_video_url && (
          <div className="px-6 sm:px-8 py-6">
            <h3 className="theme-heading font-display font-semibold text-white mb-3 text-sm uppercase tracking-wide opacity-60">Intro Video</h3>
            <video src={tutor.intro_video_url} controls className="w-full rounded-2xl bg-black" style={{ maxHeight: 360 }} />
          </div>
        )}

        <div className="px-6 sm:px-8 py-6">
          <h3 className="theme-heading font-display font-semibold text-white mb-3 text-sm uppercase tracking-wide opacity-60">About</h3>
          <p className="theme-subtext text-gray-400 text-sm leading-relaxed">{tutor.bio}</p>
        </div>

        {tutor.interests?.length > 0 && (
          <div className="px-6 sm:px-8 pb-6">
            <h3 className="theme-heading font-display font-semibold text-white mb-3 text-sm uppercase tracking-wide opacity-60">Conversation Topics</h3>
            <div className="flex flex-wrap gap-2">
              {tutor.interests.map(i => (
                <span key={i} className="theme-btn-ghost text-xs px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-gray-400">{i}</span>
              ))}
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mx-6 sm:mx-8 border-t border-white/10" style={{ borderColor: "var(--app-border)" }} />

        {/* Action buttons */}
        <div className="px-6 sm:px-8 py-6 flex flex-col sm:flex-row gap-3">
          {showLessonNow && (
            <Button
              onClick={startInstantLesson} disabled={booking}
              className="flex-1 h-12 rounded-2xl border-0 shadow-lg transition-all bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-500/20 hover:scale-105"
            >
              <Video className="w-4 h-4 mr-2" />
              {booking ? "Starting..." : "Lesson now"}
            </Button>
          )}
          <Button
            onClick={async () => { if (await checkCredits()) setShowSchedule(true); }} disabled={booking}
            className={`flex-1 h-12 rounded-2xl border-0 transition-all hover:scale-105 shadow-lg ${
              showLessonNow
                ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                : "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/20"
            }`}
          >
            <Calendar className="w-4 h-4 mr-2" /> {t(lang, "scheduleBtn")}
          </Button>
        </div>
      </div>

      {showSchedule && (
        <ScheduleModal
          tutor={tutor}
          onClose={() => setShowSchedule(false)}
          onConfirm={scheduleLesson}
          booking={booking}
        />
      )}

      {/* Reviews */}
      <div className="theme-card mt-5 bg-white/5 border border-white/10 rounded-3xl p-6 sm:p-8">
        <h3 className="theme-heading font-display font-bold text-white mb-5">Reviews ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p className="theme-subtext text-sm text-gray-600 text-center py-4">No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="pb-4 last:pb-0" style={{ borderBottom: "1px solid var(--app-border)" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="theme-heading font-semibold text-sm text-white">{r.student_name || "Student"}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="theme-subtext text-sm text-gray-500">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}