import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, X } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";

export default function ReviewModal({ lesson, userRole, onClose }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) return;
    setSubmitting(true);
    try {
      await base44.entities.Review.create({
        lesson_id: lesson.id, tutor_id: lesson.tutor_id, student_id: lesson.student_id,
        student_name: lesson.student_name || user?.full_name, rating, comment, language: lesson.language,
      });

      // Recalculate tutor's average_rating and total_reviews
      const allReviews = await base44.entities.Review.filter({ tutor_id: lesson.tutor_id });
      const total = allReviews.length;
      const avg = total > 0 ? allReviews.reduce((sum, r) => sum + (r.rating || 0), 0) / total : 0;
      const tutorProfiles = await base44.entities.TutorProfile.filter({ user_id: lesson.tutor_id });
      if (tutorProfiles.length > 0) {
        await base44.entities.TutorProfile.update(tutorProfiles[0].id, {
          average_rating: Math.round(avg * 10) / 10,
          total_reviews: total,
        });
      }

      toast({ title: "Review submitted! ⭐" });
      onClose();
    } catch { toast({ title: "Error", variant: "destructive" }); } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="rounded-3xl w-full max-w-md p-8 shadow-2xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="theme-heading font-display text-xl font-bold">How was your lesson?</h2>
          <button onClick={onClose} className="theme-subtext hover:opacity-70 transition-opacity"><X className="w-5 h-5" /></button>
        </div>

        <p className="theme-subtext text-sm mb-6" style={{ color: "var(--app-text-secondary)" }}>
          Rate your session with {userRole === "tutor" ? lesson?.student_name : lesson?.tutor_name}
        </p>

        <div className="flex justify-center gap-3 mb-7">
          {[1, 2, 3, 4, 5].map(n => (
            <button key={n} onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)} onClick={() => setRating(n)} className="transition-transform hover:scale-110">
              <Star className={`w-10 h-10 transition-all ${n <= (hovered || rating) ? "fill-amber-400 text-amber-400" : ""}`}
                style={{ color: n <= (hovered || rating) ? undefined : "var(--app-text-muted)" }} />
            </button>
          ))}
        </div>

        <Textarea
          value={comment} onChange={e => setComment(e.target.value)}
          placeholder="Leave a comment (optional)..."
          className="mb-6 h-24 theme-input focus:border-violet-500/50"
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 theme-btn-ghost rounded-xl">Skip</Button>
          <Button
            onClick={handleSubmit} disabled={rating === 0 || submitting}
            className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 shadow-lg shadow-violet-500/20"
          >
            {submitting ? "Submitting..." : "Submit review"}
          </Button>
        </div>
      </div>
    </div>
  );
}