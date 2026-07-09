import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, X, Play, MapPin, Globe } from "lucide-react";
import { getLanguageLabel, getCountryFlag } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";

export default function AdminApprovals() {
  const { toast } = useToast();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoPreview, setVideoPreview] = useState(null);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    try {
      const data = await base44.entities.TutorProfile.filter({ status: "pending" }, "-created_date");
      setTutors(data);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleDecision = async (tutorId, decision) => {
    try {
      await base44.entities.TutorProfile.update(tutorId, { status: decision });
      setTutors(prev => prev.filter(t => t.id !== tutorId));
      toast({ title: decision === "approved" ? "Tutor approved ✅" : "Tutor rejected" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-4">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-2">Tutor Approvals</h1>
      <p className="text-gray-500 text-sm mb-6">{tutors.length} pending applications</p>

      {tutors.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Check className="w-12 h-12 text-emerald-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-1">All caught up!</h3>
          <p className="text-sm text-gray-500">No pending tutor applications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tutors.map(t => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <img
                  src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=8b5cf6&color=fff&size=80`}
                  alt={t.full_name}
                  className="w-16 h-16 rounded-2xl object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{t.full_name}</h3>
                  <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {getCountryFlag(t.country)} {t.country}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {t.native_languages?.map(l => (
                      <span key={l} className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 font-medium">
                        {getLanguageLabel(l)}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mt-3">{t.bio}</p>

                  {t.intro_video_url && (
                    <div className="mt-3">
                      {videoPreview === t.id ? (
                        <video src={t.intro_video_url} controls autoPlay className="w-full max-w-md rounded-xl" />
                      ) : (
                        <button
                          onClick={() => setVideoPreview(t.id)}
                          className="flex items-center gap-2 text-sm text-violet-600 hover:text-violet-700 font-medium"
                        >
                          <Play className="w-4 h-4" /> Watch intro video
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 mt-4">
                    <Button onClick={() => handleDecision(t.id, "approved")} className="bg-emerald-500 hover:bg-emerald-600 text-white" size="sm">
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button onClick={() => handleDecision(t.id, "rejected")} variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                      <X className="w-4 h-4 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}