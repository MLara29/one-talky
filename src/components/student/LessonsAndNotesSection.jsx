import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { StickyNote, Calendar, Star } from "lucide-react";

// Student-facing section shown on the Progress page. Two internal tabs:
//   - "Notas do tutor": shared TutorNote records, grouped by tutor
//   - "Avaliações": Review records where author_role = "tutor" (tutor
//     evaluating the student), grouped by tutor
//
// A tutor appears in the notes tab only if they have at least one shared
// note; in the reviews tab only if they have at least one tutor-authored
// review. The section hides entirely if neither tab has data.
//
// RLS guarantees:
//   - TutorNote: only shared notes are returned to the student
//   - Review: tutor-authored reviews are only visible to the reviewed student
//
// Strings live in a local L map (same pattern used by other new components —
// the global i18n file is at capacity). Dates are formatted with the locale
// that matches the active UI language.

const LOCALE_MAP = {
  pt_br: "pt-BR",
  pt_pt: "pt-PT",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  it: "it-IT",
  ja: "ja-JP",
  ko: "ko-KR",
};

const L = {
  pt_br: {
    sectionTitle: "Notas e avaliações dos seus tutores",
    tabNotes: "Notas do tutor",
    tabReviews: "Avaliações",
    notesFrom: "Notas de {tutor}",
    reviewsFrom: "Avaliações de {tutor}",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    reviewsCount_one: "{n} avaliação",
    reviewsCount_other: "{n} avaliações",
    noNotes: "Nenhuma nota compartilhada ainda.",
    noReviews: "Nenhuma avaliação recebida ainda.",
    lessonOf: "Aula de {date}",
    tutorFallback: "Tutor",
  },
  pt_pt: {
    sectionTitle: "Notas e avaliações dos seus tutores",
    tabNotes: "Notas do tutor",
    tabReviews: "Avaliações",
    notesFrom: "Notas de {tutor}",
    reviewsFrom: "Avaliações de {tutor}",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    reviewsCount_one: "{n} avaliação",
    reviewsCount_other: "{n} avaliações",
    noNotes: "Ainda não há notas partilhadas.",
    noReviews: "Ainda não recebeu avaliações.",
    lessonOf: "Aula de {date}",
    tutorFallback: "Tutor",
  },
  en: {
    sectionTitle: "Notes & reviews from your tutors",
    tabNotes: "Tutor notes",
    tabReviews: "Reviews",
    notesFrom: "Notes from {tutor}",
    reviewsFrom: "Reviews from {tutor}",
    notesCount_one: "{n} note",
    notesCount_other: "{n} notes",
    reviewsCount_one: "{n} review",
    reviewsCount_other: "{n} reviews",
    noNotes: "No shared notes yet.",
    noReviews: "No reviews received yet.",
    lessonOf: "Lesson on {date}",
    tutorFallback: "Tutor",
  },
  es: {
    sectionTitle: "Notas y evaluaciones de tus tutores",
    tabNotes: "Notas del tutor",
    tabReviews: "Evaluaciones",
    notesFrom: "Notas de {tutor}",
    reviewsFrom: "Evaluaciones de {tutor}",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    reviewsCount_one: "{n} evaluación",
    reviewsCount_other: "{n} evaluaciones",
    noNotes: "Aún no hay notas compartidas.",
    noReviews: "Aún no has recibido evaluaciones.",
    lessonOf: "Clase del {date}",
    tutorFallback: "Tutor",
  },
  fr: {
    sectionTitle: "Notes et évaluations de vos tuteurs",
    tabNotes: "Notes du tuteur",
    tabReviews: "Évaluations",
    notesFrom: "Notes de {tutor}",
    reviewsFrom: "Évaluations de {tutor}",
    notesCount_one: "{n} note",
    notesCount_other: "{n} notes",
    reviewsCount_one: "{n} évaluation",
    reviewsCount_other: "{n} évaluations",
    noNotes: "Aucune note partagée pour le moment.",
    noReviews: "Aucune évaluation reçue pour le moment.",
    lessonOf: "Cours du {date}",
    tutorFallback: "Tuteur",
  },
  de: {
    sectionTitle: "Notizen & Bewertungen deiner Tutoren",
    tabNotes: "Notizen des Tutors",
    tabReviews: "Bewertungen",
    notesFrom: "Notizen von {tutor}",
    reviewsFrom: "Bewertungen von {tutor}",
    notesCount_one: "{n} Notiz",
    notesCount_other: "{n} Notizen",
    reviewsCount_one: "{n} Bewertung",
    reviewsCount_other: "{n} Bewertungen",
    noNotes: "Noch keine geteilten Notizen.",
    noReviews: "Noch keine Bewertungen erhalten.",
    lessonOf: "Stunde am {date}",
    tutorFallback: "Tutor",
  },
  it: {
    sectionTitle: "Note e valutazioni dei tuoi tutor",
    tabNotes: "Note del tutor",
    tabReviews: "Valutazioni",
    notesFrom: "Note di {tutor}",
    reviewsFrom: "Valutazioni di {tutor}",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} note",
    reviewsCount_one: "{n} valutazione",
    reviewsCount_other: "{n} valutazioni",
    noNotes: "Nessuna nota condivisa.",
    noReviews: "Nessuna valutazione ricevuta.",
    lessonOf: "Lezione del {date}",
    tutorFallback: "Tutor",
  },
  ja: {
    sectionTitle: "講師からのメモと評価",
    tabNotes: "講師のメモ",
    tabReviews: "評価",
    notesFrom: "{tutor}からのメモ",
    reviewsFrom: "{tutor}からの評価",
    notesCount_one: "{n}件のメモ",
    notesCount_other: "{n}件のメモ",
    reviewsCount_one: "{n}件の評価",
    reviewsCount_other: "{n}件の評価",
    noNotes: "共有されたメモはまだありません。",
    noReviews: "受け取った評価はまだありません。",
    lessonOf: "{date}のレッスン",
    tutorFallback: "講師",
  },
  ko: {
    sectionTitle: "튜터의 노트와 평가",
    tabNotes: "튜터 노트",
    tabReviews: "평가",
    notesFrom: "{tutor}의 노트",
    reviewsFrom: "{tutor}의 평가",
    notesCount_one: "노트 {n}개",
    notesCount_other: "노트 {n}개",
    reviewsCount_one: "평가 {n}개",
    reviewsCount_other: "평가 {n}개",
    noNotes: "공유된 노트가 아직 없습니다.",
    noReviews: "받은 평가가 아직 없습니다.",
    lessonOf: "{date} 수업",
    tutorFallback: "튜터",
  },
};

const tr = (lang, key, vars = {}) => {
  const dict = L[lang] || L.en;
  let s = dict[key] ?? L.en[key] ?? key;
  Object.keys(vars).forEach((k) => {
    s = s.replace(`{${k}}`, vars[k]);
  });
  return s;
};

const pluralKey = (n) => (n === 1 ? "_one" : "_other");

export default function LessonsAndNotesSection() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [notes, setNotes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [tutorProfiles, setTutorProfiles] = useState({});
  const [linkedLessons, setLinkedLessons] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("notes");

  const locale = LOCALE_MAP[lang] || "en-US";

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [sharedNotes, tutorReviews] = await Promise.all([
        // RLS read rule returns ONLY shared notes for the student.
        base44.entities.TutorNote.filter({ student_id: user.id }),
        // RLS read rule returns ONLY tutor-authored reviews where this student
        // is the subject (author_role = "tutor" + student_id = user.id).
        base44.entities.Review.filter({ student_id: user.id, author_role: "tutor" }, "-created_date"),
      ]);

      const sortedNotes = sharedNotes.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
      setNotes(sortedNotes);
      setReviews(tutorReviews);

      // Collect lesson_ids from both notes and reviews to fetch lesson dates.
      const lessonIds = [...new Set([
        ...sortedNotes.map(n => n.lesson_id).filter(Boolean),
        ...tutorReviews.map(r => r.lesson_id).filter(Boolean),
      ])];
      const lessonsMap = {};
      if (lessonIds.length > 0) {
        await Promise.all(lessonIds.map(async (lid) => {
          try {
            const l = await base44.entities.Lesson.get(lid);
            if (l) lessonsMap[lid] = l;
          } catch {}
        }));
      }
      setLinkedLessons(lessonsMap);

      // Load tutor profiles for display names (from both notes and reviews).
      const tutorIds = [...new Set([
        ...sortedNotes.map(n => n.tutor_id).filter(Boolean),
        ...tutorReviews.map(r => r.tutor_id).filter(Boolean),
      ])];
      if (tutorIds.length > 0) {
        const profilesMap = {};
        await Promise.all(tutorIds.map(async (tid) => {
          try {
            const profiles = await base44.entities.TutorProfile.filter({ user_id: tid });
            if (profiles.length > 0) profilesMap[tid] = profiles[0];
          } catch {}
        }));
        setTutorProfiles(profilesMap);
      }
    } catch (e) {
      console.error("[LessonsAndNotesSection] load error:", e);
    } finally { setLoading(false); }
  };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });

  const formatDateTime = (d) =>
    new Date(d).toLocaleString(locale, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  const tutorNameFor = (tutorId) =>
    tutorProfiles[tutorId]?.display_name || tutorProfiles[tutorId]?.full_name || tr(lang, "tutorFallback");

  // Group shared notes by tutor
  const notesByTutor = useMemo(() => {
    const map = {};
    notes.forEach(n => {
      if (!map[n.tutor_id]) map[n.tutor_id] = [];
      map[n.tutor_id].push(n);
    });
    return map;
  }, [notes]);

  // Group tutor-authored reviews by tutor
  const reviewsByTutor = useMemo(() => {
    const map = {};
    reviews.forEach(r => {
      if (!map[r.tutor_id]) map[r.tutor_id] = [];
      map[r.tutor_id].push(r);
    });
    return map;
  }, [reviews]);

  const hasNotes = Object.keys(notesByTutor).length > 0;
  const hasReviews = Object.keys(reviewsByTutor).length > 0;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!hasNotes && !hasReviews) return null;

  const TABS = [
    { id: "notes", label: tr(lang, "tabNotes"), show: hasNotes },
    { id: "reviews", label: tr(lang, "tabReviews"), show: hasReviews },
  ].filter(t => t.show);

  // If the active tab has no data (e.g. notes existed before but were deleted),
  // fall back to the first available tab.
  const activeTab = TABS.some(t => t.id === tab) ? tab : (TABS[0]?.id || "notes");

  const renderStars = (rating) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} className={`w-3.5 h-3.5 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-gray-500"}`} />
      ))}
    </div>
  );

  return (
    <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
      <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
        <StickyNote className="w-5 h-5 text-orange-400" /> {tr(lang, "sectionTitle")}
      </h3>

      {/* Tab toggle */}
      {TABS.length > 1 && (
        <div className="flex gap-2 mb-5 p-1 rounded-2xl bg-white/5 border border-white/10 w-fit">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === t.id
                  ? "bg-orange-500 text-white shadow"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* NOTAS TAB */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {hasNotes ? (
            Object.entries(notesByTutor).map(([tutorId, tutorNotes]) => {
              const tutorName = tutorNameFor(tutorId);
              const count = tutorNotes.length;
              return (
                <div key={tutorId} className="p-4 rounded-2xl bg-orange-500/5 border border-orange-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{tutorName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="theme-heading font-semibold text-white text-sm">
                        {tr(lang, "notesFrom", { tutor: tutorName })}
                      </p>
                      <p className="theme-subtext text-xs text-gray-500">
                        {tr(lang, `notesCount${pluralKey(count)}`, { n: count })}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {tutorNotes.map(n => {
                      const lesson = n.lesson_id ? linkedLessons[n.lesson_id] : null;
                      return (
                        <div key={n.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                          {lesson && (
                            <p className="flex items-center gap-1.5 text-xs text-orange-300 mb-2">
                              <Calendar className="w-3.5 h-3.5" />
                              {tr(lang, "lessonOf", { date: formatDateTime(lesson.ended_at || lesson.scheduled_at) })}
                            </p>
                          )}
                          <p className="theme-heading text-white text-sm whitespace-pre-wrap break-words leading-relaxed">
                            {n.content}
                          </p>
                          <p className="theme-subtext text-xs text-gray-500 mt-2">{formatDate(n.updated_date)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="theme-subtext text-sm text-gray-500 py-6 text-center">{tr(lang, "noNotes")}</p>
          )}
        </div>
      )}

      {/* AVALIAÇÕES TAB */}
      {activeTab === "reviews" && (
        <div className="space-y-4">
          {hasReviews ? (
            Object.entries(reviewsByTutor).map(([tutorId, tutorReviews]) => {
              const tutorName = tutorNameFor(tutorId);
              const count = tutorReviews.length;
              return (
                <div key={tutorId} className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{tutorName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="theme-heading font-semibold text-white text-sm">
                        {tr(lang, "reviewsFrom", { tutor: tutorName })}
                      </p>
                      <p className="theme-subtext text-xs text-gray-500">
                        {tr(lang, `reviewsCount${pluralKey(count)}`, { n: count })}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {tutorReviews.map(r => {
                      const lesson = r.lesson_id ? linkedLessons[r.lesson_id] : null;
                      return (
                        <div key={r.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                          {lesson && (
                            <p className="flex items-center gap-1.5 text-xs text-amber-300 mb-2">
                              <Calendar className="w-3.5 h-3.5" />
                              {tr(lang, "lessonOf", { date: formatDateTime(lesson.ended_at || lesson.scheduled_at) })}
                            </p>
                          )}
                          <div className="mb-2">{renderStars(r.rating)}</div>
                          {r.comment && (
                            <p className="theme-heading text-white text-sm whitespace-pre-wrap break-words leading-relaxed">
                              {r.comment}
                            </p>
                          )}
                          <p className="theme-subtext text-xs text-gray-500 mt-2">{formatDate(r.created_date)}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-10">
              <Star className="w-10 h-10 text-gray-600 mx-auto mb-3" />
              <p className="theme-subtext text-sm text-gray-500">{tr(lang, "noReviews")}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}