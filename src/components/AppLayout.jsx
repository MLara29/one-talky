import React, { useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, Search, Calendar, BarChart3, BookOpen, User, Settings, LogOut,
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
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="fixed top-0 left-0 right-0 bg-white border-b border-gray-100 z-40 h-14">
        <div className="h-full px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <Link to="/dashboard" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center">
                <MessageCircle className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-gray-900 hidden sm:block">Just Speak</span>
            </Link>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-violet-50 text-violet-600 capitalize hidden sm:block">
              {role}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/notifications">
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/profile">
              <Button variant="ghost" size="icon">
                <User className="w-4 h-4" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex pt-14">
        {/* Sidebar - desktop */}
        <aside className="hidden lg:flex flex-col w-56 fixed top-14 left-0 bottom-0 bg-white border-r border-gray-100 p-4">
          <nav className="space-y-1 flex-1">
            {nav.map(item => {
              const active = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    active
                      ? "bg-violet-50 text-violet-700"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute inset-0 bg-black/20" />
            <aside className="absolute top-14 left-0 bottom-0 w-64 bg-white border-r border-gray-100 p-4" onClick={e => e.stopPropagation()}>
              <nav className="space-y-1">
                {nav.map(item => {
                  const active = location.pathname === item.path;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                        active ? "bg-violet-50 text-violet-700" : "text-gray-600 hover:bg-gray-50"
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
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
          <div className="p-4 sm:p-6 max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 lg:hidden z-40">
        <div className="flex justify-around py-2">
          {nav.slice(0, 4).map(item => {
            const active = location.pathname === item.path;
            return (
              <Link key={item.path} to={item.path} className="flex flex-col items-center gap-0.5 p-1">
                <item.icon className={`w-5 h-5 ${active ? "text-violet-600" : "text-gray-400"}`} />
                <span className={`text-[10px] ${active ? "text-violet-600 font-medium" : "text-gray-400"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}