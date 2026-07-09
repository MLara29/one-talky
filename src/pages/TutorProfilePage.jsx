import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Star, Circle, Globe, Clock, MapPin, Video, Calendar, ChevronLeft, MessageCircle } from "lucide-react";
import { getCountryFlag, getLanguageLabel } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";

export default function TutorProfilePage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tutor, setTutor] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    loadTutor();
  }, [id]);

  const loadTutor = async () => {
    try {
      const t = await base44.entities.TutorProfile.get(id);
      setTutor(t);
      const r = await base44.entities.Review.filter({ tutor_id: id, is_visible: true });
      setReviews(r);
    } catch {} finally {
      setLoading(false);
    }
  };

  const startInstantLesson = async () => {
    setBooking(true);
    try {
      const studentProfiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      const sp = studentProfiles[0];
      const lesson = await base44.entities.Lesson.create({
        tutor_id: tutor.id,
        student_id: sp?.id || user.id,
        tutor_name: tutor.full_name,
        student_name: sp?.full_name || user.full_name,
        language: tutor.native_languages?.[0] || "english",
        status: "in_progress",
        type: "instant",
        started_at: new Date().toISOString(),
      });
      navigate(`/classroom/${lesson.id}`);
    } catch {
      toast({ title: "Error", description: "Could not start lesson.", variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  const scheduleLesson = async () => {
    setBooking(true);
    try {
      const studentProfiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      const sp = studentProfiles[0];
      const lesson = await base44.entities.Lesson.create({
        tutor_id: tutor.id,
        student_id: sp?.id || user.id,
        tutor_name: tutor.full_name,
        student_name: sp?.full_name || user.full_name,
        language: tutor.native_languages?.[0] || "english",
        status: "scheduled",
        type: "scheduled",
        scheduled_at: new Date(Date.now() + 86400000).toISOString(),
      });
      toast({ title: "Lesson scheduled! 📅", description: "Check 'My Lessons' to see your booking." });
    } catch {
      toast({ title: "Error", description: "Could not schedule.", variant: "destructive" });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!tutor) {
    return <div className="text-center py-20 text-gray-500">Tutor not found</div>;
  }

  return (
    <div className="pb-20 lg:pb-4 max-w-3xl mx-auto">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start gap-6">
            <div className="relative">
              <img
                src={tutor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=8b5cf6&color=fff&size=120`}
                alt={tutor.full_name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-2xl object-cover"
              />
              {tutor.is_available_now && (
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-400 border-2 border-white rounded-full" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="font-display text-2xl font-bold text-gray-900">{tutor.full_name}</h1>
              <p className="text-gray-500 flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" /> {getCountryFlag(tutor.country)} {tutor.country}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <span className="flex items-center gap-1 text-amber-500 font-semibold">
                  <Star className="w-4 h-4 fill-amber-400" /> {tutor.average_rating?.toFixed(1) || "New"}
                </span>
                <span className="text-sm text-gray-500">{tutor.total_reviews || 0} reviews</span>
                <span className="text-sm text-gray-500">{tutor.total_lessons || 0} lessons</span>
              </div>
              <div className="flex flex-wrap gap-2 mt-3">
                {tutor.native_languages?.map(l => (
                  <span key={l} className="text-xs px-3 py-1 rounded-full bg-violet-50 text-violet-600 font-medium">
                    {getLanguageLabel(l)} (Native)
                  </span>
                ))}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">${tutor.price_per_minute?.toFixed(2)}</p>
              <p className="text-sm text-gray-400">per minute</p>
            </div>
          </div>
        </div>

        {/* Video */}
        {tutor.intro_video_url && (
          <div className="px-6 sm:px-8 pb-6">
            <video src={tutor.intro_video_url} controls className="w-full rounded-xl bg-gray-100" style={{ maxHeight: 360 }} />
          </div>
        )}

        {/* Bio */}
        <div className="px-6 sm:px-8 pb-6">
          <h3 className="font-semibold text-gray-900 mb-2">About</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{tutor.bio}</p>
        </div>

        {/* Interests */}
        {tutor.interests?.length > 0 && (
          <div className="px-6 sm:px-8 pb-6">
            <h3 className="font-semibold text-gray-900 mb-2">Conversation topics</h3>
            <div className="flex flex-wrap gap-2">
              {tutor.interests.map(i => (
                <span key={i} className="text-xs px-3 py-1.5 rounded-full bg-gray-50 text-gray-600 border border-gray-100">{i}</span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="px-6 sm:px-8 pb-8 flex flex-col sm:flex-row gap-3">
          {tutor.is_available_now && (
            <Button
              onClick={startInstantLesson}
              disabled={booking}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white h-12 rounded-xl"
            >
              <Video className="w-4 h-4 mr-2" /> {booking ? "Starting..." : "Lesson now"}
            </Button>
          )}
          <Button
            onClick={scheduleLesson}
            disabled={booking}
            variant={tutor.is_available_now ? "outline" : "default"}
            className={`flex-1 h-12 rounded-xl ${!tutor.is_available_now ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}`}
          >
            <Calendar className="w-4 h-4 mr-2" /> Schedule lesson
          </Button>
        </div>
      </div>

      {/* Reviews */}
      <div className="mt-6 bg-white rounded-2xl border border-gray-100 p-6 sm:p-8">
        <h3 className="font-semibold text-gray-900 mb-4">Reviews ({reviews.length})</h3>
        {reviews.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {reviews.map(r => (
              <div key={r.id} className="border-b border-gray-50 pb-4 last:border-0 last:pb-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm text-gray-900">{r.student_name || "Student"}</span>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>
                {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}