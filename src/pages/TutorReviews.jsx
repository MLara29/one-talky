import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Star } from "lucide-react";

export default function TutorReviews() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        const r = await base44.entities.Review.filter({ tutor_id: profiles[0].id }, "-created_date");
        setReviews(r);
      }
    } catch {} finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const avgRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

  return (
    <div className="pb-20 lg:pb-4">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">My Reviews</h1>

      <div className="bg-white rounded-2xl border border-gray-100 p-6 mb-6 text-center">
        <p className="text-4xl font-bold text-gray-900 mb-1">{avgRating.toFixed(1)}</p>
        <div className="flex justify-center gap-1 mb-2">
          {[1, 2, 3, 4, 5].map(n => (
            <Star key={n} className={`w-5 h-5 ${n <= Math.round(avgRating) ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
          ))}
        </div>
        <p className="text-sm text-gray-500">{reviews.length} reviews</p>
      </div>

      <div className="space-y-3">
        {reviews.map(r => (
          <div key={r.id} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-gray-900 text-sm">{r.student_name || "Student"}</span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(n => (
                  <Star key={n} className={`w-3.5 h-3.5 ${n <= r.rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
                ))}
              </div>
            </div>
            {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
            <p className="text-xs text-gray-400 mt-2">{new Date(r.created_date).toLocaleDateString()}</p>
          </div>
        ))}
        {reviews.length === 0 && (
          <div className="text-center py-16">
            <Star className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="font-semibold text-gray-900 mb-1">No reviews yet</h3>
            <p className="text-sm text-gray-500">Reviews will appear after your first lesson</p>
          </div>
        )}
      </div>
    </div>
  );
}