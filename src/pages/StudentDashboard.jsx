import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { t } from "@/lib/i18n";
import { Input } from "@/components/ui/input";
import { Search, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import TutorCard from "@/components/tutors/TutorCard";
import CreditsBanner from "@/components/student/CreditsBanner";
import SupportModal from "@/components/support/SupportModal";
import { isFirstWeekActive } from "@/lib/firstWeekWindow";

export default function StudentDashboard() {
  const { user } = useAuth();
  const { lang } = useLang();
  const [tutors, setTutors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => { loadData(); }, [user]);

  // Realtime: update tutor cards when availability or rating changes
  useEffect(() => {
    const unsubTutor = base44.entities.TutorProfile.subscribe((event) => {
      if (event.type === 'update') {
        setTutors(prev =>
          prev
            .map(t => t.id === event.data.id ? { ...t, ...event.data } : t)
            .filter(t => Boolean(t.photo_url))
        );
      } else if (event.type === 'create') {
        if (event.data.photo_url) {
          setTutors(prev => [...prev, event.data]);
        }
      } else if (event.type === 'delete') {
        setTutors(prev => prev.filter(t => t.id !== event.data.id));
      }
    });
    // When a new review is created, reload tutor list so ratings refresh
    const unsubReview = base44.entities.Review.subscribe((event) => {
      if (event.type === 'create' || event.type === 'update') {
        base44.entities.TutorProfile.filter({ status: "approved" }).then(data => setTutors(data.filter(t => Boolean(t.photo_url)))).catch(() => {});
      }
    });
    return () => { unsubTutor(); unsubReview(); };
  }, []);

  // Tick every 30s so isOnline (Date.now()-based) re-evaluates and cards re-sort dynamically
  useEffect(() => {
    const interval = setInterval(() => setTick(n => n + 1), 30_000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, profiles] = await Promise.all([
        base44.entities.TutorProfile.filter({ status: "approved" }),
        base44.entities.StudentProfile.filter({ user_id: user?.id }),
      ]);
      setTutors(data.filter(t => Boolean(t.photo_url)));
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch { setTutors([]); } finally { setLoading(false); }
  };

  const loadTutors = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.TutorProfile.filter({ status: "approved" });
      setTutors(data.filter(t => Boolean(t.photo_url)));
    } catch { setTutors([]); } finally { setLoading(false); }
  };

  const ONLINE_THRESHOLD_MS = 90 * 1000; // 90 seconds
  const isOnline = (t) => {
    if (!t.last_seen) return false;
    return (Date.now() - new Date(t.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
  };

  const hasOpenSchedule = (tutor) => {
    if (!tutor.availability) return false;
    const days = Object.values(tutor.availability);
    return days.some(slots => Array.isArray(slots) && slots.length > 0);
  };

  const getTutorPriority = (tutor) => {
    const online = isOnline(tutor);
    const availNow = tutor.is_available_now && online;
    const openSchedule = hasOpenSchedule(tutor);
    if (availNow) return 0;                    // online + available now
    if (online && openSchedule) return 1;      // online + has schedule slots
    if (!online && openSchedule) return 2;     // offline + has schedule slots
    return 3;                                  // everything else
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const filtered = React.useMemo(() => tutors
    .filter(t => {
      if (search && !t.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
      if (availableNow && !(t.is_available_now && isOnline(t))) return false;
      return true;
    })
    .sort((a, b) => getTutorPriority(a) - getTutorPriority(b)),
  // tick forces re-sort every 30s; tutors/search/availableNow on change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [tutors, search, availableNow, tick]);

  return (
    <div>
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}

      {/* Credits Banner */}
      {profile && <CreditsBanner profile={profile} onUpdate={setProfile} />}

      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900" style={{ fontFamily: "var(--font-display)" }}>
          Welcome, {profile?.full_name?.split(" ")[0] || user?.full_name?.split(" ")[0] || "there"} 👋
        </h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSupport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all text-sm font-medium shadow-sm"
          >
            <MessageSquare className="w-3.5 h-3.5" /> {t(lang, "support")}
          </button>
        </div>
      </div>

      {/* Search row */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t(lang, "searchByName")}
            className="w-full pl-11 pr-4 py-3 rounded-full bg-white border border-gray-200 text-gray-900 placeholder:text-gray-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent text-sm"
          />
        </div>
        <button
          onClick={() => setAvailableNow(!availableNow)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full text-sm font-semibold border transition-all shadow-sm ${
            availableNow
              ? "bg-emerald-500 text-white border-emerald-500"
              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${availableNow ? "bg-white" : "bg-emerald-500"}`} />
          {t(lang, "availableNow")}
          {availableNow && <X className="w-3 h-3 ml-1" />}
        </button>
      </div>

      {/* Tutors grid */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24 rounded-3xl bg-white border border-gray-100 shadow-sm">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-bold text-gray-800 mb-1">{t(lang, "noTutorsFound")}</h3>
          <p className="text-sm text-gray-400">{t(lang, "noTutorsSub")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-stretch">
          {filtered.map(t => <TutorCard key={t.id} tutor={t} firstWeekActive={isFirstWeekActive(profile)} />)}
        </div>
      )}
    </div>
  );
}