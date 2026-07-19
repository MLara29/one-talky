import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, DollarSign, Star, Users, AlertCircle, X, Bell, MessageSquare } from "lucide-react";
import SupportModal from "@/components/support/SupportModal";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

export default function TutorDashboard() {
  const { user } = useAuth();
  const lang = "en"; // Tutors always see the interface in English
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [completedLessons, setCompletedLessons] = useState([]);
  const [studentProfiles, setStudentProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [liveAlert, setLiveAlert] = useState(null);
  const [showSupport, setShowSupport] = useState(false);
  const prevLessonsRef = useRef([]);

  useEffect(() => { loadData(); }, [user]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (!user) return;
      try {
        const live = await base44.entities.Lesson.filter({ tutor_id: user.id, status: "in_progress" });
        const sched = await base44.entities.Lesson.filter({ tutor_id: user.id, status: "scheduled" });
        const allLessons = [...live, ...sched];
        const prevIds = prevLessonsRef.current.filter(l => l.status === "in_progress").map(l => l.id);
        const newLive = live.find(l => !prevIds.includes(l.id));
        if (newLive) {
          setLiveAlert(newLive);
          toast({ title: "📞 Live lesson!", description: `${newLive.student_name} is waiting for you!` });
        }
        prevLessonsRef.current = allLessons;
        setLessons(allLessons);
      } catch {}
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Heartbeat: update last_seen every 2 min while tutor is logged in
  useEffect(() => {
    let profileId = null;
    const beat = async () => {
      if (!user?.id) return;
      if (!profileId) {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) profileId = profiles[0].id;
      }
      if (profileId) {
        await base44.entities.TutorProfile.update(profileId, { last_seen: new Date().toISOString() });
      }
    };
    beat();
    const interval = setInterval(beat, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  const loadData = async () => {
    try {
      const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
      if (profiles.length > 0) {
        setProfile(profiles[0]);
        const [live, sched, completed] = await Promise.all([
          base44.entities.Lesson.filter({ tutor_id: user.id, status: "in_progress" }),
          base44.entities.Lesson.filter({ tutor_id: user.id, status: "scheduled" }),
          base44.entities.Lesson.filter({ tutor_id: user.id, status: "completed" }, "-created_date", 100),
        ]);
        const allLessons = [...live, ...sched];
        prevLessonsRef.current = allLessons;
        setLessons(allLessons);
        setCompletedLessons(completed);

        // Load student profiles for upcoming lessons
        const studentIds = [...new Set(allLessons.map(l => l.student_id).filter(Boolean))];
        if (studentIds.length > 0) {
          const studentProfs = await base44.entities.StudentProfile.filter({});
          const map = {};
          studentProfs.forEach(sp => { map[sp.user_id] = sp; });
          setStudentProfiles(map);
        }
      }
    } catch {} finally { setLoading(false); }
  };

  const toggleAvailability = async () => {
    if (!profile) return;
    await base44.entities.TutorProfile.update(profile.id, { is_available_now: !profile.is_available_now });
    setProfile({ ...profile, is_available_now: !profile.is_available_now });
  };

  const rejectLesson = async (lessonId) => {
    try {
      await base44.entities.Lesson.update(lessonId, { status: "cancelled" });
      setLessons(prev => prev.filter(l => l.id !== lessonId));
      toast({ title: "Lesson cancelled" });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  if (!profile) return (
    <div className="text-center py-24">
      <AlertCircle className="theme-muted-icon w-12 h-12 text-gray-400 mx-auto mb-4" />
      <h3 className="theme-heading font-display font-bold text-white mb-1">Profile not found</h3>
      <p className="theme-subtext text-sm text-gray-500">Complete your tutor onboarding first.</p>
    </div>
  );

  if (profile.status === "pending") return (
    <div className="text-center py-24 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
        <Clock className="w-8 h-8 text-amber-500" />
      </div>
      <h2 className="theme-heading font-display text-2xl font-bold text-white mb-3">{t(lang, "appUnderReview")}</h2>
      <p className="theme-subtext text-gray-500 text-sm">{t(lang, "appUnderReviewDesc")}</p>
    </div>
  );

  if (profile.status === "rejected") return (
    <div className="text-center py-24 max-w-md mx-auto">
      <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-6">
        <AlertCircle className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="theme-heading font-display text-2xl font-bold text-white mb-3">{t(lang, "appNotApproved")}</h2>
      <p className="theme-subtext text-gray-500 text-sm">{t(lang, "appNotApprovedDesc")}</p>
    </div>
  );

  const stats = [
    { label: t(lang, "totalLessons"), value: profile.total_lessons || 0, icon: Users, gradient: "from-orange-500 to-amber-500" },
    { label: t(lang, "minutesTaught"), value: profile.total_minutes || 0, icon: Clock, gradient: "from-blue-500 to-cyan-500" },
    { label: t(lang, "rating"), value: profile.average_rating?.toFixed(1) || "N/A", icon: Star, gradient: "from-amber-400 to-orange-500" },
    { label: t(lang, "earnings"), value: `$${completedLessons.reduce((s, l) => s + (l.duration_minutes || 0) * (profile.price_per_minute || 0.9967), 0).toFixed(2)}`, icon: DollarSign, gradient: "from-emerald-500 to-teal-500" },
  ];

  return (
    <div>
      {liveAlert && (
        <div className="mb-6 flex items-center justify-between gap-4 bg-gradient-to-r from-red-500/15 to-rose-500/10 border border-red-500/30 rounded-2xl px-5 py-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <p className="theme-heading font-semibold text-white text-sm">📞 {liveAlert.student_name}!</p>
              <p className="theme-subtext text-xs text-red-500">Live lesson now</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link to={`/classroom/${liveAlert.id}`}>
              <Button size="sm" className="bg-gradient-to-r from-red-500 to-rose-600 text-white border-0 shadow-lg shadow-red-500/30">
                Join now
              </Button>
            </Link>
            <button onClick={() => setLiveAlert(null)} className="theme-subtext text-gray-500 hover:text-gray-700 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">
            {t(lang, "welcomeBack")}, {profile.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="theme-subtext text-gray-500 text-sm mt-1">{t(lang, "teachingOverview")}</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => setShowSupport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
          >
            <MessageSquare className="w-4 h-4" /> {t(lang, "speakWithSupport")}
          </button>
          <div className="theme-card flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3 rounded-2xl">
            <div className={`w-2.5 h-2.5 rounded-full ${profile.is_available_now ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`} />
            <Label className="theme-subtext text-sm font-medium text-gray-500">{t(lang, "availableNowToggle")}</Label>
            <Switch checked={profile.is_available_now} onCheckedChange={toggleAvailability} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(s => (
          <div key={s.label} className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/8 transition-all">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${s.gradient} flex items-center justify-center mb-4 shadow-lg`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="theme-heading font-display text-2xl font-bold text-white">{s.value}</p>
            <p className="theme-subtext text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}

      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-6">
        <h2 className="theme-heading font-display font-bold text-white mb-5">{t(lang, "upcomingLessons")}</h2>
        {lessons.length === 0 ? (
          <p className="theme-subtext text-sm text-gray-500 py-6 text-center">{t(lang, "noUpcomingLessons")}</p>
        ) : (
          <div className="space-y-3">
            {lessons.map(l => {
              const sp = studentProfiles[l.student_id];
              return (
                <div key={l.id} className="p-4 rounded-2xl bg-white/5 border border-white/5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="theme-heading font-semibold text-white">{l.student_name}</p>
                      <p className="theme-subtext text-sm text-gray-500 mt-0.5">
                        {l.language} · {l.status === "in_progress" ? t(lang, "liveNow") : new Date(l.scheduled_at).toLocaleString()}
                      </p>
                      {sp && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/15 border border-orange-500/20 text-orange-300 font-medium capitalize">
                            {sp.level}
                          </span>
                          {sp.conversation_topics?.slice(0, 3).map(topic => (
                            <span key={topic} className="text-xs px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400">
                              {topic}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Link to={`/classroom/${l.id}`}>
                        <Button size="sm" className={`text-white border-0 hover:scale-105 transition-transform shadow-lg ${l.status === "in_progress" ? "bg-gradient-to-r from-red-500 to-rose-600 shadow-red-500/20" : "bg-gradient-to-r from-orange-500 to-amber-500 shadow-orange-500/20"}`}>
                          {l.status === "in_progress" ? t(lang, "joinNow") : t(lang, "join")}
                        </Button>
                      </Link>
                      <button
                        onClick={() => rejectLesson(l.id)}
                        className="w-8 h-8 rounded-xl flex items-center justify-center bg-red-500/10 hover:bg-red-500/20 text-red-500 hover:text-red-600 border border-red-500/20 transition-all hover:scale-105"
                        title="Cancel lesson"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}