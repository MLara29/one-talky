import React from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, Globe, Users, Clock, Shield, MessageCircle, ChevronRight, Play } from "lucide-react";
import { LANGUAGES } from "@/lib/constants";

const FEATURED_TUTORS = [
  { name: "Sarah Johnson", country: "🇺🇸 United States", lang: "English", rating: 4.9, photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face" },
  { name: "Carlos Mendoza", country: "🇪🇸 Spain", lang: "Spanish", rating: 4.8, photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" },
  { name: "Marie Dubois", country: "🇫🇷 France", lang: "French", rating: 5.0, photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face" },
  { name: "Luca Rossi", country: "🇮🇹 Italy", lang: "Italian", rating: 4.7, photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face" },
  { name: "Anna Schmidt", country: "🇩🇪 Germany", lang: "German", rating: 4.9, photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face" },
  { name: "James Wilson", country: "🇬🇧 United Kingdom", lang: "English", rating: 4.8, photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face" },
];

const TESTIMONIALS = [
  { name: "Pedro Silva", text: "In 3 months of daily conversation with native tutors, I went from barely understanding to having fluent business calls in English. Just Speak changed my career.", rating: 5 },
  { name: "Yuki Tanaka", text: "I tried apps, courses, grammar books... nothing worked like actually talking to real people. 20 minutes a day and I'm finally confident speaking French.", rating: 5 },
  { name: "Lisa Müller", text: "The instant lesson feature is amazing. Whenever I have free time, I just open the app and start speaking Spanish with a native. No scheduling hassle!", rating: 5 },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-lg z-50 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">Just Speak</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-600">
            <a href="#how-it-works" className="hover:text-violet-600 transition">How it works</a>
            <a href="#tutors" className="hover:text-violet-600 transition">Tutors</a>
            <a href="#pricing" className="hover:text-violet-600 transition">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-violet-600 hover:bg-violet-700 text-white">Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-28 pb-16 sm:pt-36 sm:pb-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50 text-violet-700 text-sm font-medium mb-6">
            <Globe className="w-4 h-4" />
            5 languages · 100% native tutors
          </div>
          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold text-gray-900 leading-tight tracking-tight max-w-4xl mx-auto">
            Speak like a <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-emerald-500">native</span>,{" "}
            with real natives.
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed">
            Live video conversations with verified native speakers. No grammar drills, no textbooks — just real talk, on demand, 24/7.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register?role=student">
              <Button size="lg" className="bg-violet-600 hover:bg-violet-700 text-white px-8 h-12 text-base rounded-full shadow-lg shadow-violet-200">
                I want to learn <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
            <Link to="/register?role=tutor">
              <Button size="lg" variant="outline" className="px-8 h-12 text-base rounded-full border-2">
                I want to teach <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-400">
            <span className="flex items-center gap-1"><Shield className="w-4 h-4" /> Verified tutors</span>
            <span className="flex items-center gap-1"><Clock className="w-4 h-4" /> Available 24/7</span>
            <span className="flex items-center gap-1"><Video className="w-4 h-4" /> HD video calls</span>
          </div>
        </div>
      </section>

      {/* Language pills */}
      <section className="pb-16 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-3">
          {LANGUAGES.map(l => (
            <div key={l.value} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-50 border border-gray-100 text-sm font-medium text-gray-700 hover:border-violet-200 hover:bg-violet-50 transition cursor-default">
              <span className="text-lg">{l.flag}</span> {l.label}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-20 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">How it works</h2>
          <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">Start speaking a new language in three simple steps</p>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", icon: Globe, title: "Choose your language", desc: "Pick from English, Spanish, French, Italian or German and tell us your level." },
              { step: "02", icon: Users, title: "Find a native tutor", desc: "Browse verified native speakers, watch their intro videos, and pick your match." },
              { step: "03", icon: Video, title: "Start talking", desc: "Jump into a live video call instantly or schedule a session — it's that simple." },
            ].map(s => (
              <div key={s.step} className="bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-lg hover:shadow-violet-100/50 transition-all">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center mb-5">
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <div className="text-xs font-bold text-violet-500 mb-2">STEP {s.step}</div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-2">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tutors */}
      <section id="tutors" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-4">Meet our tutors</h2>
          <p className="text-center text-gray-500 mb-14 max-w-lg mx-auto">Native speakers from around the world, ready to help you speak with confidence</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURED_TUTORS.map((t, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:shadow-violet-100/50 transition-all group">
                <div className="flex items-center gap-4 mb-4">
                  <img src={t.photo} alt={t.name} className="w-14 h-14 rounded-full object-cover ring-2 ring-violet-100" />
                  <div>
                    <h4 className="font-semibold text-gray-900">{t.name}</h4>
                    <p className="text-sm text-gray-500">{t.country}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-violet-600 bg-violet-50 px-3 py-1 rounded-full">{t.lang}</span>
                  <span className="flex items-center gap-1 text-sm text-amber-500 font-medium">
                    <Star className="w-4 h-4 fill-amber-400" /> {t.rating}
                  </span>
                </div>
                <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                  <Play className="w-3 h-3" /> Watch intro video
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Differentials */}
      <section className="py-20 px-4 bg-gradient-to-br from-violet-600 to-violet-800 text-white">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold mb-14">Why Just Speak?</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { icon: MessageCircle, title: "100% Conversation", desc: "No boring grammar drills. Just real, meaningful talk." },
              { icon: Clock, title: "On-demand 24/7", desc: "Instant lessons available anytime. No scheduling needed." },
              { icon: Globe, title: "Real-time translation", desc: "In-call chat with automatic translation to help you learn." },
              { icon: Video, title: "Lesson recordings", desc: "Every session is recorded so you can review and improve." },
            ].map((d, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4">
                  <d.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-lg mb-2">{d.title}</h3>
                <p className="text-violet-200 text-sm">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-center text-gray-900 mb-14">What learners say</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-gray-50 rounded-2xl p-8">
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-6">"{t.text}"</p>
                <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Become a Tutor CTA */}
      <section className="py-20 px-4 bg-emerald-50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-gray-900 mb-4">Earn money teaching your native language</h2>
          <p className="text-gray-500 mb-8 max-w-xl mx-auto">
            You're already fluent — why not help others speak like you? Set your own schedule, set your rate, and start earning from anywhere.
          </p>
          <Link to="/register?role=tutor">
            <Button size="lg" className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 h-12 text-base rounded-full">
              Become a tutor <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-gray-900 text-gray-400">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-emerald-400 flex items-center justify-center">
                  <MessageCircle className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="font-display font-bold text-white">Just Speak</span>
              </div>
              <p className="text-sm">Real conversations with real natives.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Languages</h4>
              {LANGUAGES.map(l => <p key={l.value} className="text-sm mb-1">{l.flag} {l.label}</p>)}
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Platform</h4>
              <p className="text-sm mb-1">How it works</p>
              <p className="text-sm mb-1">Pricing</p>
              <p className="text-sm mb-1">Become a tutor</p>
              <p className="text-sm mb-1">FAQ</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
              <p className="text-sm mb-1">Privacy Policy</p>
              <p className="text-sm mb-1">Terms of Service</p>
            </div>
          </div>
          <div className="border-t border-gray-800 pt-8 text-center text-sm">
            © 2026 Just Speak. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}