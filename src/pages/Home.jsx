import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import StudentDashboard from "@/pages/StudentDashboard";
import TutorDashboard from "@/pages/TutorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

export default function Home() {
  const { user } = useAuth();
  const [checking, setChecking] = useState(true);
  const [resolvedRole, setResolvedRole] = useState(null);

  useEffect(() => {
    if (!user) return;
    if (user.role === "admin") { setChecking(false); return; }
    checkProfile();
  }, [user]);

  const checkProfile = async () => {
    try {
      const [tutorProfiles, studentProfiles] = await Promise.all([
        base44.entities.TutorProfile.filter({ user_id: user.id }),
        base44.entities.StudentProfile.filter({ user_id: user.id }),
      ]);
      console.log("checkProfile:", { userId: user.id, tutors: tutorProfiles.length, students: studentProfiles.length });
      if (tutorProfiles.length > 0) setResolvedRole("tutor");
      else if (studentProfiles.length > 0) setResolvedRole("student");
      else setResolvedRole(null);
    } catch (e) {
      console.error("checkProfile error:", e);
      setResolvedRole(null);
    } finally {
      setChecking(false);
    }
  };

  if (user?.role === "admin") return <AdminDashboard />;

  if (checking) return (
    <div className="fixed inset-0 flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  if (!resolvedRole) return <Navigate to="/choose-role" replace />;

  if (resolvedRole === "tutor") return <TutorDashboard />;
  return <StudentDashboard />;
}