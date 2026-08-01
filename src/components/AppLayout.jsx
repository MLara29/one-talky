import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import BlockedScreen from "@/components/BlockedScreen";

import { Button } from "@/components/ui/button";
import useInactivityLogout, { LAST_ACTIVITY_KEY } from "@/hooks/useInactivityLogout";
import LiveNotificationToast from "@/components/LiveNotificationToast";
import NotificationBell from "@/components/NotificationBell";
import LessonReminderPopup from "@/components/LessonReminderPopup";
import Footer from "@/components/Footer";
import {
  Search, Calendar, BarChart3, BookOpen, User, LogOut,
  GraduationCap, DollarSign, Star, Menu, X, Home, TrendingUp, Inbox, Tag, Mail, MessageCircle, Users, Bell
} from "lucide-react";

const STUDENT_NAV = (lang) => {
  const labels = {
    en:    ["Find Tutors", "My Lessons", "Progress", "Plans", "My Profile", "Support"],
    pt_br: ["Encontrar Tutores", "Minhas Aulas", "Progresso", "Planos", "Meu Perfil", "Suporte"],
    pt_pt: ["Encontrar Tutores", "As Minhas Aulas", "Progresso", "Planos", "Meu Perfil", "Suporte"],
    es:    ["Encontrar Tutores", "Mis Clases", "Progreso", "Planes", "Mi Perfil", "Soporte"],
    fr:    ["Trouver des tuteurs", "Mes Leçons", "Progrès", "Plans", "Mon Profil", "Support"],
    de:    ["Tutoren finden", "Meine Lektionen", "Fortschritt", "Pläne", "Mein Profil", "Support"],
    it:    ["Trova tutors", "Le Mie Lezioni", "Progresso", "Piani", "Il Mio Profilo", "Supporto"],
  };
  const l = labels[lang] || labels["en"];
  return [
    { label: l[0], path: "/dashboard", icon: Search },
    { label: l[1], path: "/my-lessons", icon: BookOpen },
    { label: l[2], path: "/progress", icon: BarChart3 },
    { label: l[3], path: "/plans", icon: DollarSign },
    { label: l[4], path: "/student/personal-info", icon: User },
    { label: l[5], path: "/my-messages", icon: Inbox },
  ];
};

const TUTOR_NAV = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Schedule", path: "/schedule", icon: Calendar },
  { label: "My Lessons", path: "/my-lessons", icon: BookOpen },
  { label: "Earnings", path: "/earnings", icon: DollarSign },
  { label: "Reviews", path: "/reviews", icon: Star },
  { label: "Personal Info", path: "/tutor-bank-info", icon: User },
  { label: "Support", path: "/my-messages", icon: Inbox },
];

const ADMIN_NAV = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Approvals", path: "/admin/approvals", icon: GraduationCap },
  { label: "Users", path: "/admin/users", icon: User },
  { label: "Costs", path: "/admin/costs", icon: TrendingUp },
  { label: "Payments", path: "/admin/earnings", icon: DollarSign },
  { label: "Support", path: "/admin/support", icon: MessageCircle },
  { label: "Coupons", path: "/admin/coupons", icon: Tag },
  { label: "Email", path: "/admin/email", icon: Mail },
  { label: "Notifs", path: "/admin/notifications", icon: Bell },
  { label: "Afiliados", path: "/admin/affiliates", icon: Users },
  { label: "Agora", path: "/admin/agora-usage", icon: BarChart3 },
];

const AFFILIATE_NAV = [
  { label: "Dashboard", path: "/affiliate", icon: Home },
];

const LANG_OPTIONS = ["en", "pt_br"];
const LANG_LABELS = { en: "EN", pt_br: "PT" };

// Shared pill nav used by all roles
function TopPillNav({ nav, location }) {
  return (
    <nav className="hidden lg:flex items-center gap-1" style={{
      background: "rgba(255,255,255,0.7)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(0,0,0,0.05)",
      padding: "6px",
      borderRadius: 999,
      boxShadow: "0 6px 18px rgba(0,0,0,0.05)",
    }}>
      {nav.map(item => {
        const active = location.pathname === item.path || (item.path === "/dashboard" && location.pathname === "/");
        return (
          <Link
            key={item.path}
            to={item.path}
            style={{
              whiteSpace: "nowrap",
              padding: "10px 16px",
              borderRadius: 999,
              fontSize: 13,
              fontWeight: active ? 700 : 600,
              background: active ? "#1a1a1a" : "transparent",
              color: active ? "#fff" : "#4b5563",
              boxShadow: active ? "0 6px 16px rgba(0,0,0,0.25)" : "none",
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <item.icon style={{ width: 14, height: 14 }} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function AppLayout() {
  const { user } = useAuth();
  const { lang, changeLang } = useLang();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role || "student";

  useInactivityLogout(role);

  // Students blocked by an admin (StudentProfile.is_blocked) are denied access
  // to the entire app — checked here since AppLayout wraps every protected page.
  const [studentBlocked, setStudentBlocked] = useState(false);
  useEffect(() => {
    if (role !== "student" || !user?.id) return;
    base44.entities.StudentProfile.filter({ user_id: user.id }).then(profiles => {
      if (profiles[0]?.is_blocked) setStudentBlocked(true);
    }).catch(() => {});
  }, [role, user?.id]);

  if (studentBlocked) {
    return <BlockedScreen />;
  }

  const nav = role === "admin" ? ADMIN_NAV
    : role === "tutor" ? TUTOR_NAV
    : role === "affiliate" ? AFFILIATE_NAV
    : STUDENT_NAV(lang);



  const handleLogout = () => {
    localStorage.removeItem(LAST_ACTIVITY_KEY);
    base44.auth.logout("/");
  };

  // All roles now use the same top-bar layout with horizontal nav
  // Background: soft orange gradient for everyone
  const bgGradient = "linear-gradient(135deg, #fffaf7 0%, #fff5ee 50%, #ffe8d6 100%)";
  const headerHeight = 88;

  const roleLabel = role === "student" ? "Student" : role === "tutor" ? "Tutor" : role === "admin" ? "Admin" : "Affiliate";

  return (
    <div className="min-h-screen" style={{ background: bgGradient }}>
      {/* Top bar — same for all roles */}
      <header
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          height: headerHeight,
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(0,0,0,0.05)",
          boxShadow: "0 4px 16px rgba(0,0,0,0.04)",
        }}
      >
        <div className="h-full px-6 sm:px-9 flex items-center justify-between max-w-screen-2xl mx-auto">
          {/* Left: logo + mobile menu + role badge */}
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1 text-gray-500"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center">
              <img
                src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png"
                alt="One Talky"
                className="w-auto object-contain"
                style={{ height: 72 }}
              />
            </Link>
            <span
              className="text-xs font-semibold px-3 py-1 rounded-full hidden sm:block"
              style={{ background: "rgba(242,106,27,0.12)", color: "#F26A1B" }}
            >
              {roleLabel}
            </span>
          </div>

          {/* Center: pill nav for all roles */}
          <TopPillNav nav={nav} location={location} />

          {/* Right: lang switcher (student only) + icons */}
          <div className="flex items-center gap-1">
            {role === "student" && (
              <div
                className="flex items-center border rounded-full overflow-hidden mr-1"
                style={{ borderColor: "#e5e7eb", fontSize: 11 }}
              >
                {LANG_OPTIONS.map(l => (
                  <button
                    key={l}
                    onClick={() => changeLang(l)}
                    className="px-2.5 py-1 font-bold transition-colors"
                    style={{
                      background: lang === l ? "#F26A1B" : "transparent",
                      color: lang === l ? "#fff" : "#888",
                      border: "none",
                      cursor: "pointer",
                      fontFamily: "inherit",
                      fontWeight: 700,
                    }}
                  >
                    {LANG_LABELS[l]}
                  </button>
                ))}
              </div>
            )}
            <NotificationBell />
            <Link to={role === "student" ? "/student/personal-info" : "/profile"}>
              <Button variant="ghost" size="icon" className="hover:bg-gray-100 rounded-full text-gray-500">
                <User className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="hover:bg-red-50 hover:text-red-500 rounded-full text-gray-500"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile nav overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <aside
            className="absolute left-0 bottom-0 w-64 p-4"
            style={{
              top: headerHeight,
              background: "#fff",
              borderRight: "1px solid #f0e8e0",
            }}
            onClick={e => e.stopPropagation()}
          >
            <nav className="space-y-1">
              {nav.map(item => {
                const active = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                    style={{
                      background: active ? "rgba(242,106,27,0.10)" : "transparent",
                      color: active ? "#F26A1B" : "#555",
                      border: active ? "1px solid rgba(242,106,27,0.25)" : "1px solid transparent"
                    }}
                  >
                    <item.icon className="w-4 h-4" style={{ color: active ? "#F26A1B" : "#aaa" }} />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main content */}
      <main style={{ paddingTop: headerHeight }} className="min-h-screen">
        <div className="px-8 py-6 sm:px-14 sm:py-8 lg:px-20 lg:py-10 max-w-screen-2xl mx-auto pb-8 lg:pb-4">
          <Outlet />
        </div>
        <Footer />
      </main>

      <LiveNotificationToast />
      <LessonReminderPopup />

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 backdrop-blur-xl lg:hidden z-40"
        style={{ background: "#ffffff", borderTop: "1px solid #f0e8e0" }}
      >
        <div className="flex justify-around py-2">
          {nav.slice(0, 5).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 p-2">
                <item.icon className="w-5 h-5" style={{ color: active ? "#F26A1B" : "#aaa" }} />
                <span className="text-[10px]" style={{ color: active ? "#F26A1B" : "#aaa", fontWeight: active ? 600 : 400 }}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}