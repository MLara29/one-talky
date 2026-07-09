import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Video, Calendar, Clock, CheckCircle, XCircle } from "lucide-react";
import { getLanguageLabel } from "@/lib/constants";

export default function MyLessons() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadLessons(); }, [user]);

  const loadLessons = async () => {
    try {
      let data;
      if (user?.role === "tutor") {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) data = await base44.entities.Lesson.filter({ tutor_id: profiles[0].id }, "-created_date");
      } else {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) data = await base44.entities.Lesson.filter({ student_id: profiles[0].id }, "-created_date");
      }
      setLessons(data || []);
    } catch {} finally { setLoading(false); }
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
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-8">My Lessons</h1>

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
                <div key={l.id} className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-blue-400" />
                    <div>
                      <p className="font-semibold text-white">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="text-sm text-gray-500">{getLanguageLabel(l.language)} · In progress</p>
                    </div>
                  </div>
                  <Link to={`/classroom/${l.id}`}>
                    <Button size="sm" className="bg-blue-500/20 border border-blue-500/30 text-blue-400 hover:bg-blue-500/30">Rejoin</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
          {upcoming.length === 0 ? (
            <div className="text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
              <Calendar className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="font-display font-bold text-white mb-1">No upcoming lessons</h3>
              <p className="text-sm text-gray-600 mb-5">Find a tutor and book your next session</p>
              {user?.role === "student" && (
                <Link to="/dashboard"><Button className="bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0">Find tutors</Button></Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(l => (
                <div key={l.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/8 transition-all">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-4 h-4 text-violet-400" />
                    <div>
                      <p className="font-semibold text-white">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="text-sm text-gray-500">{getLanguageLabel(l.language)} · {l.scheduled_at ? new Date(l.scheduled_at).toLocaleString() : "Instant"}</p>
                    </div>
                  </div>
                  <Link to={`/classroom/${l.id}`}>
                    <Button size="sm" className="bg-white/10 border border-white/15 text-white hover:bg-white/15">Join</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completed.length === 0 ? (
            <div className="text-center py-20 bg-white/3 border border-white/5 rounded-3xl">
              <CheckCircle className="w-12 h-12 text-gray-700 mx-auto mb-4" />
              <h3 className="font-display font-bold text-white mb-1">No completed lessons yet</h3>
              <p className="text-sm text-gray-600">Your lesson history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map(l => (
                <div key={l.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between hover:bg-white/8 transition-all">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <div>
                      <p className="font-semibold text-white">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="text-sm text-gray-500">{getLanguageLabel(l.language)} · {l.duration_minutes || 0} min{l.is_recorded && " · Recorded"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-600">
                    <Clock className="w-3 h-3" /> {new Date(l.ended_at || l.created_date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}