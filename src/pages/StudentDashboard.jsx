import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGES, INTERESTS } from "@/lib/constants";
import TutorCard from "@/components/tutors/TutorCard";

export default function StudentDashboard() {
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [availableNow, setAvailableNow] = useState(false);

  useEffect(() => {
    loadTutors();
  }, []);

  const loadTutors = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.TutorProfile.filter({ status: "approved" });
      setTutors(data);
    } catch {
      setTutors([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = tutors.filter(t => {
    if (search && !t.full_name?.toLowerCase().includes(search.toLowerCase())) return false;
    if (langFilter !== "all" && !t.native_languages?.includes(langFilter)) return false;
    if (availableNow && !t.is_available_now) return false;
    return true;
  });

  return (
    <div className="pb-20 lg:pb-4">
      <div className="mb-6">
        <h1 className="font-display text-2xl font-bold text-gray-900">Find your tutor</h1>
        <p className="text-gray-500 text-sm mt-1">Browse native speakers ready to help you practice</p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name..."
            className="pl-10"
          />
        </div>
        <Select value={langFilter} onValueChange={setLangFilter}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.flag} {l.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button
          variant={availableNow ? "default" : "outline"}
          onClick={() => setAvailableNow(!availableNow)}
          className={availableNow ? "bg-emerald-500 hover:bg-emerald-600 text-white" : ""}
          size="sm"
        >
          {availableNow && <X className="w-3 h-3 mr-1" />}
          Available now
        </Button>
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Search className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="font-semibold text-gray-900 mb-1">No tutors found</h3>
          <p className="text-sm text-gray-500">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-4">
          {filtered.map(t => <TutorCard key={t.id} tutor={t} />)}
        </div>
      )}
    </div>
  );
}