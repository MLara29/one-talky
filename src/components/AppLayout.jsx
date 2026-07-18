import React, { useState, useEffect, useRef } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

import { Button } from "@/components/ui/button";
import LiveNotificationToast from "@/components/LiveNotificationToast";
import {
  MessageCircle, Search, Calendar, BarChart3, BookOpen, User, LogOut,
  GraduationCap, DollarSign, Star, Bell, Menu, X, Home, TrendingUp, Inbox, Tag, Mail
} from "lucide-react";

const STUDENT_NAV = [
  { label: "Find Tutors", path: "/dashboard", icon: Search },
  { label: "My Lessons", path: "/my-lessons", icon: BookOpen },
  { label: "Progress", path: "/progress", icon: BarChart3 },
  { label: "Plans", path: "/plans", icon: DollarSign },
  { label: "Support", path: "/my-messages", icon: Inbox },
];

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
  { label: "Costs & Profit", path: "/admin/costs", icon: TrendingUp },
  { label: "Earnings", path: "/admin/earnings", icon: DollarSign },
  { label: "Support", path: "/admin/support", icon: MessageCircle },
  { label: "Coupons", path: "/admin/coupons", icon: Tag },
  { label: "E-mail", path: "/admin/email", icon: Mail },
];

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role || "student";
  const nav = role === "admin" ? ADMIN_NAV : role === "tutor" ? TUTOR_NAV : STUDENT_NAV;

  // Heartbeat for tutors
  const tutorProfileIdRef = useRef(null);
  useEffect(() => {
    if (role !== "tutor" || !user?.id) return;
    const beat = async () => {
      if (!tutorProfileIdRef.current) {
        const profiles = await base44.entities.TutorProfile.filter({ user_id: user.id });
        if (profiles.length > 0) tutorProfileIdRef.current = profiles[0].id;
      }
      if (tutorProfileIdRef.current) {
        await base44.entities.TutorProfile.update(tutorProfileIdRef.current, { last_seen: new Date().toISOString() });
      }
    };
    beat();
    const interval = setInterval(beat, 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id, role]);

  const handleLogout = () => base44.auth.logout("/");

  const NavLinks = ({ onClick }) => (
    <nav className="space-y-0.5 flex-1">
      {nav.map(item => {
        const active = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={onClick}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all"
            style={{
              background: active ? "var(--app-nav-active-bg)" : "transparent",
              color: active ? "var(--app-primary)" : "var(--app-text-secondary)",
            }}
          >
            <item.icon
              className="w-4 h-4 shrink-0"
              style={{ color: active ? "var(--app-primary)" : "var(--app-text-muted)" }}
            />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--app-bg)" }}>
      {/* Top bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40 h-14"
        style={{
          background: "var(--app-header-bg)",
          borderBottom: "1px solid var(--app-border)",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)"
        }}
      >
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1 rounded-lg"
              style={{ color: "var(--app-text-secondary)" }}
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2.5">
              {/* Logo mark — half-circle like the image */}
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white text-lg"
                style={{ background: "linear-gradient(135deg, #149d78 0%, #0e7a5f 100%)" }}
              >
                <span style={{ fontFamily: "var(--font-display)" }}>O</span>
              </div>
              <span className="font-display text-base font-bold hidden sm:block" style={{ color: "var(--app-text-primary)" }}>
                One Talky
              </span>
            </Link>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full capitalize hidden sm:block"
              style={{
                background: "var(--app-primary-light)",
                color: "var(--app-primary)"
              }}
            >
              {role}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Link to="/notifications">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                style={{ color: "var(--app-text-secondary)" }}
              >
                <Bell className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/profile">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-xl"
                style={{ color: "var(--app-text-secondary)" }}
              >
                <User className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleLogout}
              className="rounded-xl hover:bg-red-50"
              style={{ color: "var(--app-text-secondary)" }}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar — desktop */}
        <aside
          className="hidden lg:flex flex-col w-56 fixed top-14 left-0 bottom-0 p-4"
          style={{
            background: "var(--app-sidebar-bg)",
            borderRight: "1px solid var(--app-border)"
          }}
        >
          <NavLinks />
          <div className="pt-3" style={{ borderTop: "1px solid var(--app-border)" }}>
            <p className="text-[10px] text-center" style={{ color: "var(--app-text-muted)" }}>One Talky v1.0</p>
          </div>
        </aside>

        {/* Mobile overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <aside
              className="absolute top-14 left-0 bottom-0 w-64 p-4"
              style={{ background: "var(--app-sidebar-bg)", borderRight: "1px solid var(--app-border)" }}
              onClick={e => e.stopPropagation()}
            >
              <NavLinks onClick={() => setMobileOpen(false)} />
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
        className="fixed bottom-0 left-0 right-0 lg:hidden z-40"
        style={{
          background: "var(--app-header-bg)",
          borderTop: "1px solid var(--app-border)",
          boxShadow: "0 -1px 6px rgba(0,0,0,0.04)"
        }}
      >
        <div className="flex justify-around py-2">
          {nav.slice(0, 4).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 p-2">
                <item.icon className="w-5 h-5" style={{ color: active ? "var(--app-primary)" : "var(--app-text-muted)" }} />
                <span
                  className="text-[10px]"
                  style={{ color: active ? "var(--app-primary)" : "var(--app-text-muted)", fontWeight: active ? 600 : 400 }}
                >
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