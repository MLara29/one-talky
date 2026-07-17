import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Input } from "@/components/ui/input";
import { Search, X, MessageSquare, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import TutorCard from "@/components/tutors/TutorCard";
import CreditsBanner from "@/components/student/CreditsBanner";
import SupportModal from "@/components/support/SupportModal";
import PlanManageModal from "@/components/student/PlanManageModal";

export default function StudentDashboard() {
  const { user } = useAuth();
  const [tutors, setTutors] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [availableNow, setAvailableNow] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);

  useEffect(() => { loadData(); }, [user]);

  // Realtime: update tutor cards when availability changes
  useEffect(() => {
    const unsubscribe = base44.entities.TutorProfile.subscribe((event) => {
      if (event.type === 'update') {
        setTutors(prev => prev.map(t => t.id === event.data.id ? { ...t, ...event.data } : t));
      } else if (event.type === 'create') {
        setTutors(prev => [...prev, event.data]);
      } else if (event.type === 'delete') {
        setTutors(prev => prev.filter(t => t.id !== event.data.id));
      }
    });
    return unsubscribe;
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [data, profiles] = await Promise.all([
        base44.entities.TutorProfile.filter({ status: "approved" }),
        base44.entities.StudentProfile.filter({ user_id: user?.id }),
      ]);
      setTutors(data);
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch { setTutors([]); } finally { setLoading(false); }
  };

  const loadTutors = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.TutorProfile.filter({ status: "approved" });
      setTutors(data);
    } catch { setTutors([]); } finally { setLoading(false); }
  };

  const ONLINE_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes
  const isOnline = (t) => {
    if (!t.last_seen) return false;
    return (Date.now() - new Date(t.last_seen).getTime()) < ONLINE_THRESHOLD_MS;
  };

  const filtered = tutors.filter(t => {
    if (search && !t.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (availableNow && !(t.is_available_now && isOnline(t))) return false;
    return true;
  });

  return (
    <div>
      {showSupport && <SupportModal onClose={() => setShowSupport(false)} />}
      {showPlanModal && profile && (
        <PlanManageModal
          profile={profile}
          onClose={() => setShowPlanModal(false)}
          onUpdated={p => { setProfile(p); setShowPlanModal(false); }}
        />
      )}
      {profile && <CreditsBanner profile={profile} onUpdate={setProfile} />}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">Find your tutor</h1>
          <p className="theme-subtext text-gray-500 text-sm mt-1">Browse native speakers ready to help you practice</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {profile && (
            <button
              onClick={() => setShowPlanModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20 transition-all text-sm font-medium"
            >
              <Zap className="w-4 h-4" />
              <span className="capitalize">{profile.plan || "free"}</span>
            </button>
          )}
          <button
            onClick={() => setShowSupport(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
          >
            <MessageSquare className="w-4 h-4" /> Suporte
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-8">
        <div className="relative flex-1">
          <Search className="theme-muted-icon absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="theme-input pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-violet-500/50"
          />
        </div>
        <Button
          onClick={() => setAvailableNow(!availableNow)}
          className={`transition-all ${availableNow
            ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/30"
            : "theme-btn-ghost bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white"
          }`}
          variant="ghost"
          size="sm"
        >
          {availableNow && <X className="w-3 h-3 mr-1" />}
          <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${availableNow ? "bg-emerald-400" : "bg-gray-600"}`} />
          Available now
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="theme-empty text-center py-24 rounded-3xl border border-white/5">
          <Search className="theme-muted-icon w-12 h-12 text-gray-700 mx-auto mb-4" />
          <h3 className="theme-heading font-display font-bold text-white mb-1">No tutors found</h3>
          <p className="theme-subtext text-sm text-gray-600">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {filtered.map(t => <TutorCard key={t.id} tutor={t} />)}
        </div>
      )}
    </div>
  );
}