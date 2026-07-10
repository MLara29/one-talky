import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Check, X, Play, MapPin } from "lucide-react";
import { getLanguageLabel, getCountryFlag } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";

export default function AdminApprovals() {
  const { toast } = useToast();
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [videoPreview, setVideoPreview] = useState(null);

  useEffect(() => { loadPending(); }, []);

  const loadPending = async () => {
    try {
      const data = await base44.entities.TutorProfile.filter({ status: "pending" }, "-created_date");
      setTutors(data);
    } catch {} finally { setLoading(false); }
  };

  const handleDecision = async (tutorId, decision) => {
    try {
      await base44.entities.TutorProfile.update(tutorId, { status: decision });
      setTutors(prev => prev.filter(t => t.id !== tutorId));
      toast({ title: decision === "approved" ? "Tutor approved ✅" : "Tutor rejected" });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Tutor Approvals</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-8">{tutors.length} pending applications</p>

      {tutors.length === 0 ? (
        <div className="theme-empty text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
          <Check className="w-12 h-12 text-emerald-500/50 mx-auto mb-4" />
          <h3 className="theme-heading font-display font-bold text-white mb-1">All caught up!</h3>
          <p className="theme-subtext text-sm text-gray-600">No pending tutor applications</p>
        </div>
      ) : (
        <div className="space-y-4">
          {tutors.map(t => (
            <div key={t.id} className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/8 transition-all">
              <div className="flex flex-col sm:flex-row gap-4">
                <img
                  src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=7c3aed&color=fff&size=80`}
                  alt={t.full_name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10"
                />
                <div className="flex-1">
                  <h3 className="theme-heading font-display font-bold text-white">{t.full_name}</h3>
                  <p className="theme-subtext text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                    <MapPin className="w-3 h-3" /> {getCountryFlag(t.country)} {t.country}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {t.native_languages?.map(l => (
                      <span key={l} className="theme-badge-violet text-xs px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-300 font-medium">
                        {getLanguageLabel(l)}
                      </span>
                    ))}
                  </div>
                  <p className="theme-subtext text-sm text-gray-500 mt-3 leading-relaxed">{t.bio}</p>

                  {t.intro_video_url && (
                    <div className="mt-3">
                      {videoPreview === t.id ? (
                        <video src={t.intro_video_url} controls autoPlay className="w-full max-w-md rounded-xl" />
                      ) : (
                        <button onClick={() => setVideoPreview(t.id)} className="flex items-center gap-2 text-sm text-violet-400 hover:text-violet-300 font-medium transition-colors">
                          <Play className="w-4 h-4" /> Watch intro video
                        </button>
                      )}
                    </div>
                  )}

                  <div className="flex gap-3 mt-5">
                    <Button onClick={() => handleDecision(t.id, "approved")} className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/30" size="sm">
                      <Check className="w-4 h-4 mr-1" /> Approve
                    </Button>
                    <Button onClick={() => handleDecision(t.id, "rejected")} size="sm" className="bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/30">
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