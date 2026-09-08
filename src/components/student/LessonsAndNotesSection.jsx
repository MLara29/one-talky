import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { Calendar, Clock, StickyNote } from "lucide-react";

// Student-facing section shown on the Progress page. Split into two internal
// tabs: "Aulas" (completed lesson history by tutor) and "Notas do tutor" (only
// SHARED notes, which are the main content the student wants to see quickly).
//
// RLS on TutorNote guarantees private notes are never returned to the student —
// the filter({ student_id }) call only yields notes where type === "shared".
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
    sectionTitle: "Aulas e notas do tutor",
    tabLessons: "Aulas",
    tabNotes: "Notas do tutor",
    lessonsCount_one: "{n} aula",
    lessonsCount_other: "{n} aulas",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    notesFrom: "Notas de {tutor}",
    noLessons: "Nenhuma aula concluída ainda.",
    noNotes: "Nenhuma nota compartilhada ainda.",
    more: "+{n} mais",
    min: "min",
    tutorFallback: "Tutor",
  },
  pt_pt: {
    sectionTitle: "Aulas e notas do tutor",
    tabLessons: "Aulas",
    tabNotes: "Notas do tutor",
    lessonsCount_one: "{n} aula",
    lessonsCount_other: "{n} aulas",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    notesFrom: "Notas de {tutor}",
    noLessons: "Ainda não tem aulas concluídas.",
    noNotes: "Ainda não tem notas partilhadas.",
    more: "+{n} mais",
    min: "min",
    tutorFallback: "Tutor",
  },
  en: {
    sectionTitle: "Lessons & tutor notes",
    tabLessons: "Lessons",
    tabNotes: "Tutor notes",
    lessonsCount_one: "{n} lesson",
    lessonsCount_other: "{n} lessons",
    notesCount_one: "{n} note",
    notesCount_other: "{n} notes",
    notesFrom: "Notes from {tutor}",
    noLessons: "No completed lessons yet.",
    noNotes: "No shared notes yet.",
    more: "+{n} more",
    min: "min",
    tutorFallback: "Tutor",
  },
  es: {
    sectionTitle: "Clases y notas del tutor",
    tabLessons: "Clases",
    tabNotes: "Notas del tutor",
    lessonsCount_one: "{n} clase",
    lessonsCount_other: "{n} clases",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    notesFrom: "Notas de {tutor}",
    noLessons: "Aún no hay clases completadas.",
    noNotes: "Aún no hay notas compartidas.",
    more: "+{n} más",
    min: "min",
    tutorFallback: "Tutor",
  },
  fr: {
    sectionTitle: "Cours et notes du tuteur",
    tabLessons: "Cours",
    tabNotes: "Notes du tuteur",
    lessonsCount_one: "{n} cours",
    lessonsCount_other: "{n} cours",
    notesCount_one: "{n} note",
    notesCount_other: "{n} notes",
    notesFrom: "Notes de {tutor}",
    noLessons: "Aucun cours terminé pour le moment.",
    noNotes: "Aucune note partagée pour le moment.",
    more: "+{n} de plus",
    min: "min",
    tutorFallback: "Tuteur",
  },
  de: {
    sectionTitle: "Stunden & Notizen des Tutors",
    tabLessons: "Stunden",
    tabNotes: "Notizen des Tutors",
    lessonsCount_one: "{n} Stunde",
    lessonsCount_other: "{n} Stunden",
    notesCount_one: "{n} Notiz",
    notesCount_other: "{n} Notizen",
    notesFrom: "Notizen von {tutor}",
    noLessons: "Noch keine abgeschlossenen Stunden.",
    noNotes: "Noch keine geteilten Notizen.",
    more: "+{n} weitere",
    min: "Min",
    tutorFallback: "Tutor",
  },
  it: {
    sectionTitle: "Lezioni e note del tutor",
    tabLessons: "Lezioni",
    tabNotes: "Note del tutor",
    lessonsCount_one: "{n} lezione",
    lessonsCount_other: "{n} lezioni",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} note",
    notesFrom: "Note di {tutor}",
    noLessons: "Nessuna lezione completata.",
    noNotes: "Nessuna nota condivisa.",
    more: "+{n} altre",
    min: "min",
    tutorFallback: "Tutor",
  },
  ja: {
    sectionTitle: "レッスンと講師のメモ",
    tabLessons: "レッスン",
    tabNotes: "講師のメモ",
    lessonsCount_one: "{n}回のレッスン",
    lessonsCount_other: "{n}回のレッスン",
    notesCount_one: "{n}件のメモ",
    notesCount_other: "{n}件のメモ",
    notesFrom: "{tutor}からのメモ",
    noLessons: "完了したレッスンはまだありません。",
    noNotes: "共有されたメモはまだありません。",
    more: "他{n}件",
    min: "分",
    tutorFallback: "講師",
  },
  ko: {
    sectionTitle: "수업과 튜터 노트",
    tabLessons: "수업",
    tabNotes: "튜터 노트",
    lessonsCount_one: "수업 {n}회",
    lessonsCount_other: "수업 {n}회",
    notesCount_one: "노트 {n}개",
    notesCount_other: "노트 {n}개",
    notesFrom: "{tutor}의 노트",
    noLessons: "완료된 수업이 아직 없습니다.",
    noNotes: "공유된 노트가 아직 없습니다.",
    more: "+{n}개 더",
    min: "분",
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
  const [lessons, setLessons] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tutorProfiles, setTutorProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("lessons");

  const locale = LOCALE_MAP[lang] || "en-US";

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [completedLessons, sharedNotes] = await Promise.all([
        base44.entities.Lesson.filter({ student_id: user.id, status: "completed" }),
        // RLS read rule returns ONLY shared notes for the student — private
        // notes from any tutor are filtered out server-side.
        base44.entities.TutorNote.filter({ student_id: user.id }),
      ]);

      const sorted = completedLessons
        .filter(l => l.scheduled_at || l.ended_at)
        .sort((a, b) => new Date(b.ended_at || b.scheduled_at) - new Date(a.ended_at || a.scheduled_at));
      setLessons(sorted);
      setNotes(sharedNotes.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)));

      const tutorIds = [...new Set([
        ...sorted.map(l => l.tutor_id).filter(Boolean),
        ...sharedNotes.map(n => n.tutor_id).filter(Boolean),
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

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });

  const tutorNameFor = (tutorId, fallbackName) =>
    fallbackName || tutorProfiles[tutorId]?.display_name || tutorProfiles[tutorId]?.full_name || tr(lang, "tutorFallback");

  // Group lessons by tutor
  const lessonsByTutor = useMemo(() => {
    const map = {};
    lessons.forEach(l => {
      if (!map[l.tutor_id]) map[l.tutor_id] = [];
      map[l.tutor_id].push(l);
    });
    return map;
  }, [lessons]);

  // Group shared notes by tutor
  const notesByTutor = useMemo(() => {
    const map = {};
    notes.forEach(n => {
      if (!map[n.tutor_id]) map[n.tutor_id] = [];
      map[n.tutor_id].push(n);
    });
    return map;
  }, [notes]);

  const hasLessons = Object.keys(lessonsByTutor).length > 0;
  const hasNotes = Object.keys(notesByTutor).length > 0;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!hasLessons && !hasNotes) return null;

  const TABS = [
    { id: "lessons", label: tr(lang, "tabLessons"), show: hasLessons },
    { id: "notes", label: tr(lang, "tabNotes"), show: hasNotes },
  ].filter(t => t.show);

  // If only one kind of data exists, lock the tab to it (no toggle needed).
  const activeTab = TABS.some(t => t.id === tab) ? tab : (TABS[0]?.id || "lessons");

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

      {/* AULAS TAB */}
      {activeTab === "lessons" && (
        <div className="space-y-4">
          {hasLessons ? (
            Object.entries(lessonsByTutor).map(([tutorId, tutorLessons]) => {
              const tutorName = tutorNameFor(tutorId, tutorLessons[0]?.tutor_name);
              const count = tutorLessons.length;
              return (
                <div key={tutorId} className="p-4 rounded-2xl bg-white/5 border border-white/10">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
                      <span className="text-white font-bold text-sm">{tutorName.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="theme-heading font-semibold text-white text-sm">{tutorName}</p>
                      <p className="theme-subtext text-xs text-gray-500">
                        {tr(lang, `lessonsCount${pluralKey(count)}`, { n: count })}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    {tutorLessons.slice(0, 5).map(l => (
                      <div key={l.id} className="flex items-center gap-3 text-xs text-gray-400 py-1">
                        <Calendar className="w-3.5 h-3.5 shrink-0 text-gray-500" />
                        <span className="theme-subtext">{formatDate(l.ended_at || l.scheduled_at)}</span>
                        <span className="text-gray-600">·</span>
                        <span className="theme-subtext">{formatTime(l.ended_at || l.scheduled_at)}</span>
                        {l.duration_minutes > 0 && (
                          <>
                            <Clock className="w-3.5 h-3.5 shrink-0 text-gray-500 ml-1" />
                            <span className="theme-subtext">{l.duration_minutes} {tr(lang, "min")}</span>
                          </>
                        )}
                      </div>
                    ))}
                    {count > 5 && (
                      <p className="text-xs text-gray-500 pl-7">{tr(lang, "more", { n: count - 5 })}</p>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="theme-subtext text-sm text-gray-500 py-6 text-center">{tr(lang, "noLessons")}</p>
          )}
        </div>
      )}

      {/* NOTAS DO TUTOR TAB */}
      {activeTab === "notes" && (
        <div className="space-y-4">
          {hasNotes ? (
            Object.entries(notesByTutor).map(([tutorId, tutorNotes]) => {
              const tutorName = tutorNameFor(tutorId, undefined);
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
                    {tutorNotes.map(n => (
                      <div key={n.id} className="p-4 rounded-xl bg-white/5 border border-white/10">
                        <p className="theme-heading text-white text-sm whitespace-pre-wrap break-words leading-relaxed">
                          {n.content}
                        </p>
                        <p className="theme-subtext text-xs text-gray-500 mt-2">{formatDate(n.updated_date)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="theme-subtext text-sm text-gray-500 py-6 text-center">{tr(lang, "noNotes")}</p>
          )}
        </div>
      )}
    </div>
  );
}