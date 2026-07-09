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
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!user || user.role === "admin") { setChecking(false); return; }
    checkProfile();
  }, [user]);

  const checkProfile = async () => {
    try {
      // Check both profile types in parallel to handle role mismatches
      const [tutorProfiles, studentProfiles] = await Promise.all([
        base44.entities.TutorProfile.filter({ user_id: user.id }),
        base44.entities.StudentProfile.filter({ user_id: user.id }),
      ]);
      setHasProfile(tutorProfiles.length > 0 || studentProfiles.length > 0);
    } catch {
      setHasProfile(!!user?.profile_completed);
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

  if (!hasProfile && !user?.profile_completed) {
    return <Navigate to="/choose-role" replace />;
  }

  if (user?.role === "tutor") return <TutorDashboard />;
  return <StudentDashboard />;
}