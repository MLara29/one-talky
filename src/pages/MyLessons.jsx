import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Calendar, Clock, CheckCircle, Settings2 } from "lucide-react";
import { getLanguageLabel } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";
import CancelRescheduleModal from "@/components/lessons/CancelRescheduleModal";
import StudentCancelModal from "@/components/lessons/StudentCancelModal";

export default function MyLessons() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [managingLesson, setManagingLesson] = useState(null); // lesson being managed
  const [tutorProfile, setTutorProfile] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [cancellingLesson, setCancellingLesson] = useState(null); // for student cancel

  useEffect(() => { loadData(); }, [user]);

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

  // Student cancels their own lesson
  const handleStudentCancel = async (message) => {
    if (!cancellingLesson) return;
    setActionLoading(true);
    try {
      await base44.entities.Lesson.update(cancellingLesson.id, { status: "cancelled" });

      // Release the booked slot via backend function (student can't update TutorProfile directly)
      if (cancellingLesson.scheduled_at) {
        const tutorProfiles = await base44.entities.TutorProfile.filter({ user_id: cancellingLesson.tutor_id });
        if (tutorProfiles.length > 0) {
          await base44.functions.invoke('bookSlot', {
            tutor_profile_id: tutorProfiles[0].id,
            scheduled_at: cancellingLesson.scheduled_at,
            action: 'release',
          });
        }
      }

      if (cancellingLesson.tutor_id) {
        await base44.entities.Notification.create({
          user_id: cancellingLesson.tutor_id,
          title: "Lesson cancelled by student",
          message: message
            ? `${cancellingLesson.student_name} cancelled the lesson. Message: "${message}"`
            : `${cancellingLesson.student_name} cancelled the scheduled lesson.`,
          type: "general",
          is_read: false,
        });
      }

      setLessons(prev => prev.map(l => l.id === cancellingLesson.id ? { ...l, status: "cancelled" } : l));
      setCancellingLesson(null);
      toast({ title: "Lesson cancelled", description: message ? "Message sent to tutor." : "" });
    } catch {
      toast({ title: "Error cancelling", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const handleCancel = async (message) => {
    if (!managingLesson) return;
    setActionLoading(true);
    try {
      await base44.entities.Lesson.update(managingLesson.id, { status: "cancelled" });

      // Release the booked slot via backend function
      if (managingLesson.scheduled_at) {
        await base44.functions.invoke('bookSlot', {
          tutor_profile_id: tutorProfile?.id,
          scheduled_at: managingLesson.scheduled_at,
          action: 'release',
        });
      }

      // Send notification + message to student
      if (managingLesson.student_id) {
        await base44.entities.Notification.create({
          user_id: managingLesson.student_id,
          title: "Lesson cancelled by tutor",
          message: message
            ? `Your lesson was cancelled. Message from tutor: "${message}"`
            : "Your scheduled lesson was cancelled by the tutor.",
          type: "general",
          is_read: false,
        });
      }

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
      // Release old slot, add new one via backend function
      if (tutorProfile && managingLesson.scheduled_at) {
        await base44.functions.invoke('bookSlot', {
          tutor_profile_id: tutorProfile.id,
          scheduled_at: managingLesson.scheduled_at,
          action: 'release',
        });
      }
      if (tutorProfile) {
        await base44.functions.invoke('bookSlot', {
          tutor_profile_id: tutorProfile.id,
          scheduled_at: newScheduledAt,
          action: 'book',
        });
      }

      await base44.entities.Lesson.update(managingLesson.id, { scheduled_at: newScheduledAt });

      // Notify student
      if (managingLesson.student_id) {
        const newDate = new Date(newScheduledAt).toLocaleString();
        await base44.entities.Notification.create({
          user_id: managingLesson.student_id,
          title: "Lesson rescheduled",
          message: message
            ? `Your lesson was moved to ${newDate}. Note from tutor: "${message}"`
            : `Your lesson was rescheduled to ${newDate}.`,
          type: "lesson_reminder",
          is_read: false,
        });
      }

      setLessons(prev => prev.map(l => l.id === managingLesson.id ? { ...l, scheduled_at: newScheduledAt } : l));
      setManagingLesson(null);
      toast({ title: "Lesson rescheduled! 📅", description: message ? "Message sent to student." : "" });
    } catch {
      toast({ title: "Error rescheduling", variant: "destructive" });
    } finally { setActionLoading(false); }
  };

  const upcoming = lessons.filter(l => l.status === "scheduled");
  const completed = lessons.filter(l => l.status === "completed");
  const inProgress = lessons.filter(l => l.status === "in_progress");

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-8">My Lessons</h1>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Upcoming ({upcoming.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Completed ({completed.length})
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
                      <p className="theme-subtext text-sm text-gray-500">{getLanguageLabel(l.language)} · In progress</p>
                    </div>
                  </div>
                  <Link to={`/classroom/${l.id}`}>
                    <Button size="sm" className="bg-blue-500 text-white hover:bg-blue-600 border-0">Rejoin</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
          {upcoming.length === 0 ? (
            <div className="theme-empty text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
              <Calendar className="theme-muted-icon w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="theme-heading font-display font-bold text-white mb-1">No upcoming lessons</h3>
              <p className="theme-subtext text-sm text-gray-600 mb-5">Find a tutor and book your next session</p>
              {user?.role === "student" && (
                <Link to="/dashboard"><Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0">Find tutors</Button></Link>
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
                      <p className="theme-subtext text-sm text-gray-500">{getLanguageLabel(l.language)} · {l.scheduled_at ? new Date(l.scheduled_at).toLocaleString() : "Instant"}</p>
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
                        Cancel
                      </Button>
                    )}
                    <Link to={`/classroom/${l.id}`}>
                      <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 hover:opacity-90">Join</Button>
                    </Link>
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
              <h3 className="theme-heading font-display font-bold text-white mb-1">No completed lessons yet</h3>
              <p className="theme-subtext text-sm text-gray-600">Your lesson history will appear here</p>
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