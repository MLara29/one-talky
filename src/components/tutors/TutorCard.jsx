import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Video, Calendar } from "lucide-react";
import { getCountryFlag, getLanguageLabel } from "@/lib/constants";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/LanguageContext";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const isOnline = (t) => t.last_seen && (Date.now() - new Date(t.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
const isLive = (t) => t.is_available_now && isOnline(t);
const hasSchedule = (t) => t.availability && Object.keys(t.availability).some(day => t.availability[day]?.length > 0);

// Interest topic translations for student view
const TOPIC_TRANSLATIONS = {
  pt_br: { "Travel": "Viagens", "Business": "Negócios", "Sports": "Esportes", "Music": "Música", "Technology": "Tecnologia", "Food & Cooking": "Culinária", "Movies & TV": "Filmes e Séries", "Culture": "Cultura", "Science": "Ciência", "Politics": "Política", "Art": "Arte", "Fashion": "Moda", "Health": "Saúde", "Education": "Educação", "History": "História", "Environment": "Meio Ambiente", "Gaming": "Jogos", "Literature": "Literatura", "Finance": "Finanças", "Philosophy": "Filosofia" },
  pt_pt: { "Travel": "Viagens", "Business": "Negócios", "Sports": "Desporto", "Music": "Música", "Technology": "Tecnologia", "Food & Cooking": "Culinária", "Movies & TV": "Filmes e Séries", "Culture": "Cultura", "Science": "Ciência", "Politics": "Política", "Art": "Arte", "Fashion": "Moda", "Health": "Saúde", "Education": "Educação", "History": "História", "Environment": "Ambiente", "Gaming": "Jogos", "Literature": "Literatura", "Finance": "Finanças", "Philosophy": "Filosofia" },
  es: { "Travel": "Viajes", "Business": "Negocios", "Sports": "Deportes", "Music": "Música", "Technology": "Tecnología", "Food & Cooking": "Gastronomía", "Movies & TV": "Cine y Series", "Culture": "Cultura", "Science": "Ciencia", "Politics": "Política", "Art": "Arte", "Fashion": "Moda", "Health": "Salud", "Education": "Educación", "History": "Historia", "Environment": "Medio Ambiente", "Gaming": "Videojuegos", "Literature": "Literatura", "Finance": "Finanzas", "Philosophy": "Filosofía" },
  fr: { "Travel": "Voyages", "Business": "Affaires", "Sports": "Sports", "Music": "Musique", "Technology": "Technologie", "Food & Cooking": "Gastronomie", "Movies & TV": "Cinéma et Séries", "Culture": "Culture", "Science": "Science", "Politics": "Politique", "Art": "Art", "Fashion": "Mode", "Health": "Santé", "Education": "Éducation", "History": "Histoire", "Environment": "Environnement", "Gaming": "Jeux Vidéo", "Literature": "Littérature", "Finance": "Finance", "Philosophy": "Philosophie" },
  de: { "Travel": "Reisen", "Business": "Geschäft", "Sports": "Sport", "Music": "Musik", "Technology": "Technologie", "Food & Cooking": "Küche", "Movies & TV": "Film & Serien", "Culture": "Kultur", "Science": "Wissenschaft", "Politics": "Politik", "Art": "Kunst", "Fashion": "Mode", "Health": "Gesundheit", "Education": "Bildung", "History": "Geschichte", "Environment": "Umwelt", "Gaming": "Gaming", "Literature": "Literatur", "Finance": "Finanzen", "Philosophy": "Philosophie" },
  it: { "Travel": "Viaggi", "Business": "Affari", "Sports": "Sport", "Music": "Musica", "Technology": "Tecnologia", "Food & Cooking": "Gastronomia", "Movies & TV": "Cinema e Serie", "Culture": "Cultura", "Science": "Scienza", "Politics": "Politica", "Art": "Arte", "Fashion": "Moda", "Health": "Salute", "Education": "Istruzione", "History": "Storia", "Environment": "Ambiente", "Gaming": "Videogiochi", "Literature": "Letteratura", "Finance": "Finanza", "Philosophy": "Filosofia" },
};

function translateTopic(topic, lang) {
  if (lang === "en") return topic;
  return TOPIC_TRANSLATIONS[lang]?.[topic] || topic;
}

export default function TutorCard({ tutor, forceEnglishTopics = false }) {
  const live = isLive(tutor);
  const online = isOnline(tutor);
  const canSchedule = hasSchedule(tutor);
  const [inLesson, setInLesson] = useState(false);
  const [booking, setBooking] = useState(false);
  const { lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!tutor.user_id) return;
    base44.entities.Lesson.filter({ tutor_id: tutor.user_id, status: "in_progress" }, "-created_date", 1)
      .then(lessons => setInLesson(lessons.length > 0))
      .catch(() => {});
  }, [tutor.user_id]);

  const handleLessonNow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (booking || inLesson) return;
    setBooking(true);
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      const sp = profiles[0];
      const credits = sp?.credits_minutes ?? 0;
      if (credits < 10 / 60) {
        navigate("/plans");
        toast({ title: "Sem minutos disponíveis", description: "Adicione créditos para continuar.", variant: "destructive" });
        return;
      }
      const lesson = await base44.entities.Lesson.create({
        tutor_id: tutor.user_id, student_id: user.id,
        tutor_name: tutor.full_name, student_name: sp?.full_name || user.full_name,
        language: tutor.native_languages?.[0] || "english",
        status: "in_progress", type: "instant", started_at: new Date().toISOString(),
      });
      navigate(`/classroom/${lesson.id}`);
    } catch {
      toast({ title: "Erro", description: "Não foi possível iniciar a aula. Tente novamente.", variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const handleSchedule = (e) => {
    e.preventDefault();
    e.stopPropagation();
    navigate(`/tutor/${tutor.id}`);
  };

  return (
    <Link to={`/tutor/${tutor.id}`} className="block group h-full">
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 hover:border-orange-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-orange-500/10 hover:-translate-y-1 h-full flex flex-col">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={tutor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=F26A1B&color=fff&size=80`}
              alt={tutor.full_name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-orange-500/30 transition-all"
            />
            {online && !inLesson && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-slate-950 rounded-full">
                <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-60" />
              </div>
            )}
            {inLesson && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-red-500 border-2 border-slate-950 rounded-full" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="theme-heading font-display font-bold text-white group-hover:text-orange-400 transition-colors truncate">{tutor.full_name}</h3>
            <p className="theme-subtext text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <span className="text-lg leading-none">
                {getCountryFlag(tutor.nationality) !== "🌍"
                  ? getCountryFlag(tutor.nationality)
                  : getCountryFlag(tutor.country)}
              </span>
              <span>{tutor.nationality || tutor.country}</span>
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-sm text-amber-500 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {tutor.total_reviews > 0 ? (tutor.average_rating || 0).toFixed(1) : "New"}
              </span>
              <span className="theme-subtext text-xs text-gray-600">{tutor.total_lessons || 0} lessons</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            {inLesson ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-500/15 border border-red-500/20 text-red-400">
                ● In a lesson
              </span>
            ) : online ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
                ● Online
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white/5 border border-white/10 text-gray-500">
                Offline
              </span>
            )}
          </div>
        </div>

        {tutor.bio && (
          <p className="theme-subtext text-xs text-gray-400 mt-3 line-clamp-2 leading-relaxed">{tutor.bio}</p>
        )}

        <div className="mt-3 flex-1">
          <div className="flex flex-wrap gap-1.5 overflow-hidden" style={{ maxHeight: "4rem" }}>
            {tutor.native_languages?.map(l => (
              <span key={l} className="text-xs px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-300 font-medium">
                {getLanguageLabel(l)}
              </span>
            ))}
            {tutor.interests?.slice(0, 10).map(i => (
              <span key={i} className="theme-btn-ghost text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-500">
                {forceEnglishTopics ? i : translateTopic(i, lang)}
              </span>
            ))}
          </div>
        </div>

        {/* Status line */}
        {inLesson && (
          <div className="mt-3 text-xs font-semibold text-red-400 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> Busy — in a lesson
          </div>
        )}
        {!inLesson && live && (
          <div className="mt-3 text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available now
          </div>
        )}

        {/* Action buttons */}
        {(live || canSchedule) && !inLesson && (
          <div className="mt-4 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "14px" }}>
            {live && (
              <button
                onClick={handleLessonNow}
                disabled={booking}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:opacity-90 transition-all disabled:opacity-60"
              >
                <Video className="w-3.5 h-3.5" />
                {booking ? "Starting..." : "Lesson now"}
              </button>
            )}
            {canSchedule && (
              <button
                onClick={handleSchedule}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-semibold transition-all hover:scale-105 shadow-lg ${
                  live
                    ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    : "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/20"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {live ? "Schedule" : "Schedule a lesson"}
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}