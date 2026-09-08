import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Star } from "lucide-react";

export default function TutorReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        const r = await base44.entities.Review.filter({ tutor_id: user.id, author_role: "student" }, "-created_date");
        setReviews(r);
      }
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">My Reviews</h1>

      <div className="theme-card bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-3xl p-8 mb-6 text-center">
        <p className="theme-heading font-display text-5xl font-extrabold text-white mb-2">{avgRating.toFixed(1)}</p>
        <div className="flex justify-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} className={`w-5 h-5 ${n <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-400"}`} />
          ))}
        </div>
        <p className="theme-subtext text-sm text-gray-500">{reviews.length} reviews</p>
      </div>

      {reviews.length === 0 ? (
        <div className="theme-empty text-center py-16 bg-white/3 border border-white/5 rounded-3xl">
          <Star className="theme-muted-icon w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="theme-heading font-display font-bold text-white mb-1">No reviews yet</h3>
          <p className="theme-subtext text-sm text-gray-600">Reviews will appear after your first lesson</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reviews.map(r => (
            <div key={r.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
              <div className="flex items-center justify-between mb-2">
                <span className="theme-heading font-semibold text-white text-sm">{r.student_name || "Student"}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(n => (
                    <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-400"}`} />
                  ))}
                </div>
              </div>
              {r.comment && <p className="theme-subtext text-sm text-gray-500">{r.comment}</p>}
              <p className="theme-subtext text-xs text-gray-500 mt-2">{new Date(r.created_date).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}