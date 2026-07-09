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
        lesson_id: lesson.id,
        tutor_id: lesson.tutor_id,
        student_id: lesson.student_id,
        student_name: lesson.student_name || user?.full_name,
        rating,
        comment,
        language: lesson.language,
      });
      toast({ title: "Review submitted! ⭐", description: "Thanks for your feedback." });
      onClose();
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-xl font-bold text-gray-900">How was your lesson?</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <p className="text-sm text-gray-500 mb-4">
          Rate your session with {userRole === "tutor" ? lesson?.student_name : lesson?.tutor_name}
        </p>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map(n => (
            <button
              key={n}
              onMouseEnter={() => setHovered(n)}
              onMouseLeave={() => setHovered(0)}
              onClick={() => setRating(n)}
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  n <= (hovered || rating)
                    ? "fill-amber-400 text-amber-400"
                    : "text-gray-200"
                }`}
              />
            </button>
          ))}
        </div>

        <Textarea
          value={comment}
          onChange={e => setComment(e.target.value)}
          placeholder="Leave a comment (optional)..."
          className="mb-6 h-24"
        />

        <div className="flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1">Skip</Button>
          <Button
            onClick={handleSubmit}
            disabled={rating === 0 || submitting}
            className="flex-1 bg-violet-600 hover:bg-violet-700 text-white"
          >
            {submitting ? "Submitting..." : "Submit"}
          </Button>
        </div>
      </div>
    </div>
  );
}