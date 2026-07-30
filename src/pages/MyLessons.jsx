import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Calendar, Clock, CheckCircle, Settings2, AlertTriangle } from "lucide-react";
import { getLanguageLabel } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import CancelRescheduleModal from "@/components/lessons/CancelRescheduleModal";
import StudentCancelModal from "@/components/lessons/StudentCancelModal";

export default function MyLessons() {
  const { user } = useAuth();
  const { lang } = useLang();
  const { toast } = useToast();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managingLesson, setManagingLesson] = useState(null);
  const [tutorProfile, setTutorProfile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancellingLesson, setCancellingLesson] = useState(null);

  const T = (key) => t(lang, key);

  useEffect(() => { loadData(); }, [user]);

  // Real-time refresh for tutors
  useEffect(() => {
    if (user?.role !== "tutor") return;
    const unsubscribe = base44.entities.Lesson.subscribe((event) => {
      if (event.type === "create" && event.data?.tutor_id === user.id) {
        setLessons(prev => {
          if (prev.find(l => l.id === event.data.id)) return prev;
          return [event.data, ...prev];
        });
      }
      if ((event.type === "update" || event.type === "delete") && event.data?.tutor_id === user.id) {
        setLessons(prev => prev.map(l => l.id === event.data.id ? { ...l, ...event.data } : l));
      }
    });
    return unsubscribe;
  }, [user?.id, user?.role]);

  const loadData = async () => {
    try {
      let data;
      if (user?.role === "tutor") {
        data = await base44.entities.Lesson.filter({ tutor_id: user.id }, "-created_date");
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) setTutorProfile(profiles[0]);
      } else {
        data = await base44.entities.Lesson.filter({ student_id: user.id }, "-created_date");
      }
      setLessons(data || []);
    } catch {} finally { setLoading(false); }
  };

  const handleStudentCancel = async (message) => {
    if (!cancellingLesson) return;
    setActionLoading(true);
    try {
      await base44.functions.invoke('cancelLesson', { lesson_id: cancellingLesson.id, message });
      setLessons(prev => prev.map(l => l.id === cancellingLesson.id ? { ...l, status: "cancelled" } : l));
      setCancellingLesson(null);
      toast({ title: T("cancelLesson"), description: message ? T("msgToTutor") : "" });
    } catch {
      toast({ title: "Error cancelling", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleCancel = async (message) => {
    if (!managingLesson) return;
    setActionLoading(true);
    try {
      await base44.functions.invoke('cancelLesson', { lesson_id: managingLesson.id, message });
      setLessons(prev => prev.map(l => l.id === managingLesson.id ? { ...l, status: "cancelled" } : l));
      setManagingLesson(null);
      toast({ title: "Lesson cancelled", description: message ? "Message sent to student." : "" });
    } catch {
      toast({ title: "Error cancelling", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleReschedule = async (newScheduledAt, message) => {
    if (!managingLesson) return;
    setActionLoading(true);
    try {
      await base44.functions.invoke('rescheduleLesson', { lesson_id: managingLesson.id, new_scheduled_at: newScheduledAt, message });
      setLessons(prev => prev.map(l => l.id === managingLesson.id ? { ...l, scheduled_at: newScheduledAt } : l));
      setManagingLesson(null);
      toast({ title: "Lesson rescheduled! 📅", description: message ? "Message sent to student." : "" });
    } catch {
      toast({ title: "Error rescheduling", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const now = Date.now();
  const upcoming = lessons
    .filter(l => l.status === "scheduled" && (!l.scheduled_at || new Date(l.scheduled_at).getTime() > now))
    .sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime());
  const completed = lessons.filter(l => l.status === "completed");
  const inProgress = lessons.filter(l => l.status === "in_progress");

  const canJoin = (l) => {
    if (user?.role !== "tutor") return true;
    if (!l.scheduled_at) return true;
    const startsIn = new Date(l.scheduled_at).getTime() - now;
    return startsIn <= 10 * 60 * 1000;
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-4">
        {user?.role === "student" ? T("myLessons") : "My Lessons"}
      </h1>

      {user?.role === "student" && (
        <div className="mb-4 space-y-2">
          {/* Cancellation policy */}
          <div className="flex gap-2 items-start rounded-2xl p-4 text-sm" style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}>
            <Clock className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#F26A1B" }} />
            <span style={{ color: "var(--app-text-primary)" }}>
              <strong style={{ color: "#F26A1B" }}>{T("cancelPolicy")}:</strong>{" "}
              {T("cancelPolicyText")}
            </span>
          </div>
          {/* No-show policy */}
          <div className="flex gap-2 items-start rounded-2xl p-4 text-sm" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <span style={{ color: "var(--app-text-primary)" }}>
              <strong className="text-red-400">{T("noShowPolicy")}:</strong>{" "}
              {T("noShowPolicyText")}
            </span>
          </div>
        </div>
      )}

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            {user?.role === "student" ? T("upcomingTab") : "Upcoming"} ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            {user?.role === "student" ? T("completedTab") : "Completed"} ({completed.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {inProgress.length > 0 && (
            <div className="mb-4 space-y-3">
              {inProgress.map(l => (
                <div key={l.id} className="theme-card bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="theme-heading font-semibold text-white">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="theme-subtext text-sm text-gray-500">{getLanguageLabel(l.language)} · {user?.role === "student" ? T("inProgress") : "In progress"}</p>
                    </div>
                  </div>
                  <Link to={`/classroom/${l.id}`}>
                    <Button size="sm" className="bg-blue-500 text-white hover:bg-blue-600 border-0">
                      {user?.role === "student" ? T("rejoinBtn") : "Rejoin"}
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
          {upcoming.length === 0 ? (
            <div className="theme-empty text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
              <Calendar className="theme-muted-icon w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="theme-heading font-display font-bold text-white mb-1">
                {user?.role === "student" ? T("noUpcomingLessons2") : "No upcoming lessons"}
              </h3>
              <p className="theme-subtext text-sm text-gray-600 mb-5">
                {user?.role === "student" ? T("noUpcomingLessonsSub") : ""}
              </p>
              {user?.role === "student" && (
                <Link to="/dashboard">
                  <Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0">
                    {T("findTutors")}
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(l => (
                <div key={l.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/8 transition-all">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    <div>
                      <p className="theme-heading font-semibold text-white">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="theme-subtext text-sm text-gray-500">
                        {getLanguageLabel(l.language)} · {l.scheduled_at ? new Date(l.scheduled_at).toLocaleString() : (user?.role === "student" ? T("instant") : "Instant")}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user?.role === "tutor" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setManagingLesson(l)}
                        className="border-white/10 text-gray-400 hover:text-white hover:border-white/20 bg-transparent"
                        title="Manage lesson"
                      >
                        <Settings2 className="w-4 h-4" />
                      </Button>
                    )}
                    {user?.role === "student" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setCancellingLesson(l)}
                        className="border-red-500/20 text-red-400 hover:text-red-300 hover:border-red-500/40 bg-transparent text-xs"
                      >
                        {T("cancelBtn")}
                      </Button>
                    )}
                    {canJoin(l) ? (
                      <Link to={`/classroom/${l.id}`}>
                        <Button size="sm" className={user?.role === "tutor" ? "bg-emerald-500 hover:bg-emerald-600 text-white border-0" : "bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 hover:opacity-90"}>
                          {user?.role === "student" ? T("joinBtn") : "Join"}
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-xs text-gray-500 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10">
                        {(() => { const mins = Math.ceil((new Date(l.scheduled_at).getTime() - now) / 60000); return mins > 60 ? `in ${Math.ceil(mins/60)}h` : `in ${mins}min`; })()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completed.length === 0 ? (
            <div className="theme-empty text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
              <CheckCircle className="theme-muted-icon w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="theme-heading font-display font-bold text-white mb-1">
                {user?.role === "student" ? T("noCompletedLessons") : "No completed lessons yet"}
              </h3>
              <p className="theme-subtext text-sm text-gray-600">
                {user?.role === "student" ? T("noCompletedLessonsSub") : "Your lesson history will appear here"}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map(l => (
                <div key={l.id} className="theme-card bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/8 transition-all">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="theme-heading font-semibold text-white">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="theme-subtext text-sm text-gray-500">{getLanguageLabel(l.language)} · {l.duration_minutes || 0} min{l.is_recorded && " · Recorded"}</p>
                    </div>
                  </div>
                  <div className="theme-subtext flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3 h-3" /> {new Date(l.ended_at || l.created_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {cancellingLesson && (
        <StudentCancelModal
          lesson={cancellingLesson}
          onClose={() => setCancellingLesson(null)}
          onCancel={handleStudentCancel}
          loading={actionLoading}
          lang={lang}
        />
      )}

      {managingLesson && (
        <CancelRescheduleModal
          lesson={managingLesson}
          tutorAvailability={tutorProfile?.availability}
          bookedSlots={tutorProfile?.booked_slots}
          onClose={() => setManagingLesson(null)}
          onCancel={handleCancel}
          onReschedule={handleReschedule}
          loading={actionLoading}
        />
      )}
    </div>
  );
}