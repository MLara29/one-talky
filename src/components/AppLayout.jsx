import React, { useState, useEffect } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";

import { Button } from "@/components/ui/button";
import LiveNotificationToast from "@/components/LiveNotificationToast";
import NotificationBell from "@/components/NotificationBell";
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
  { label: "Costs & Revenue", path: "/admin/costs", icon: TrendingUp },
  { label: "Payments", path: "/admin/earnings", icon: DollarSign },
  { label: "Support", path: "/admin/support", icon: MessageCircle },
  { label: "Coupons", path: "/admin/coupons", icon: Tag },
  { label: "Email", path: "/admin/email", icon: Mail },
  { label: "Notificações", path: "/admin/notifications", icon: Bell },
  { label: "Afiliados", path: "/admin/affiliates", icon: Users },
  { label: "Agora Usage", path: "/admin/agora-usage", icon: BarChart3 },
];

const AFFILIATE_NAV = [
  { label: "Dashboard", path: "/affiliate", icon: Home },
];

const LANG_OPTIONS = ["pt_br", "en", "es", "fr", "de", "it"];
const LANG_LABELS = { pt_br: "PT", en: "EN", es: "ES", fr: "FR", de: "DE", it: "IT" };

export default function AppLayout() {
  const { user } = useAuth();
  const { lang, changeLang } = useLang();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role || "student";

  const nav = role === "admin" ? ADMIN_NAV
    : role === "tutor" ? TUTOR_NAV
    : role === "affiliate" ? AFFILIATE_NAV
    : STUDENT_NAV(lang);

  // Heartbeat for tutors: keep last_seen updated on every page
  useEffect(() => {
    if (role !== "tutor" || !user?.id) return;
    const beat = async () => {
      await base44.functions.updateMyProfile({ last_seen: new Date().toISOString() });
    };
    beat();
    const interval = setInterval(beat, 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, role]);

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--app-bg)" }}>
      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 backdrop-blur-xl z-40 h-14"
        style={{ background: "var(--app-header-bg)", borderBottom: "1px solid var(--app-border)" }}
      >
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1"
              style={{ color: "var(--app-text-secondary)" }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center">
              <img
                src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/aa8d50b0c_image1.svg"
                alt="One Talky"
                className="h-12 w-auto object-contain"
              />
            </Link>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full capitalize hidden sm:block"
              style={{ background: "rgba(242,106,27,0.1)", border: "1px solid rgba(242,106,27,0.25)", color: "#F26A1B" }}
            >
              {role}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Language switcher — students only */}
            {role === "student" && (
              <div className="flex items-center border rounded-full overflow-hidden mr-1" style={{ borderColor: "var(--app-border)", fontSize: 11 }}>
                {LANG_OPTIONS.map(l => (
                  <button
                    key={l}
                    onClick={() => changeLang(l)}
                    className="px-2 py-1 font-bold transition-colors"
                    style={{
                      background: lang === l ? "#F26A1B" : "transparent",
                      color: lang === l ? "#fff" : "var(--app-text-secondary)",
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
            <Link to="/profile">
              <Button variant="ghost" size="icon" style={{ color: "var(--app-text-secondary)" }}>
                <User className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="hover:text-red-400 hover:bg-red-500/10" style={{ color: "var(--app-text-secondary)" }}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar - desktop */}
        <aside
          className="hidden lg:flex flex-col w-56 fixed top-14 left-0 bottom-0 backdrop-blur-xl p-4"
          style={{ background: "var(--app-sidebar-bg)", borderRight: "1px solid var(--app-border)" }}
        >
          <nav className="space-y-1 flex-1">
            {nav.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
                  style={{
                    background: active ? "rgba(242,106,27,0.10)" : "transparent",
                    color: active ? "#F26A1B" : "var(--app-text-secondary)",
                    border: active ? "1px solid rgba(242,106,27,0.25)" : "1px solid transparent"
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--app-nav-hover-bg)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <item.icon className="w-4 h-4" style={{ color: active ? "#F26A1B" : "var(--app-text-muted)" }} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="pt-3" style={{ borderTop: "1px solid var(--app-border)" }}>
            <p className="text-[10px] text-center" style={{ color: "var(--app-text-muted)" }}>One Talky v1.0</p>
          </div>
        </aside>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
            <aside
              className="absolute top-14 left-0 bottom-0 w-64 p-4"
              style={{ background: "var(--app-sidebar-bg)", borderRight: "1px solid var(--app-border)" }}
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
                        color: active ? "#F26A1B" : "var(--app-text-secondary)",
                        border: active ? "1px solid rgba(242,106,27,0.25)" : "1px solid transparent"
                      }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: active ? "#F26A1B" : "var(--app-text-muted)" }} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 lg:ml-56 min-h-[calc(100vh-3.5rem)]">
          <div className="p-4 sm:p-6 max-w-6xl mx-auto pb-24 lg:pb-6">
            <Outlet />
          </div>
        </main>
      </div>

      <LiveNotificationToast />

      {/* Mobile bottom nav */}
      <nav
        className="fixed bottom-0 left-0 right-0 backdrop-blur-xl lg:hidden z-40"
        style={{ background: "var(--app-header-bg)", borderTop: "1px solid var(--app-border)" }}
      >
        <div className="flex justify-around py-2">
          {nav.slice(0, 4).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 p-2">
                <item.icon className="w-5 h-5" style={{ color: active ? "#F26A1B" : "var(--app-text-muted)" }} />
                <span className="text-[10px]" style={{ color: active ? "#F26A1B" : "var(--app-text-muted)", fontWeight: active ? 600 : 400 }}>
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