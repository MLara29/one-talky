import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminUsers() {
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [t, s] = await Promise.all([
        base44.entities.TutorProfile.list("-created_date", 50),
        base44.entities.StudentProfile.list("-created_date", 50),
      ]);
      setTutors(t); setStudents(s);
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-8">Users</h1>

      <Tabs defaultValue="tutors">
        <TabsList className="mb-6 bg-white/5 border border-white/10">
          <TabsTrigger value="tutors" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Tutors ({tutors.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="data-[state=active]:bg-violet-500/20 data-[state=active]:text-violet-300 text-gray-500">
            Students ({students.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutors">
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {tutors.map(t => (
                <div key={t.id} className="p-4 flex items-center justify-between hover:bg-white/3 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=7c3aed&color=fff&size=40`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div>
                      <p className="font-medium text-sm text-white">{t.full_name}</p>
                      <p className="text-xs text-gray-600">{t.country}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${
                    t.status === "approved" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                    t.status === "pending" ? "bg-amber-500/10 border-amber-500/20 text-amber-400" :
                    "bg-red-500/10 border-red-500/20 text-red-400"
                  }`}>{t.status}</span>
                </div>
              ))}
              {tutors.length === 0 && <p className="text-center text-sm text-gray-600 py-8">No tutors yet</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
            <div className="divide-y divide-white/5">
              {students.map(s => (
                <div key={s.id} className="p-4 flex items-center justify-between hover:bg-white/3 transition-all">
                  <div className="flex items-center gap-3">
                    <img src={s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=7c3aed&color=fff&size=40`} className="w-10 h-10 rounded-xl object-cover" alt="" />
                    <div>
                      <p className="font-medium text-sm text-white">{s.full_name}</p>
                      <p className="text-xs text-gray-600 capitalize">{s.target_language} · {s.level}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-500/10 border border-blue-500/20 text-blue-400 capitalize">{s.plan || "free"}</span>
                </div>
              ))}
              {students.length === 0 && <p className="text-center text-sm text-gray-600 py-8">No students yet</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}