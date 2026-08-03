import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PayoutSweepDaySelector from "@/components/admin/PayoutSweepDaySelector";
import PayoutFrequencyTab from "@/components/admin/PayoutFrequencyTab";
import TutorLedgerModal from "@/components/admin/TutorLedgerModal";

export default function AdminEarnings() {
  const [groups, setGroups] = useState({ all: [], weekly: [], biweekly: [], monthly: [] });
  const [loading, setLoading] = useState(true);
  const [ledgerTutor, setLedgerTutor] = useState(null);

  useEffect(() => { loadOverview(); }, []);

  // Realtime: any withdrawal status change refreshes the admin panel
  useEffect(() => {
    const unsub = base44.entities.WithdrawalRequest.subscribe(() => { loadOverview(); });
    return unsub;
  }, []);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("getPayoutOverview", {});
      if (response.data?.groups) setGroups(response.data.groups);
    } catch {} finally { setLoading(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Ganhos e Pagamentos</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-6">Gerencie os ganhos dos tutores e o processamento de pagamentos</p>

      <PayoutSweepDaySelector />

      <Tabs defaultValue="all" className="mt-6">
        <TabsList>
          <TabsTrigger value="all">Todos ({groups.all.length})</TabsTrigger>
          <TabsTrigger value="weekly">Semanais ({groups.weekly.length})</TabsTrigger>
          <TabsTrigger value="biweekly">Quinzenais ({groups.biweekly.length})</TabsTrigger>
          <TabsTrigger value="monthly">Mensais ({groups.monthly.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="all">
          <PayoutFrequencyTab tutors={groups.all} onChanged={loadOverview} showFrequencyBadge onTutorClick={setLedgerTutor} />
        </TabsContent>
        <TabsContent value="weekly">
          <PayoutFrequencyTab tutors={groups.weekly} onChanged={loadOverview} onTutorClick={setLedgerTutor} />
        </TabsContent>
        <TabsContent value="biweekly">
          <PayoutFrequencyTab tutors={groups.biweekly} onChanged={loadOverview} onTutorClick={setLedgerTutor} />
        </TabsContent>
        <TabsContent value="monthly">
          <PayoutFrequencyTab tutors={groups.monthly} onChanged={loadOverview} onTutorClick={setLedgerTutor} />
        </TabsContent>
      </Tabs>

      {ledgerTutor && <TutorLedgerModal tutor={ledgerTutor} onClose={() => setLedgerTutor(null)} />}
    </div>
  );
}