import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { GraduationCap, BookOpen, MessageCircle } from "lucide-react";

export default function ChooseRole() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const preset = params.get("role");

  if (preset === "tutor" || preset === "student") {
    // Auto-redirect if role came from URL
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-10">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-gray-900">Just Speak</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-gray-900 mb-2">Welcome! What brings you here?</h1>
          <p className="text-gray-500">Choose how you'd like to use Just Speak</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          <button
            onClick={() => navigate("/onboarding/student")}
            className="bg-white rounded-2xl border-2 border-gray-100 p-8 text-left hover:border-violet-300 hover:shadow-lg hover:shadow-violet-100/50 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-violet-100 flex items-center justify-center mb-5 group-hover:bg-violet-500 transition-colors">
              <BookOpen className="w-7 h-7 text-violet-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900 mb-2">I want to learn</h2>
            <p className="text-gray-500 text-sm leading-relaxed">Practice conversation with native speakers and become fluent faster.</p>
          </button>

          <button
            onClick={() => navigate("/onboarding/tutor")}
            className="bg-white rounded-2xl border-2 border-gray-100 p-8 text-left hover:border-emerald-300 hover:shadow-lg hover:shadow-emerald-100/50 transition-all group"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center mb-5 group-hover:bg-emerald-500 transition-colors">
              <GraduationCap className="w-7 h-7 text-emerald-600 group-hover:text-white transition-colors" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900 mb-2">I want to teach</h2>
            <p className="text-gray-500 text-sm leading-relaxed">Share your native language, set your schedule, and earn money.</p>
          </button>
        </div>
      </div>
    </div>
  );
}