import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Check, Star } from "lucide-react";
import { PLANS } from "@/lib/constants";
import { useToast } from "@/components/ui/use-toast";

export default function Plans() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) setProfile(profiles[0]);
    } catch {} finally {
      setLoading(false);
    }
  };

  const selectPlan = async (plan) => {
    if (!profile) return;
    try {
      await base44.entities.StudentProfile.update(profile.id, {
        plan: plan.id,
        credits_minutes: plan.minutes,
      });
      setProfile({ ...profile, plan: plan.id, credits_minutes: plan.minutes });
      toast({ title: `${plan.name} plan activated! 🎉`, description: `You now have ${plan.minutes} minutes of conversation credits.` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  return (
    <div className="pb-20 lg:pb-4">
      <div className="text-center mb-10">
        <h1 className="font-display text-2xl font-bold text-gray-900">Plans & Credits</h1>
        <p className="text-gray-500 text-sm mt-1">Choose the plan that fits your learning pace</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {PLANS.map(plan => {
          const isCurrent = profile?.plan === plan.id;
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-2xl border-2 p-6 relative transition-all ${
                plan.popular ? "border-violet-400 shadow-lg shadow-violet-100/50" : "border-gray-100"
              } ${isCurrent ? "ring-2 ring-emerald-400" : ""}`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-violet-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                  <Star className="w-3 h-3" /> Popular
                </div>
              )}
              <h3 className="font-bold text-gray-900 mb-1">{plan.name}</h3>
              <p className="text-gray-500 text-xs mb-4">{plan.description}</p>
              <div className="mb-4">
                <span className="text-3xl font-bold text-gray-900">
                  {plan.price === 0 ? "Free" : `$${plan.price.toFixed(2)}`}
                </span>
                {plan.price > 0 && <span className="text-gray-400 text-sm">/week</span>}
              </div>
              <ul className="space-y-2 mb-6 text-sm">
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-4 h-4 text-emerald-500" /> {plan.minutes} minutes/week
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-4 h-4 text-emerald-500" /> All native tutors
                </li>
                <li className="flex items-center gap-2 text-gray-600">
                  <Check className="w-4 h-4 text-emerald-500" /> Lesson recordings
                </li>
              </ul>
              <Button
                onClick={() => selectPlan(plan)}
                disabled={isCurrent}
                className={`w-full ${isCurrent ? "bg-emerald-500 text-white" : plan.popular ? "bg-violet-600 hover:bg-violet-700 text-white" : ""}`}
                variant={isCurrent ? "default" : plan.popular ? "default" : "outline"}
              >
                {isCurrent ? "Current plan" : "Select plan"}
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}