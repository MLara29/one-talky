import React from "react";
import { useAuth } from "@/lib/AuthContext";
import { Navigate } from "react-router-dom";
import StudentDashboard from "@/pages/StudentDashboard";
import TutorDashboard from "@/pages/TutorDashboard";
import AdminDashboard from "@/pages/AdminDashboard";

export default function Home() {
  const { user } = useAuth();

  if (!user?.profile_completed && user?.role !== "admin") {
    return <Navigate to="/choose-role" replace />;
  }

  if (user?.role === "admin") return <AdminDashboard />;
  if (user?.role === "tutor") return <TutorDashboard />;
  return <StudentDashboard />;
}