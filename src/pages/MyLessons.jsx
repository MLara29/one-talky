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

  useEffect(() => {
    loadLessons();
  }, [user]);

  const loadLessons = async () => {
    try {
      let data;
      if (user?.role === "tutor") {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          data = await base44.entities.Lesson.filter({ tutor_id: profiles[0].id }, "-created_date");
        }
      } else {
        const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
        if (profiles.length > 0) {
          data = await base44.entities.Lesson.filter({ student_id: profiles[0].id }, "-created_date");
        }
      }
      setLessons(data || []);
    } catch {} finally {
      setLoading(false);
    }
  };

  const upcoming = lessons.filter(l => l.status === "scheduled");
  const completed = lessons.filter(l => l.status === "completed");
  const inProgress = lessons.filter(l => l.status === "in_progress");

  const statusIcon = (status) => {
    if (status === "completed") return <CheckCircle className="w-4 h-4 text-emerald-500" />;
    if (status === "scheduled") return <Calendar className="w-4 h-4 text-violet-500" />;
    if (status === "in_progress") return <Video className="w-4 h-4 text-blue-500" />;
    return <XCircle className="w-4 h-4 text-gray-400" />;
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
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">My Lessons</h1>

      <Tabs defaultValue="upcoming" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="completed">Completed ({completed.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming">
          {inProgress.length > 0 && (
            <div className="mb-4">
              {inProgress.map(l => (
                <div key={l.id} className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Video className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-gray-900">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="text-sm text-gray-500">{getLanguageLabel(l.language)} · In progress</p>
                    </div>
                  </div>
                  <Link to={`/classroom/${l.id}`}>
                    <Button size="sm" className="bg-blue-500 hover:bg-blue-600 text-white">Rejoin</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
          {upcoming.length === 0 ? (
            <div className="text-center py-16">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">No upcoming lessons</h3>
              <p className="text-sm text-gray-500 mb-4">Find a tutor and book your next session</p>
              {user?.role === "student" && (
                <Link to="/dashboard"><Button className="bg-violet-600 hover:bg-violet-700 text-white">Find tutors</Button></Link>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map(l => (
                <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(l.status)}
                    <div>
                      <p className="font-medium text-gray-900">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="text-sm text-gray-500">
                        {getLanguageLabel(l.language)} · {l.scheduled_at ? new Date(l.scheduled_at).toLocaleString() : "Instant"}
                      </p>
                    </div>
                  </div>
                  <Link to={`/classroom/${l.id}`}>
                    <Button size="sm" variant="outline">Join</Button>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="completed">
          {completed.length === 0 ? (
            <div className="text-center py-16">
              <CheckCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-1">No completed lessons yet</h3>
              <p className="text-sm text-gray-500">Your lesson history will appear here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {completed.map(l => (
                <div key={l.id} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusIcon(l.status)}
                    <div>
                      <p className="font-medium text-gray-900">{user?.role === "tutor" ? l.student_name : l.tutor_name}</p>
                      <p className="text-sm text-gray-500">
                        {getLanguageLabel(l.language)} · {l.duration_minutes || 0} min
                        {l.is_recorded && " · Recorded"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
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