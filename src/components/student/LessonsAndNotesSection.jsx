import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { StickyNote, Calendar } from "lucide-react";

// Student-facing section shown on the Progress page. Shows ONLY shared notes
// from tutors, grouped by tutor. A tutor appears here only if they have at
// least one shared note for this student.
//
// For each note, if the tutor linked it to a specific lesson (lesson_id), the
// date/time of that lesson is shown above the note content. General notes
// (no lesson_id) show only the note content and the date the note was written.
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
    sectionTitle: "Notas dos seus tutores",
    notesFrom: "Notas de {tutor}",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    noNotes: "Nenhuma nota compartilhada ainda.",
    lessonOf: "Aula de {date}",
    tutorFallback: "Tutor",
  },
  pt_pt: {
    sectionTitle: "Notas dos seus tutores",
    notesFrom: "Notas de {tutor}",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    noNotes: "Ainda não há notas partilhadas.",
    lessonOf: "Aula de {date}",
    tutorFallback: "Tutor",
  },
  en: {
    sectionTitle: "Notes from your tutors",
    notesFrom: "Notes from {tutor}",
    notesCount_one: "{n} note",
    notesCount_other: "{n} notes",
    noNotes: "No shared notes yet.",
    lessonOf: "Lesson on {date}",
    tutorFallback: "Tutor",
  },
  es: {
    sectionTitle: "Notas de tus tutores",
    notesFrom: "Notas de {tutor}",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} notas",
    noNotes: "Aún no hay notas compartidas.",
    lessonOf: "Clase del {date}",
    tutorFallback: "Tutor",
  },
  fr: {
    sectionTitle: "Notes de vos tuteurs",
    notesFrom: "Notes de {tutor}",
    notesCount_one: "{n} note",
    notesCount_other: "{n} notes",
    noNotes: "Aucune note partagée pour le moment.",
    lessonOf: "Cours du {date}",
    tutorFallback: "Tuteur",
  },
  de: {
    sectionTitle: "Notizen deiner Tutoren",
    notesFrom: "Notizen von {tutor}",
    notesCount_one: "{n} Notiz",
    notesCount_other: "{n} Notizen",
    noNotes: "Noch keine geteilten Notizen.",
    lessonOf: "Stunde am {date}",
    tutorFallback: "Tutor",
  },
  it: {
    sectionTitle: "Note dei tuoi tutor",
    notesFrom: "Note di {tutor}",
    notesCount_one: "{n} nota",
    notesCount_other: "{n} note",
    noNotes: "Nessuna nota condivisa.",
    lessonOf: "Lezione del {date}",
    tutorFallback: "Tutor",
  },
  ja: {
    sectionTitle: "講師からのメモ",
    notesFrom: "{tutor}からのメモ",
    notesCount_one: "{n}件のメモ",
    notesCount_other: "{n}件のメモ",
    noNotes: "共有されたメモはまだありません。",
    lessonOf: "{date}のレッスン",
    tutorFallback: "講師",
  },
  ko: {
    sectionTitle: "튜터의 노트",
    notesFrom: "{tutor}의 노트",
    notesCount_one: "노트 {n}개",
    notesCount_other: "노트 {n}개",
    noNotes: "공유된 노트가 아직 없습니다.",
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
  const [tutorProfiles, setTutorProfiles] = useState({});
  const [linkedLessons, setLinkedLessons] = useState({});
  const [loading, setLoading] = useState(true);

  const locale = LOCALE_MAP[lang] || "en-US";

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      // RLS read rule returns ONLY shared notes for the student — private
      // notes from any tutor are filtered out server-side.
      const sharedNotes = await base44.entities.TutorNote.filter({ student_id: user.id });
      const sorted = sharedNotes.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date));
      setNotes(sorted);

      // Fetch the specific lessons linked to notes that carry a lesson_id, so
      // we can display the lesson date/time above each note.
      const lessonIds = [...new Set(sorted.map(n => n.lesson_id).filter(Boolean))];
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

      // Load tutor profiles for display names
      const tutorIds = [...new Set(sorted.map(n => n.tutor_id).filter(Boolean))];
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

  const hasNotes = Object.keys(notesByTutor).length > 0;

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!hasNotes) return null;

  return (
    <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
      <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
        <StickyNote className="w-5 h-5 text-orange-400" /> {tr(lang, "sectionTitle")}
      </h3>

      <div className="space-y-4">
        {Object.entries(notesByTutor).map(([tutorId, tutorNotes]) => {
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
        })}
      </div>
    </div>
  );
}