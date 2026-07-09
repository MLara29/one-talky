import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, GraduationCap, BookOpen } from "lucide-react";

export default function AdminUsers() {
  const [tutors, setTutors] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [t, s] = await Promise.all([
        base44.entities.TutorProfile.list("-created_date", 50),
        base44.entities.StudentProfile.list("-created_date", 50),
      ]);
      setTutors(t);
      setStudents(s);
    } catch {} finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-gray-200 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="pb-20 lg:pb-4">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">Users</h1>

      <Tabs defaultValue="tutors">
        <TabsList className="mb-6">
          <TabsTrigger value="tutors">Tutors ({tutors.length})</TabsTrigger>
          <TabsTrigger value="students">Students ({students.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="tutors">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {tutors.map(t => (
                <div key={t.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={t.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(t.full_name)}&background=8b5cf6&color=fff&size=40`}
                      className="w-10 h-10 rounded-xl object-cover"
                      alt=""
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{t.full_name}</p>
                      <p className="text-xs text-gray-500">{t.country}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    t.status === "approved" ? "bg-emerald-50 text-emerald-600" :
                    t.status === "pending" ? "bg-amber-50 text-amber-600" :
                    "bg-red-50 text-red-600"
                  }`}>
                    {t.status}
                  </span>
                </div>
              ))}
              {tutors.length === 0 && <p className="text-center text-sm text-gray-500 py-8">No tutors yet</p>}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="students">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {students.map(s => (
                <div key={s.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={s.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(s.full_name)}&background=8b5cf6&color=fff&size=40`}
                      className="w-10 h-10 rounded-xl object-cover"
                      alt=""
                    />
                    <div>
                      <p className="font-medium text-sm text-gray-900">{s.full_name}</p>
                      <p className="text-xs text-gray-500">{s.target_language} · {s.level}</p>
                    </div>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-blue-50 text-blue-600 capitalize">
                    {s.plan || "free"}
                  </span>
                </div>
              ))}
              {students.length === 0 && <p className="text-center text-sm text-gray-500 py-8">No students yet</p>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}