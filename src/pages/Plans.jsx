import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, Zap } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProfile(); }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch {} finally { setLoading(false); }
  };

  const selectPlan = async (plan) => {
    if (!profile) return;
    try {
      await base44.entities.StudentProfile.update(profile.id, { plan: plan.id, credits_minutes: plan.minutes });
      setProfile({ ...profile, plan: plan.id, credits_minutes: plan.minutes });
      toast({ title: `${plan.name} plan activated! 🎉`, description: `You now have ${plan.minutes} minutes of conversation credits.` });
    } catch { toast({ title: "Error", variant: "destructive" }); }
  };

  return (
    <div>
      <div className="text-center mb-12">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white mb-2">Plans & Credits</h1>
        <p className="text-gray-500 text-sm">Choose the plan that fits your learning pace</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const isCurrent = profile?.plan === plan.id;
          return (
            <div
              key={plan.id}
              className={`relative rounded-3xl p-6 border transition-all ${
                plan.popular
                  ? "bg-gradient-to-b from-violet-500/20 to-indigo-500/10 border-violet-500/40 shadow-xl shadow-violet-500/10"
                  : "bg-white/5 border-white/10 hover:bg-white/8"
              } ${isCurrent ? "ring-2 ring-emerald-400/60" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-xs font-bold rounded-full flex items-center gap-1 shadow-lg shadow-violet-500/30">
                  <Zap className="w-3 h-3" /> Popular
                </div>
              )}
              <h3 className="font-display font-bold text-white mb-1">{plan.name}</h3>
              <p className="text-gray-600 text-xs mb-5">{plan.description}</p>
              <div className="mb-5">
                <span className="font-display text-3xl font-extrabold text-white">
                  {plan.price === 0 ? "Free" : `$${plan.price.toFixed(2)}`}
                </span>
                {plan.price > 0 && <span className="text-gray-600 text-sm">/week</span>}
              </div>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> {plan.minutes} minutes/week
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> All native tutors
                </li>
                <li className="flex items-center gap-2 text-sm text-gray-400">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" /> Lesson recordings
                </li>
              </ul>
              <Button
                onClick={() => selectPlan(plan)}
                disabled={isCurrent}
                className={`w-full border-0 transition-all hover:scale-105 ${
                  isCurrent ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400" :
                  plan.popular ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/20" :
                  "bg-white/10 text-white hover:bg-white/15"
                }`}
              >
                {isCurrent ? "✓ Current plan" : "Select plan"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}