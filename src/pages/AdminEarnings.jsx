import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import PayoutSweepDaySelector from "@/components/admin/PayoutSweepDaySelector";
import PayoutFrequencyTab from "@/components/admin/PayoutFrequencyTab";

export default function AdminEarnings() {
  const [groups, setGroups] = useState({ weekly: [], biweekly: [], monthly: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOverview(); }, []);

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
      <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold text-white mb-1">Earnings & Payments</h1>
      <p className="theme-subtext text-gray-500 text-sm mb-6">Manage tutor earnings and payment processing</p>

      <PayoutSweepDaySelector />

      <Tabs defaultValue="weekly" className="mt-6">
        <TabsList>
          <TabsTrigger value="weekly">Semanais ({groups.weekly.length})</TabsTrigger>
          <TabsTrigger value="biweekly">Quinzenais ({groups.biweekly.length})</TabsTrigger>
          <TabsTrigger value="monthly">Mensais ({groups.monthly.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="weekly">
          <PayoutFrequencyTab tutors={groups.weekly} onChanged={loadOverview} />
        </TabsContent>
        <TabsContent value="biweekly">
          <PayoutFrequencyTab tutors={groups.biweekly} onChanged={loadOverview} />
        </TabsContent>
        <TabsContent value="monthly">
          <PayoutFrequencyTab tutors={groups.monthly} onChanged={loadOverview} />
        </TabsContent>
      </Tabs>
    </div>
  );
}