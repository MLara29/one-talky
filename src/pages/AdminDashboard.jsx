import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Users, GraduationCap, Video, BookOpen, Clock, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function AdminDashboard() {
  const [stats, setStats] = useState({ tutors: 0, students: 0, lessons: 0, pending: 0, inProgress: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const [tutors, students, lessons, pending, inProgress] = await Promise.all([
        base44.entities.TutorProfile.filter({ status: "approved" }),
        base44.entities.StudentProfile.list(),
        base44.entities.Lesson.filter({ status: "completed" }),
        base44.entities.TutorProfile.filter({ status: "pending" }),
        base44.entities.Lesson.filter({ status: "in_progress" }),
      ]);
      setStats({
        tutors: tutors.length,
        students: students.length,
        lessons: lessons.length,
        pending: pending.length,
        inProgress: inProgress.length,
      });
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

  const cards = [
    { label: "Active tutors", value: stats.tutors, icon: GraduationCap, color: "bg-violet-50 text-violet-600" },
    { label: "Students", value: stats.students, icon: Users, color: "bg-blue-50 text-blue-600" },
    { label: "Completed lessons", value: stats.lessons, icon: BookOpen, color: "bg-emerald-50 text-emerald-600" },
    { label: "In progress now", value: stats.inProgress, icon: Video, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div className="pb-20 lg:pb-4">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-10 h-10 rounded-xl ${c.color} flex items-center justify-center mb-3`}>
              <c.icon className="w-5 h-5" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {stats.pending > 0 && (
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            <div>
              <p className="font-medium text-amber-900">{stats.pending} pending tutor application{stats.pending > 1 ? "s" : ""}</p>
              <p className="text-sm text-amber-700">Review and approve new tutors</p>
            </div>
          </div>
          <Link to="/admin/approvals">
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white">Review</Button>
          </Link>
        </div>
      )}
    </div>
  );
}