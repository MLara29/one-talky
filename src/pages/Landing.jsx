import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, Globe, Users, Clock, Shield, MessageCircle, ChevronRight, Play, Zap, Mic, BookOpen } from "lucide-react";
import { LANGUAGES } from "@/lib/constants";

const FEATURED_TUTORS = [
  { name: "Sarah Johnson", country: "🇺🇸 United States", lang: "English", rating: 4.9, available: true, photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face" },
  { name: "Carlos Mendoza", country: "🇪🇸 Spain", lang: "Spanish", rating: 4.8, available: true, photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" },
  { name: "Marie Dubois", country: "🇫🇷 France", lang: "French", rating: 5.0, available: false, photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face" },
  { name: "Luca Rossi", country: "🇮🇹 Italy", lang: "Italian", rating: 4.7, available: true, photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face" },
  { name: "Anna Schmidt", country: "🇩🇪 Germany", lang: "German", rating: 4.9, available: false, photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face" },
  { name: "James Wilson", country: "🇬🇧 United Kingdom", lang: "English", rating: 4.8, available: true, photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face" },
];

const TESTIMONIALS = [
  { name: "Pedro Silva", role: "Software Engineer", text: "In 3 months of daily conversation with native tutors, I went from barely understanding to having fluent business calls in English. One Talky changed my career.", rating: 5, avatar: "PS" },
  { name: "Yuki Tanaka", role: "Designer", text: "I tried apps, courses, grammar books... nothing worked like actually talking to real people. 20 minutes a day and I'm finally confident speaking French.", rating: 5, avatar: "YT" },
  { name: "Lisa Müller", role: "Marketing Director", text: "The instant lesson feature is amazing. Whenever I have free time, I just open the app and start speaking Spanish with a native. No scheduling hassle!", rating: 5, avatar: "LM" },
];

function CountUp({ target, suffix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started.current) {
        started.current = true;
        let start = 0;
        const step = target / 60;
        const interval = setInterval(() => {
          start += step;
          if (start >= target) { setCount(target); clearInterval(interval); }
          else setCount(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>;
}

export default function Landing() {
  return (
    <div className="dark-theme min-h-screen bg-[#0a0a1a] text-white overflow-x-hidden" style={{colorScheme:'dark'}}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#0a0a1a]/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageCircle className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-white">One Talky</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#tutors" className="hover:text-white transition-colors">Tutors</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-gray-300 hover:text-white hover:bg-white/10">Log in</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:shadow-violet-500/50">
                Get started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden">
        {/* Background glow orbs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-violet-600/20 blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-72 h-72 rounded-full bg-indigo-500/15 blur-[80px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-72 h-72 rounded-full bg-emerald-500/10 blur-[80px] pointer-events-none" />

        {/* Floating avatar cards */}
        <div className="absolute left-8 top-48 hidden xl:block animate-float-slow">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center gap-3 shadow-xl">
            <img src={FEATURED_TUTORS[0].photo} className="w-10 h-10 rounded-full object-cover" alt="" />
            <div>
              <p className="text-xs font-semibold text-white">Sarah J.</p>
              <p className="text-[10px] text-emerald-400 font-medium">● Available now</p>
            </div>
          </div>
        </div>
        <div className="absolute right-8 top-52 hidden xl:block animate-float-delayed">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center gap-3 shadow-xl">
            <img src={FEATURED_TUTORS[1].photo} className="w-10 h-10 rounded-full object-cover" alt="" />
            <div>
              <p className="text-xs font-semibold text-white">Carlos M.</p>
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <p className="text-[10px] text-amber-400 font-medium">4.8</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute left-16 bottom-32 hidden xl:block animate-float">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-2.5 shadow-xl">
            <p className="text-[10px] text-gray-400">Lesson started</p>
            <p className="text-xs font-semibold text-white mt-0.5">🇫🇷 French · 12:43</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5 fill-violet-400 text-violet-400" />
            5 languages · 100% native tutors · Live now
          </div>

          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[0.92] tracking-tight mb-8">
            <span className="text-white">Speak like a </span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 via-indigo-400 to-emerald-400">native</span>
            <br />
            <span className="text-white">with real natives.</span>
          </h1>

          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed mb-12">
            Live video conversations with verified native speakers. No grammar drills, no textbooks — just real talk, on demand, 24/7.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link to="/register">
              <Button size="lg" className="group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 h-13 text-base rounded-2xl shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40 animate-pulse-glow border-0">
                Start speaking now
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/register?role=tutor">
              <Button size="lg" variant="outline" className="px-8 h-13 text-base rounded-2xl border-white/20 text-white hover:bg-white/10 hover:border-white/40 transition-all bg-transparent">
                Teach & earn money
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-500">
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-violet-400" /> Verified tutors</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-violet-400" /> Available 24/7</span>
            <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-violet-400" /> HD video calls</span>
          </div>
        </div>
      </section>

      {/* Stats counter */}
      <section className="py-12 px-4 border-y border-white/5 bg-white/3">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 10000, suffix: "+", label: "Lessons completed" },
            { value: 500, suffix: "+", label: "Native tutors" },
            { value: 50000, suffix: "+", label: "Minutes practiced" },
            { value: 98, suffix: "%", label: "Satisfaction rate" },
          ].map((s, i) => (
            <div key={i}>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-indigo-400">
                <CountUp target={s.value} suffix={s.suffix} />
              </p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Language pills */}
      <section className="py-14 px-4">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-3">
          {LANGUAGES.map(l => (
            <div key={l.value} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-gray-300 hover:border-violet-500/50 hover:bg-violet-500/10 hover:text-white transition-all cursor-default">
              <span className="text-lg">{l.flag}</span> {l.label}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-violet-950/30 to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto relative">
          <p className="text-center text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">How it works</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-white mb-4">
            From zero to fluent,<br />in 3 simple steps
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-lg mx-auto">No complicated setup. No long contracts. Just you and a native speaker.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: Globe, title: "Choose your language", desc: "Pick from English, Spanish, French, Italian or German and tell us your level.", color: "from-violet-500 to-indigo-500" },
              { step: "02", icon: Users, title: "Find a native tutor", desc: "Browse verified native speakers, watch their intro videos, and pick your match.", color: "from-indigo-500 to-blue-500" },
              { step: "03", icon: Video, title: "Start talking", desc: "Jump into a live video call instantly or schedule a session — it's that simple.", color: "from-emerald-500 to-teal-500" },
            ].map(s => (
              <div key={s.step} className="group relative bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/8 hover:border-white/20 transition-all hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1">
                <div className="absolute top-6 right-6 text-6xl font-extrabold text-white/5 font-display select-none">{s.step}</div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-white mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tutors */}
      <section id="tutors" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">Our tutors</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-white mb-4">Meet the people<br />who'll change your life</h2>
          <p className="text-center text-gray-500 mb-16 max-w-lg mx-auto">Native speakers from around the world, ready to help you speak with confidence</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURED_TUTORS.map((t, i) => (
              <div key={i} className="group relative bg-white/5 border border-white/10 rounded-3xl p-6 hover:bg-white/8 hover:border-violet-500/30 transition-all hover:shadow-2xl hover:shadow-violet-500/10 hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center gap-4 mb-5">
                  <div className="relative">
                    <img src={t.photo} alt={t.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-white/10 group-hover:ring-violet-500/40 transition-all" />
                    {t.available && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-[#0a0a1a] rounded-full">
                        <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-60" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-white">{t.name}</h4>
                    <p className="text-sm text-gray-500">{t.country}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-violet-300 bg-violet-500/15 border border-violet-500/20 px-3 py-1 rounded-full">{t.lang}</span>
                  <span className="flex items-center gap-1 text-sm text-amber-400 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {t.rating}
                  </span>
                </div>
                {t.available && (
                  <div className="mt-3 text-xs font-medium text-emerald-400">● Available now</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why One Talky */}
      <section className="py-24 px-4 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-950/50 via-indigo-950/30 to-[#0a0a1a] pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-violet-500/50" />
        <div className="max-w-7xl mx-auto relative">
          <p className="text-center text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">Why us</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-white mb-16">
            Everything you need<br />to actually speak
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: MessageCircle, title: "100% Conversation", desc: "No boring grammar drills. Just real, meaningful talk.", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
              { icon: Zap, title: "On-demand 24/7", desc: "Instant lessons available anytime. No scheduling needed.", color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
              { icon: Globe, title: "Real-time translation", desc: "In-call chat with automatic translation to help you learn.", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
              { icon: Video, title: "Lesson recordings", desc: "Every session is recorded so you can review and improve.", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
            ].map((d, i) => (
              <div key={i} className={`border rounded-3xl p-7 ${d.bg} hover:-translate-y-1 transition-all`}>
                <div className={`w-12 h-12 rounded-2xl ${d.bg} border flex items-center justify-center mb-5`}>
                  <d.icon className={`w-6 h-6 ${d.color}`} />
                </div>
                <h3 className="font-display font-bold text-white text-lg mb-2">{d.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-400 text-sm font-semibold tracking-widest uppercase mb-4">Testimonials</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-white mb-16">What learners say</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-white/5 border border-white/10 rounded-3xl p-8 hover:bg-white/8 hover:border-white/15 transition-all">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-8">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-white text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Become Tutor */}
      <section className="py-24 px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-950/60 to-teal-950/40 pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-sm font-medium mb-8">
            <Mic className="w-3.5 h-3.5" /> Become a tutor
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white mb-6">
            Earn money teaching<br />your native language
          </h2>
          <p className="text-gray-400 mb-10 max-w-xl mx-auto">
            You're already fluent — why not help others speak like you? Set your own schedule, set your rate, and start earning from anywhere.
          </p>
          <Link to="/register?role=tutor">
            <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-10 h-13 text-base rounded-2xl shadow-lg shadow-emerald-500/30 transition-all hover:scale-105 border-0">
              Apply as tutor <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-14 px-4 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-white text-lg">One Talky</span>
              </div>
              <p className="text-sm text-gray-600">Real conversations with real natives.</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Languages</h4>
              {LANGUAGES.map(l => <p key={l.value} className="text-sm text-gray-600 mb-2">{l.flag} {l.label}</p>)}
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Platform</h4>
              <p className="text-sm text-gray-600 mb-2">How it works</p>
              <p className="text-sm text-gray-600 mb-2">Pricing</p>
              <p className="text-sm text-gray-600 mb-2">Become a tutor</p>
            </div>
            <div>
              <h4 className="text-white font-semibold text-sm mb-4">Tutors</h4>
              <Link to="/register?role=tutor" className="block text-sm text-violet-400 hover:text-violet-300 transition-colors mb-2 font-medium">
                Apply as a tutor →
              </Link>
              <Link to="/login" className="block text-sm text-gray-600 hover:text-gray-400 transition-colors mb-2">
                Tutor login
              </Link>
              <p className="text-sm text-gray-600 mb-2">Tutor guidelines</p>
            </div>
          </div>
          <div className="border-t border-white/5 pt-8 text-center text-sm text-gray-700">
            © 2026 One Talky. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}