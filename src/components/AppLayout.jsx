import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, Search, Calendar, BarChart3, BookOpen, User, LogOut,
  GraduationCap, Clock, DollarSign, Star, Bell, Menu, X, Home
} from "lucide-react";

const STUDENT_NAV = [
  { label: "Find Tutors", path: "/dashboard", icon: Search },
  { label: "My Lessons", path: "/my-lessons", icon: BookOpen },
  { label: "Progress", path: "/progress", icon: BarChart3 },
  { label: "Plans", path: "/plans", icon: DollarSign },
];

const TUTOR_NAV = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Schedule", path: "/schedule", icon: Calendar },
  { label: "My Lessons", path: "/my-lessons", icon: BookOpen },
  { label: "Earnings", path: "/earnings", icon: DollarSign },
  { label: "Reviews", path: "/reviews", icon: Star },
];

const ADMIN_NAV = [
  { label: "Dashboard", path: "/dashboard", icon: Home },
  { label: "Approvals", path: "/admin/approvals", icon: GraduationCap },
  { label: "Users", path: "/admin/users", icon: User },
];

const NAV_COLORS = {
  Search: "text-violet-400",
  Home: "text-violet-400",
  BookOpen: "text-indigo-400",
  BarChart3: "text-emerald-400",
  DollarSign: "text-amber-400",
  Calendar: "text-blue-400",
  Star: "text-amber-400",
  GraduationCap: "text-violet-400",
  User: "text-indigo-400",
};

export default function AppLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = user?.role || "student";
  const nav = role === "admin" ? ADMIN_NAV : role === "tutor" ? TUTOR_NAV : STUDENT_NAV;

  const handleLogout = () => {
    base44.auth.logout("/");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-[#0f0f1f] to-slate-950">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 z-40 h-14">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1 text-gray-400 hover:text-white transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <MessageCircle className="w-4 h-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-white hidden sm:block">Just Speak</span>
            </Link>
            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-300 capitalize hidden sm:block">
              {role}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Link to="/notifications">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
                <Bell className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="icon" className="text-gray-400 hover:text-white hover:bg-white/5">
                <User className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-gray-400 hover:text-red-400 hover:bg-red-500/10">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex flex-col w-56 fixed top-14 left-0 bottom-0 bg-slate-950/60 backdrop-blur-xl border-r border-white/5 p-4">
          <nav className="space-y-1 flex-1">
            {nav.map(item => {
              const active = location.pathname === item.path;
              const iconName = item.icon.displayName || item.icon.name;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-violet-500/15 text-white border border-violet-500/20"
                      : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                  }`}
                >
                  <item.icon className={`w-4 h-4 ${active ? "text-violet-400" : "text-gray-600"}`} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t border-white/5 pt-3">
            <p className="text-[10px] text-gray-700 text-center">Just Speak v1.0</p>
          </div>
        </aside>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
            <aside className="absolute top-14 left-0 bottom-0 w-64 bg-slate-950 border-r border-white/5 p-4" onClick={e => e.stopPropagation()}>
              <nav className="space-y-1">
                {nav.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active ? "bg-violet-500/15 text-white border border-violet-500/20" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
                      }`}
                    >
                      <item.icon className={`w-4 h-4 ${active ? "text-violet-400" : "text-gray-600"}`} />
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

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-950/90 backdrop-blur-xl border-t border-white/5 lg:hidden z-40">
        <div className="flex justify-around py-2">
          {nav.slice(0, 4).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 p-2">
                <item.icon className={`w-5 h-5 transition-colors ${active ? "text-violet-400" : "text-gray-600"}`} />
                <span className={`text-[10px] transition-colors ${active ? "text-violet-400 font-semibold" : "text-gray-600"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}