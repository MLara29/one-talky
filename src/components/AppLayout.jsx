import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { Button } from "@/components/ui/button";
import LiveNotificationToast from "@/components/LiveNotificationToast";
import {
  MessageCircle, Search, Calendar, BarChart3, BookOpen, User, LogOut,
  GraduationCap, DollarSign, Star, Bell, Menu, X, Home, TrendingUp, Inbox, Tag, Mail, Globe
} from "lucide-react";

const STUDENT_NAV = [
  { label: "Find Tutors", path: "/dashboard", icon: Search },
  { label: "My Lessons", path: "/my-lessons", icon: BookOpen },
  { label: "Progress", path: "/progress", icon: BarChart3 },
  { label: "Plans", path: "/plans", icon: DollarSign },
  { label: "Suporte", path: "/my-messages", icon: Inbox },
];

const TUTOR_NAV = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Schedule", path: "/schedule", icon: Calendar },
  { label: "My Lessons", path: "/my-lessons", icon: BookOpen },
  { label: "Earnings", path: "/earnings", icon: DollarSign },
  { label: "Reviews", path: "/reviews", icon: Star },
  { label: "Personal Info", path: "/tutor-bank-info", icon: User },
  { label: "Suporte", path: "/my-messages", icon: Inbox },
];

const ADMIN_NAV = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Approvals", path: "/admin/approvals", icon: GraduationCap },
  { label: "Users", path: "/admin/users", icon: User },
  { label: "Custos & Lucro", path: "/admin/costs", icon: TrendingUp },
  { label: "Pagamentos", path: "/admin/earnings", icon: DollarSign },
  { label: "Suporte", path: "/admin/support", icon: MessageCircle },
  { label: "Cupons", path: "/admin/coupons", icon: Tag },
  { label: "E-mail", path: "/admin/email", icon: Mail },
];

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "pt", label: "Português" },
  { code: "es", label: "Español" },
  { code: "fr", label: "Français" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
];

export default function AppLayout() {
  const { user } = useAuth();
  const { lang, changeLang } = useLang();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const role = user?.role || "student";
  const nav = role === "admin" ? ADMIN_NAV : role === "tutor" ? TUTOR_NAV : STUDENT_NAV;

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--app-bg)" }}
      onClick={() => showLangMenu && setShowLangMenu(false)}
    >
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
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold hidden sm:block" style={{ color: "var(--app-text-primary)" }}>
                One Talky
              </span>
            </Link>
            <span
              className="text-xs font-medium px-2.5 py-1 rounded-full capitalize hidden sm:block"
              style={{
                background: "rgba(124,58,237,0.1)",
                border: "1px solid rgba(124,58,237,0.25)",
                color: "#7c3aed"
              }}
            >
              {role}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Language selector */}
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={() => setShowLangMenu(v => !v)}
                className="p-2 rounded-lg transition-all hover:scale-110 flex items-center gap-1"
                style={{ background: "rgba(124,58,237,0.1)", color: "#7c3aed" }}
                title="Change language"
              >
                <Globe className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase hidden sm:block">{lang}</span>
              </button>
              {showLangMenu && (
                <div
                  className="absolute right-0 top-10 w-44 rounded-2xl shadow-2xl z-50 overflow-hidden py-1"
                  style={{ background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.12)" }}
                >
                  {LANGUAGES.map(l => (
                    <button
                      key={l.code}
                      onClick={() => changeLang(l.code)}
                      className="w-full text-left px-4 py-2 text-sm transition-colors hover:bg-violet-50"
                      style={{ color: lang === l.code ? "#7c3aed" : "#374151", fontWeight: lang === l.code ? 600 : 400 }}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Link to="/notifications">
              <Button variant="ghost" size="icon" style={{ color: "var(--app-text-secondary)" }}>
                <Bell className="w-4 h-4" />
              </Button>
            </Link>
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
                    background: active ? "var(--app-nav-active-bg)" : "transparent",
                    color: active ? "#7c3aed" : "var(--app-text-secondary)",
                    border: active ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent"
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--app-nav-hover-bg)"; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
                >
                  <item.icon className="w-4 h-4" style={{ color: active ? "#7c3aed" : "var(--app-text-muted)" }} />
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
                        background: active ? "var(--app-nav-active-bg)" : "transparent",
                        color: active ? "#7c3aed" : "var(--app-text-secondary)",
                        border: active ? "1px solid rgba(124,58,237,0.25)" : "1px solid transparent"
                      }}
                    >
                      <item.icon className="w-4 h-4" style={{ color: active ? "#7c3aed" : "var(--app-text-muted)" }} />
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
                <item.icon className="w-5 h-5" style={{ color: active ? "#7c3aed" : "var(--app-text-muted)" }} />
                <span className="text-[10px]" style={{ color: active ? "#7c3aed" : "var(--app-text-muted)", fontWeight: active ? 600 : 400 }}>
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