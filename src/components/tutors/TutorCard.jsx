import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Star, Video, Calendar } from "lucide-react";
import { getCountryFlag, getLanguageLabel, REDIRECT_TO_PLANS_ERROR_CODES } from "@/lib/constants";
import CountryFlagImg from "@/components/shared/CountryFlagImg";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import { useToast } from "@/components/ui/use-toast";

const ONLINE_THRESHOLD_MS = 90 * 1000;
const isOnline = (t) => t.last_seen && (Date.now() - new Date(t.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
const isLive = (t) => t.is_available_now && isOnline(t);
const hasSchedule = (t) => t.availability && Object.keys(t.availability).some(day => t.availability[day]?.length > 0);

// Interest topic translations for student view
const TOPIC_TRANSLATIONS = {
  pt_br: {
    "Travel": "Viagens", "Business": "Negócios", "Pop Culture": "Cultura Pop",
    "Job Interviews": "Entrevistas de Emprego", "Daily Life": "Cotidiano",
    "Sports": "Esportes", "Technology": "Tecnologia", "Food & Cuisine": "Culinária",
    "Movies & TV Shows": "Filmes e Séries", "Music": "Música", "Politics": "Política",
    "Science": "Ciência", "Art & Design": "Arte & Design", "Health & Fitness": "Saúde & Fitness",
    "Education": "Educação",
    // legacy keys (tutors who saved old topics)
    "Food & Cooking": "Culinária", "Movies & TV": "Filmes e Séries",
    "Art": "Arte", "Health": "Saúde", "Culture": "Cultura", "History": "História",
    "Environment": "Meio Ambiente", "Gaming": "Jogos", "Literature": "Literatura",
    "Finance": "Finanças", "Philosophy": "Filosofia", "Fashion": "Moda",
  },
  pt_pt: {
    "Travel": "Viagens", "Business": "Negócios", "Pop Culture": "Cultura Pop",
    "Job Interviews": "Entrevistas de Emprego", "Daily Life": "Quotidiano",
    "Sports": "Desporto", "Technology": "Tecnologia", "Food & Cuisine": "Culinária",
    "Movies & TV Shows": "Filmes e Séries", "Music": "Música", "Politics": "Política",
    "Science": "Ciência", "Art & Design": "Arte & Design", "Health & Fitness": "Saúde & Fitness",
    "Education": "Educação",
    "Food & Cooking": "Culinária", "Movies & TV": "Filmes e Séries",
    "Art": "Arte", "Health": "Saúde", "Culture": "Cultura", "History": "História",
    "Environment": "Ambiente", "Gaming": "Jogos", "Literature": "Literatura",
    "Finance": "Finanças", "Philosophy": "Filosofia", "Fashion": "Moda",
  },
  es: {
    "Travel": "Viajes", "Business": "Negocios", "Pop Culture": "Cultura Pop",
    "Job Interviews": "Entrevistas de Trabajo", "Daily Life": "Vida Cotidiana",
    "Sports": "Deportes", "Technology": "Tecnología", "Food & Cuisine": "Gastronomía",
    "Movies & TV Shows": "Cine y Series", "Music": "Música", "Politics": "Política",
    "Science": "Ciencia", "Art & Design": "Arte & Diseño", "Health & Fitness": "Salud & Fitness",
    "Education": "Educación",
    "Food & Cooking": "Gastronomía", "Movies & TV": "Cine y Series",
    "Art": "Arte", "Health": "Salud", "Culture": "Cultura", "History": "Historia",
    "Environment": "Medio Ambiente", "Gaming": "Videojuegos", "Literature": "Literatura",
    "Finance": "Finanzas", "Philosophy": "Filosofía", "Fashion": "Moda",
  },
  fr: {
    "Travel": "Voyages", "Business": "Affaires", "Pop Culture": "Culture Pop",
    "Job Interviews": "Entretiens d'embauche", "Daily Life": "Vie Quotidienne",
    "Sports": "Sports", "Technology": "Technologie", "Food & Cuisine": "Gastronomie",
    "Movies & TV Shows": "Cinéma et Séries", "Music": "Musique", "Politics": "Politique",
    "Science": "Science", "Art & Design": "Art & Design", "Health & Fitness": "Santé & Fitness",
    "Education": "Éducation",
    "Food & Cooking": "Gastronomie", "Movies & TV": "Cinéma et Séries",
    "Art": "Art", "Health": "Santé", "Culture": "Culture", "History": "Histoire",
    "Environment": "Environnement", "Gaming": "Jeux Vidéo", "Literature": "Littérature",
    "Finance": "Finance", "Philosophy": "Philosophie", "Fashion": "Mode",
  },
  de: {
    "Travel": "Reisen", "Business": "Geschäft", "Pop Culture": "Popkultur",
    "Job Interviews": "Vorstellungsgespräche", "Daily Life": "Alltag",
    "Sports": "Sport", "Technology": "Technologie", "Food & Cuisine": "Küche",
    "Movies & TV Shows": "Film & Serien", "Music": "Musik", "Politics": "Politik",
    "Science": "Wissenschaft", "Art & Design": "Kunst & Design", "Health & Fitness": "Gesundheit & Fitness",
    "Education": "Bildung",
    "Food & Cooking": "Küche", "Movies & TV": "Film & Serien",
    "Art": "Kunst", "Health": "Gesundheit", "Culture": "Kultur", "History": "Geschichte",
    "Environment": "Umwelt", "Gaming": "Gaming", "Literature": "Literatur",
    "Finance": "Finanzen", "Philosophy": "Philosophie", "Fashion": "Mode",
  },
  it: {
    "Travel": "Viaggi", "Business": "Affari", "Pop Culture": "Cultura Pop",
    "Job Interviews": "Colloqui di Lavoro", "Daily Life": "Vita Quotidiana",
    "Sports": "Sport", "Technology": "Tecnologia", "Food & Cuisine": "Gastronomia",
    "Movies & TV Shows": "Cinema e Serie", "Music": "Musica", "Politics": "Politica",
    "Science": "Scienza", "Art & Design": "Arte & Design", "Health & Fitness": "Salute & Fitness",
    "Education": "Istruzione",
    "Food & Cooking": "Gastronomia", "Movies & TV": "Cinema e Serie",
    "Art": "Arte", "Health": "Salute", "Culture": "Cultura", "History": "Storia",
    "Environment": "Ambiente", "Gaming": "Videogiochi", "Literature": "Letteratura",
    "Finance": "Finanza", "Philosophy": "Filosofia", "Fashion": "Moda",
  },
  ja: {
    "Travel": "旅行", "Business": "ビジネス", "Pop Culture": "ポップカルチャー",
    "Job Interviews": "就職面接", "Daily Life": "日常生活",
    "Sports": "スポーツ", "Technology": "テクノロジー", "Food & Cuisine": "食文化・料理",
    "Movies & TV Shows": "映画・ドラマ", "Music": "音楽", "Politics": "政治",
    "Science": "科学", "Art & Design": "アート・デザイン", "Health & Fitness": "健康・フィットネス",
    "Education": "教育",
    "Food & Cooking": "食文化・料理", "Movies & TV": "映画・ドラマ",
    "Art": "アート", "Health": "健康", "Culture": "文化", "History": "歴史",
    "Environment": "環境", "Gaming": "ゲーム", "Literature": "文学",
    "Finance": "金融", "Philosophy": "哲学", "Fashion": "ファッション",
  },
  ko: {
    "Travel": "여행", "Business": "비즈니스", "Pop Culture": "대중문화",
    "Job Interviews": "취업 면접", "Daily Life": "일상생활",
    "Sports": "스포츠", "Technology": "기술", "Food & Cuisine": "음식과 요리",
    "Movies & TV Shows": "영화와 드라마", "Music": "음악", "Politics": "정치",
    "Science": "과학", "Art & Design": "예술과 디자인", "Health & Fitness": "건강과 피트니스",
    "Education": "교육",
    "Food & Cooking": "음식과 요리", "Movies & TV": "영화와 드라마",
    "Art": "예술", "Health": "건강", "Culture": "문화", "History": "역사",
    "Environment": "환경", "Gaming": "게임", "Literature": "문학",
    "Finance": "금융", "Philosophy": "철학", "Fashion": "패션",
  },
};

export function translateTopic(topic, lang) {
  if (lang === "en") return topic;
  return TOPIC_TRANSLATIONS[lang]?.[topic] || topic;
}

export default function TutorCard({ tutor, forceEnglishTopics = false, firstWeekActive = false }) {
  const live = isLive(tutor);
  const online = isOnline(tutor);
  const canSchedule = hasSchedule(tutor);
  const inLesson = Boolean(tutor.in_lesson);
  const showLessonNow = live && !inLesson && !firstWeekActive;
  const [booking, setBooking] = useState(false);
  const { lang } = useLang();
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleLessonNow = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (booking || inLesson) return;
    setBooking(true);
    try {
      const res = await base44.functions.invoke('startInstantLesson', { tutor_user_id: tutor.user_id });
      if (res.data?.error) throw new Error(res.data.error);
      navigate(`/classroom/${res.data.lesson.id}`);
    } catch (e) {
      const message = e?.response?.data?.error || e?.message;
      const errorCode = e?.response?.data?.error_code;
      if (REDIRECT_TO_PLANS_ERROR_CODES.includes(errorCode)) {
        navigate("/plans");
      }
      toast({ title: t(lang, "lessonStartFailedTitle"), description: message || t(lang, "tryAgainDesc"), variant: "destructive" });
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
              src={tutor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.display_name || tutor.full_name)}&background=F26A1B&color=fff&size=80`}
              alt={tutor.display_name || tutor.full_name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-orange-500/30 transition-all"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.display_name || tutor.full_name)}&background=F26A1B&color=fff&size=80`;
              }}
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
            <h3 className="theme-heading font-display font-bold text-white group-hover:text-orange-400 transition-colors truncate">{tutor.display_name || tutor.full_name}</h3>
            <p className="theme-subtext text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <CountryFlagImg country={tutor.nationality || tutor.country} className="w-5 h-4 rounded-sm object-cover" />
              <span>{tutor.nationality || tutor.country}</span>
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-sm text-amber-500 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {tutor.total_reviews > 0 ? (tutor.average_rating || 0).toFixed(1) : t(lang, "newTutorLabel")}
              </span>
              <span className="theme-subtext text-xs text-gray-600">{tutor.total_lessons || 0} {t(lang, "lessonsCountSuffix")}</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            {inLesson ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-red-500/15 border border-red-500/20 text-red-400">
                ● {t(lang, "statusInLesson")}
              </span>
            ) : online ? (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-emerald-500/15 border border-emerald-500/20 text-emerald-400">
                ● {t(lang, "statusOnline")}
              </span>
            ) : (
              <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-white/5 border border-white/10 text-gray-500">
                {t(lang, "statusOffline")}
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
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> {t(lang, "busyInLesson")}
          </div>
        )}
        {!inLesson && live && (
          <div className="mt-3 text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> {t(lang, "availableNow")}
          </div>
        )}

        {/* Action buttons */}
        {(showLessonNow || canSchedule) && (
          <div className="mt-4 flex gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: "14px" }}>
            {showLessonNow && (
              <button
                onClick={handleLessonNow}
                disabled={booking}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-semibold bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/20 hover:opacity-90 transition-all disabled:opacity-60"
              >
                <Video className="w-3.5 h-3.5" />
                {booking ? t(lang, "startingBtn") : t(lang, "lessonNowBtn")}
              </button>
            )}
            {canSchedule && (
              <button
                onClick={handleSchedule}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-2xl text-xs font-semibold transition-all hover:scale-105 shadow-lg ${
                  showLessonNow
                    ? "bg-white/10 hover:bg-white/15 text-white border border-white/10"
                    : "bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-orange-500/20"
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                {showLessonNow ? t(lang, "scheduleShortBtn") : t(lang, "scheduleBtn")}
              </button>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}