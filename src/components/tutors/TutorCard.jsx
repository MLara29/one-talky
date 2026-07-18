import React from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { getCountryFlag, getLanguageLabel } from "@/lib/constants";

const ONLINE_THRESHOLD_MS = 5 * 60 * 1000;
const isOnline = (t) => t.last_seen && (Date.now() - new Date(t.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
const isLive = (t) => t.is_available_now && isOnline(t);

export default function TutorCard({ tutor }) {
  const live = isLive(tutor);
  return (
    <Link to={`/tutor/${tutor.id}`} className="block group">
      <div className="theme-card p-5 transition-all duration-300 hover:-translate-y-1 cursor-pointer">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={tutor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=149d78&color=fff&size=80`}
              alt={tutor.full_name}
              className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-violet-500/30 transition-all"
            />
            {live && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-slate-950 rounded-full">
                <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-60" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="theme-heading font-display font-bold transition-colors truncate" style={{ color: "var(--app-text-primary)" }}>{tutor.full_name}</h3>
            <p className="theme-subtext text-sm flex items-center gap-1.5 mt-0.5" style={{ color: "var(--app-text-secondary)" }}>
              <span className="text-lg leading-none">
                {getCountryFlag(tutor.nationality) !== "🌍"
                  ? getCountryFlag(tutor.nationality)
                  : getCountryFlag(tutor.country)}
              </span>
              <span>{tutor.nationality || tutor.country}</span>
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-sm font-semibold" style={{ color: "#f59e0b" }}>
                <Star className="w-3.5 h-3.5" style={{ fill: "#f59e0b", color: "#f59e0b" }} />
                {tutor.total_reviews > 0 ? (tutor.average_rating || 0).toFixed(1) : "New"}
              </span>
              <span className="text-xs" style={{ color: "var(--app-text-muted)" }}>{tutor.total_lessons || 0} lessons</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${live ? "text-emerald-600" : ""}`} style={live ? { background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)" } : { background: "#f1f5f9", border: "1px solid #e2e8f0", color: "#94a3b8" }}>
              {live ? "● Online" : "Offline"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {tutor.native_languages?.map(l => (
            <span key={l} className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: "var(--app-primary-light)", color: "var(--app-primary)", border: "1px solid rgba(20,157,120,0.2)" }}>
              {getLanguageLabel(l)}
            </span>
          ))}
          {tutor.interests?.slice(0, 3).map(i => (
            <span key={i} className="theme-btn-ghost text-xs px-2.5 py-1 rounded-full">
              {i}
            </span>
          ))}
        </div>

        {live && (
          <div className="mt-3 text-xs font-semibold flex items-center gap-1.5" style={{ color: "#10b981" }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#10b981" }} /> Available now
          </div>
        )}
      </div>
    </Link>
  );
}