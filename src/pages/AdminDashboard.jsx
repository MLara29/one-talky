import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, GraduationCap, Video, BookOpen, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ tutors: 0, students: 0, lessons: 0, pending: 0, inProgress: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    try {
      const [tutors, students, lessons, pending, inProgress] = await Promise.all([
        base44.entities.TutorProfile.filter({ status: "approved" }),
        base44.entities.StudentProfile.list(),
        base44.entities.Lesson.filter({ status: "completed" }),
        base44.entities.TutorProfile.filter({ status: "pending" }),
        base44.entities.Lesson.filter({ status: "in_progress" }),
      ]);
      setStats({ tutors: tutors.length, students: students.length, lessons: lessons.length, pending: pending.length, inProgress: inProgress.length });
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  const cards = [
    { label: "Active tutors", value: stats.tutors, icon: GraduationCap, gradient: "from-violet-500 to-indigo-500" },
    { label: "Students", value: stats.students, icon: Users, gradient: "from-blue-500 to-cyan-500" },
    { label: "Completed lessons", value: stats.lessons, icon: BookOpen, gradient: "from-emerald-500 to-teal-500" },
    { label: "In progress now", value: stats.inProgress, icon: Video, gradient: "from-orange-500 to-red-500" },
  ];

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-8">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white/5 border border-white/10 rounded-3xl p-5 hover:bg-white/8 transition-all">
            <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${c.gradient} flex items-center justify-center mb-4 shadow-lg`}>
              <c.icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-display text-2xl font-bold text-white">{c.value}</p>
            <p className="text-xs text-gray-600 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {stats.pending > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-300">{stats.pending} pending application{stats.pending > 1 ? "s" : ""}</p>
              <p className="text-sm text-amber-500/70">Review and approve new tutors</p>
            </div>
          </div>
          <Link to="/admin/approvals">
            <Button size="sm" className="bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30">Review</Button>
          </Link>
        </div>
      )}
    </div>
  );
}