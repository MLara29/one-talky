import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { BookOpen, Share2, Calendar, Clock } from "lucide-react";

// Student-facing section shown on the Progress page. Lists completed lessons
// grouped by tutor, and under each tutor shows the SHARED notes that tutor
// left for the student. Private notes are never returned by RLS, so they
// can never appear here.
export default function LessonsAndNotesSection() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tutorProfiles, setTutorProfiles] = useState({});
  const [loading, setLoading] = useState(true);

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

      // Sort lessons by date descending
      const sorted = completedLessons
        .filter(l => l.scheduled_at || l.ended_at)
        .sort((a, b) => new Date(b.ended_at || b.scheduled_at) - new Date(a.ended_at || a.scheduled_at));
      setLessons(sorted);
      setNotes(sharedNotes.sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date)));

      // Load tutor profiles for display names
      const tutorIds = [...new Set(sorted.map(l => l.tutor_id).filter(Boolean))];
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
    new Date(d).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });

  // Group lessons by tutor
  const byTutor = {};
  lessons.forEach(l => {
    if (!byTutor[l.tutor_id]) byTutor[l.tutor_id] = { lessons: [], tutorName: l.tutor_name };
    byTutor[l.tutor_id].lessons.push(l);
  });

  // Attach shared notes to each tutor group
  notes.forEach(n => {
    if (!byTutor[n.tutor_id]) byTutor[n.tutor_id] = { lessons: [], tutorName: "" };
    if (!byTutor[n.tutor_id].notes) byTutor[n.tutor_id].notes = [];
    byTutor[n.tutor_id].notes.push(n);
  });

  const tutorEntries = Object.entries(byTutor);

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (tutorEntries.length === 0) return null;

  return (
    <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
      <h3 className="theme-heading font-display font-bold text-white mb-5 flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-violet-400" /> Your lessons & tutor notes
      </h3>

      <div className="space-y-5">
        {tutorEntries.map(([tutorId, group]) => {
          const tutorName = group.tutorName || tutorProfiles[tutorId]?.display_name || tutorProfiles[tutorId]?.full_name || "Tutor";
          return (
            <div key={tutorId} className="p-4 rounded-2xl bg-white/5 border border-white/10">
              {/* Tutor header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center shrink-0">
                  <span className="text-white font-bold text-sm">{tutorName.charAt(0).toUpperCase()}</span>
                </div>
                <div>
                  <p className="theme-heading font-semibold text-white text-sm">{tutorName}</p>
                  <p className="theme-subtext text-xs text-gray-500">{group.lessons.length} lesson{group.lessons.length !== 1 ? "s" : ""}</p>
                </div>
              </div>

              {/* Lessons list */}
              {group.lessons.length > 0 && (
                <div className="space-y-1.5 mb-3">
                  {group.lessons.slice(0, 5).map(l => (
                    <div key={l.id} className="flex items-center gap-3 text-xs text-gray-500 py-1">
                      <Calendar className="w-3.5 h-3.5 shrink-0" />
                      <span>{formatDate(l.ended_at || l.scheduled_at)}</span>
                      {l.duration_minutes > 0 && (
                        <>
                          <Clock className="w-3.5 h-3.5 shrink-0 ml-1" />
                          <span>{l.duration_minutes} min</span>
                        </>
                      )}
                    </div>
                  ))}
                  {group.lessons.length > 5 && (
                    <p className="text-xs text-gray-600 pl-7">+{group.lessons.length - 5} more</p>
                  )}
                </div>
              )}

              {/* Shared notes from this tutor */}
              {group.notes?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  <p className="text-xs font-semibold text-blue-300 flex items-center gap-1.5 mb-2">
                    <Share2 className="w-3.5 h-3.5" /> Notes from your tutor
                  </p>
                  {group.notes.map(n => (
                    <div key={n.id} className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/15">
                      <p className="theme-heading text-white text-sm whitespace-pre-wrap break-words leading-relaxed">{n.content}</p>
                      <p className="theme-subtext text-xs text-gray-500 mt-1.5">
                        {new Date(n.updated_date).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}