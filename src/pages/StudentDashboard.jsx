import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGES } from "@/lib/constants";
import TutorCard from "@/components/tutors/TutorCard";

export default function StudentDashboard() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [availableNow, setAvailableNow] = useState(false);

  useEffect(() => { loadTutors(); }, []);

  const loadTutors = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.TutorProfile.filter({ status: "approved" });
      setTutors(data);
    } catch { setTutors([]); } finally { setLoading(false); }
  };

  const filtered = tutors.filter(t => {
    if (search && !t.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (langFilter !== "all" && !t.native_languages?.includes(langFilter)) return false;
    if (availableNow && !t.is_available_now) return false;
    return true;
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white">Find your tutor</h1>
        <p className="theme-subtext text-gray-500 text-sm mt-1">Browse native speakers ready to help you practice</p>
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
        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="theme-input w-full sm:w-44 bg-white/5 border-white/10 text-white">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent className="bg-slate-900 border-white/10 text-white">
            <SelectItem value="all">All languages</SelectItem>
            {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.flag} {l.label}</SelectItem>)}
          </SelectContent>
        </Select>
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