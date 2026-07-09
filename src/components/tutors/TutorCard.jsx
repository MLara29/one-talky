import React from "react";
import { Link } from "react-router-dom";
import { Star, Circle } from "lucide-react";
import { getCountryFlag, getLanguageLabel } from "@/lib/constants";

export default function TutorCard({ tutor }) {
  return (
    <Link to={`/tutor/${tutor.id}`} className="block">
      <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:shadow-violet-100/50 transition-all group">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img
              src={tutor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(tutor.full_name)}&background=8b5cf6&color=fff&size=80`}
              alt={tutor.full_name}
              className="w-16 h-16 rounded-2xl object-cover"
            />
            {tutor.is_available_now && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-white rounded-full flex items-center justify-center">
                <Circle className="w-2 h-2 fill-white text-white" />
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-violet-600 transition-colors">{tutor.full_name}</h3>
            <p className="text-sm text-gray-500 flex items-center gap-1">
              {getCountryFlag(tutor.country)} {tutor.country}
            </p>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-sm text-amber-500 font-medium">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                {tutor.average_rating?.toFixed(1) || "New"}
              </span>
              <span className="text-xs text-gray-400">{tutor.total_lessons || 0} lessons</span>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-gray-900">${tutor.price_per_minute?.toFixed(2)}</p>
            <p className="text-xs text-gray-400">/min</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tutor.native_languages?.map(l => (
            <span key={l} className="text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-600 font-medium">
              {getLanguageLabel(l)}
            </span>
          ))}
          {tutor.interests?.slice(0, 3).map(i => (
            <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-gray-50 text-gray-500">
              {i}
            </span>
          ))}
        </div>
        {tutor.is_available_now && (
          <div className="mt-3 text-xs font-medium text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-full inline-flex items-center gap-1">
            <Circle className="w-2 h-2 fill-emerald-500" /> Available now
          </div>
        )}
      </div>
    </Link>
  );
}