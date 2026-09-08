import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import TutorNotesSection from "@/components/tutor/TutorNotesSection";
import { ArrowLeft, User, Globe, BookOpen, MessageCircle } from "lucide-react";
import { getLanguageLabel, getLanguageFlag } from "@/lib/constants";

// Tutor-facing student profile. Shows the student's basic info (loaded via
// getMyStudentsProfiles, which verifies the tutor has a real lesson with the
// student) and the annotations section where the tutor manages their notes.
export default function TutorStudentProfile() {
  const { studentId } = useParams();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => { loadProfile(); }, [studentId]);

  const loadProfile = async () => {
    try {
      const res = await base44.functions.invoke("getMyStudentsProfiles", { student_ids: [studentId] });
      const profiles = res.data?.profiles || [];
      if (profiles.length > 0) {
        setProfile(profiles[0]);
      } else {
        setNotFound(true);
      }
    } catch (e) {
      console.error("[TutorStudentProfile] load error:", e);
      setNotFound(true);
    } finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (notFound) return (
    <div className="text-center py-24 max-w-md mx-auto">
      <User className="w-12 h-12 text-gray-600 mx-auto mb-4" />
      <h3 className="theme-heading font-display font-bold text-white mb-1">Student not found</h3>
      <p className="theme-subtext text-sm text-gray-500 mb-6">You can only view students you have lessons with.</p>
      <Link to="/" className="inline-flex items-center gap-2 text-orange-400 hover:text-orange-300 text-sm font-medium">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>
    </div>
  );

  return (
    <div>
      <Link to="/" className="inline-flex items-center gap-2 text-gray-500 hover:text-orange-400 text-sm font-medium mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </Link>

      {/* Student header */}
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="theme-heading font-display text-2xl font-bold text-white">{profile.full_name}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              {profile.level && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-300 font-medium capitalize">
                  {profile.level} level
                </span>
              )}
              {profile.nationality && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                  {profile.nationality}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          {profile.target_language && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <span className="text-2xl">{getLanguageFlag(profile.target_language)}</span>
              <div>
                <p className="theme-subtext text-xs text-gray-500">Learning</p>
                <p className="theme-heading text-white text-sm font-semibold">{getLanguageLabel(profile.target_language)}</p>
              </div>
            </div>
          )}
          {profile.native_language && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <Globe className="w-5 h-5 text-gray-500" />
              <div>
                <p className="theme-subtext text-xs text-gray-500">Native language</p>
                <p className="theme-heading text-white text-sm font-semibold">{getLanguageLabel(profile.native_language) || profile.native_language}</p>
              </div>
            </div>
          )}
          {profile.total_lessons != null && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <BookOpen className="w-5 h-5 text-gray-500" />
              <div>
                <p className="theme-subtext text-xs text-gray-500">Total lessons</p>
                <p className="theme-heading text-white text-sm font-semibold">{profile.total_lessons}</p>
              </div>
            </div>
          )}
          {profile.total_minutes != null && (
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/5">
              <MessageCircle className="w-5 h-5 text-gray-500" />
              <div>
                <p className="theme-subtext text-xs text-gray-500">Minutes practiced</p>
                <p className="theme-heading text-white text-sm font-semibold">{profile.total_minutes}</p>
              </div>
            </div>
          )}
        </div>

        {profile.conversation_topics?.length > 0 && (
          <div className="mt-4">
            <p className="theme-subtext text-xs text-gray-500 mb-2">Favorite topics</p>
            <div className="flex flex-wrap gap-1.5">
              {profile.conversation_topics.map(topic => (
                <span key={topic} className="text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-400">
                  {topic}
                </span>
              ))}
            </div>
          </div>
        )}

        {profile.objective && (
          <div className="mt-4 p-3 rounded-2xl bg-white/5 border border-white/5">
            <p className="theme-subtext text-xs text-gray-500 mb-1">Objective</p>
            <p className="theme-heading text-white text-sm">{profile.objective}</p>
          </div>
        )}
      </div>

      {/* Notes section */}
      <TutorNotesSection studentId={studentId} />
    </div>
  );
}