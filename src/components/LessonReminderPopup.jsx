import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { X, Clock } from "lucide-react";

const REMINDER_WINDOW_MS = 5 * 60 * 1000;   // 5 minutes before
const CHECK_INTERVAL_MS  = 30 * 1000;         // check every 30s

// Tutor messages always in English
function getTutorMessage(lesson) {
  return `Reminder: your lesson with student "${lesson.student_name}" starts in 5 minutes.`;
}

// Student messages follow their UI language
const STUDENT_MSG = {
  en:    (name) => `Reminder: your lesson with tutor "${name}" starts in 5 minutes.`,
  pt_br: (name) => `Lembrete: sua aula com o tutor "${name}" começa em 5 minutos.`,
  pt_pt: (name) => `Lembrete: a sua aula com o tutor "${name}" começa em 5 minutos.`,
  es:    (name) => `Recordatorio: tu clase con el tutor "${name}" comienza en 5 minutos.`,
  fr:    (name) => `Rappel : votre leçon avec le tuteur "${name}" commence dans 5 minutes.`,
  de:    (name) => `Erinnerung: Deine Lektion mit Tutor "${name}" beginnt in 5 Minuten.`,
  it:    (name) => `Promemoria: la tua lezione con il tutor "${name}" inizia tra 5 minuti.`,
};

// Aviso puramente informativo — sem link/botão pra entrar na aula, pra
// nenhum dos dois papéis. O aluno é quem sempre inicia a aula via "My
// Lessons"; o tutor é avisado separadamente quando o aluno de fato entrar.
export default function LessonReminderPopup() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [reminder, setReminder] = useState(null); // { message }
  const notifiedIds = useRef(new Set());

  useEffect(() => {
    if (!user?.id || (user.role !== "tutor" && user.role !== "student")) return;

    const check = async () => {
      try {
        const now = Date.now();
        let lessons;
        if (user.role === "tutor") {
          lessons = await base44.entities.Lesson.filter({ tutor_id: user.id, status: "scheduled" });
        } else {
          lessons = await base44.entities.Lesson.filter({ student_id: user.id, status: "scheduled" });
        }

        for (const lesson of lessons) {
          if (!lesson.scheduled_at) continue;
          if (notifiedIds.current.has(lesson.id)) continue;

          const diff = new Date(lesson.scheduled_at).getTime() - now;
          // Fire if within [0, 5min] window
          if (diff > 0 && diff <= REMINDER_WINDOW_MS) {
            notifiedIds.current.add(lesson.id);
            const message = user.role === "tutor"
              ? getTutorMessage(lesson)
              : (STUDENT_MSG[lang] || STUDENT_MSG.en)(lesson.tutor_name);
            setReminder({ message });
            break; // show one at a time
          }
        }
      } catch {}
    };

    check();
    const interval = setInterval(check, CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [user?.id, user?.role, lang]);

  if (!reminder) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] max-w-sm w-full animate-fade-up">
      <div
        className="rounded-2xl shadow-2xl border p-5 flex gap-4 items-start"
        style={{
          background: "linear-gradient(135deg, #fff7f0 0%, #fff3ea 100%)",
          borderColor: "#f97316",
          boxShadow: "0 8px 32px rgba(249,115,22,0.25)",
        }}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center">
          <Clock className="w-5 h-5 text-orange-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-orange-700 mb-1">⏰ Lesson Reminder</p>
          <p className="text-sm text-gray-700 leading-snug">{reminder.message}</p>
        </div>
        <button
          onClick={() => setReminder(null)}
          className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
