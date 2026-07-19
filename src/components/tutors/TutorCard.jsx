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
      <div className="theme-card bg-white/5 border border-white/10 rounded-3xl p-5 hover:border-violet-500/30 transition-all duration-300 hover:shadow-xl hover:shadow-violet-500/10 hover:-translate-y-1">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <img
              src={tutor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=7c3aed&color=fff&size=80`}
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
            <h3 className="theme-heading font-display font-bold text-white group-hover:text-violet-600 transition-colors truncate">{tutor.full_name}</h3>
            <p className="theme-subtext text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
              <span className="text-lg leading-none">
                {getCountryFlag(tutor.nationality) !== "🌍"
                  ? getCountryFlag(tutor.nationality)
                  : getCountryFlag(tutor.country)}
              </span>
              <span>{tutor.nationality || tutor.country}</span>
            </p>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="flex items-center gap-1 text-sm text-amber-500 font-semibold">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {tutor.total_reviews > 0 ? (tutor.average_rating || 0).toFixed(1) : "New"}
              </span>
              <span className="theme-subtext text-xs text-gray-600">{tutor.total_lessons || 0} lessons</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${live ? "bg-emerald-500/15 border border-emerald-500/20 text-emerald-400" : "bg-white/5 border border-white/10 text-gray-500"}`}>
              {live ? "● Online" : "Offline"}
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {tutor.native_languages?.map(l => (
            <span key={l} className="theme-badge-violet text-xs px-2.5 py-1 rounded-full bg-violet-500/15 border border-violet-500/20 text-violet-300 font-medium">
              {getLanguageLabel(l)}
            </span>
          ))}
          {tutor.interests?.slice(0, 3).map(i => (
            <span key={i} className="theme-btn-ghost text-xs px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-gray-500">
              {i}
            </span>
          ))}
        </div>

        {live && (
          <div className="mt-3 text-xs font-semibold text-emerald-500 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Available now
          </div>
        )}
      </div>
    </Link>
  );
}