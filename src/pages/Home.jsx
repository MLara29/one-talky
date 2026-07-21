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
    if (!user?.id) return;
    if (user.role === "admin") { setChecking(false); return; }
    if (user.role === "tutor") { setResolvedRole("tutor"); setChecking(false); return; }
    if (user.role === "student") { setResolvedRole("student"); setChecking(false); return; }
    if (user.role === "affiliate") { setResolvedRole("affiliate"); setChecking(false); return; }
    checkProfile();
  }, [user?.id]);

  const checkProfile = async () => {
    try {
      const [tutorProfiles, studentProfiles] = await Promise.all([
        base44.entities.TutorProfile.filter({ user_id: user.id }),
        base44.entities.StudentProfile.filter({ user_id: user.id }),
      ]);
      if (tutorProfiles.length > 0) {
        setResolvedRole("tutor");
        if (user.role !== "tutor") await base44.auth.updateMe({ role: "tutor" });
      } else if (studentProfiles.length > 0) {
        setResolvedRole("student");
        if (user.role !== "student") await base44.auth.updateMe({ role: "student" });
      } else {
        // Check affiliate by user_id first, then fallback to email
        let affiliates = await base44.entities.Affiliate.filter({ user_id: user.id });
        if (affiliates.length === 0 && user.email) {
          affiliates = await base44.entities.Affiliate.filter({ email: user.email });
          if (affiliates.length > 0) {
            // Self-heal: link user_id to this affiliate record
            await base44.entities.Affiliate.update(affiliates[0].id, { user_id: user.id });
          }
        }
        if (affiliates.length > 0) {
          setResolvedRole("affiliate");
          if (user.role !== "affiliate") await base44.auth.updateMe({ role: "affiliate" });
        } else {
          setResolvedRole(null);
        }
      }
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

  if (!resolvedRole) {
    if (user?.role === "affiliate") return <Navigate to="/onboarding/affiliate" replace />;
    return <Navigate to="/choose-role" replace />;
  }

  if (resolvedRole === "affiliate") return <Navigate to="/affiliate" replace />;
  if (resolvedRole === "tutor") return <TutorDashboard />;
  return <StudentDashboard />;
}