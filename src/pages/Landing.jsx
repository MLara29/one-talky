import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, Globe, Users, Clock, Shield, MessageCircle, ChevronRight, Zap, Mic, CheckCircle } from "lucide-react";

const ENGLISH_TUTORS = [
  { name: "Sarah Johnson", country: "🇺🇸 United States", accent: "American English", rating: 4.9, available: true, photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face", topics: ["Business", "Travel", "Pop Culture"] },
  { name: "James Wilson", country: "🇬🇧 United Kingdom", accent: "British English", rating: 4.8, available: true, photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face", topics: ["Academic", "Daily Life", "History"] },
  { name: "Emily Carter", country: "🇺🇸 United States", accent: "American English", rating: 5.0, available: false, photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face", topics: ["Job Interviews", "Business", "IELTS"] },
  { name: "Oliver Smith", country: "🇬🇧 United Kingdom", accent: "British English", rating: 4.7, available: true, photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face", topics: ["Casual Talk", "Sports", "Technology"] },
  { name: "Jessica Brown", country: "🇺🇸 United States", accent: "American English", rating: 4.9, available: false, photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face", topics: ["Pronunciation", "Movies & TV", "Music"] },
  { name: "William Turner", country: "🇬🇧 United Kingdom", accent: "British English", rating: 4.8, available: true, photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face", topics: ["Literature", "Culture", "Travel"] },
];

const TESTIMONIALS = [
  { name: "Pedro Silva", role: "Engenheiro de Software", text: "Em 3 meses de conversação diária com tutores nativos, passei de entender quase nada a fazer reuniões fluentes em inglês. One Talky mudou minha carreira.", rating: 5, avatar: "PS" },
  { name: "Yuki Tanaka", role: "Designer", text: "Tentei apps, cursos, livros de gramática... nada funcionou como falar com pessoas reais. 20 minutos por dia e finalmente me sinto confiante em inglês.", rating: 5, avatar: "YT" },
  { name: "Lisa Müller", role: "Diretora de Marketing", text: "A função de aula instantânea é incrível. Sempre que tenho tempo livre, abro o app e começo a falar inglês com um nativo americano ou britânico. Sem agendamento!", rating: 5, avatar: "LM" },
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
    <div className="min-h-screen text-gray-900 overflow-x-hidden" style={{ colorScheme: "light", background: "#ffffff" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/97 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="font-display text-xl font-bold text-gray-900">One Talky</span>
              <span className="ml-2 text-[10px] font-bold tracking-widest text-violet-600 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded-full uppercase">English</span>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">Como funciona</a>
            <a href="#tutors" className="hover:text-gray-900 transition-colors">Tutores</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-gray-700 hover:text-gray-900 hover:bg-gray-100 font-medium">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-md shadow-violet-500/20 transition-all hover:scale-105 font-semibold">
                Começar grátis
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-28 pb-20 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 30%, #1e40af 60%, #0f172a 100%)" }}>
        {/* Decorative flags / country icons */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Big Ben silhouette - right */}
          <div className="absolute right-0 bottom-0 opacity-[0.07] text-white" style={{ fontSize: "280px", lineHeight: 1, userSelect: "none" }}>🏰</div>
          {/* Statue of Liberty - left */}
          <div className="absolute left-0 bottom-0 opacity-[0.07] text-white" style={{ fontSize: "220px", lineHeight: 1, userSelect: "none" }}>🗽</div>
          {/* Subtle blobs */}
          <div className="absolute top-20 left-1/3 w-96 h-96 rounded-full bg-violet-500/10 blur-[100px]" />
          <div className="absolute bottom-10 right-1/3 w-64 h-64 rounded-full bg-blue-400/10 blur-[80px]" />
        </div>

        {/* Floating cards */}
        <div className="absolute left-6 top-40 hidden xl:block" style={{ animation: "float 5s ease-in-out infinite" }}>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
            <span className="text-3xl">🇺🇸</span>
            <div>
              <p className="text-xs font-bold text-white">American English</p>
              <p className="text-[10px] text-emerald-400 font-medium">● Disponível agora</p>
            </div>
          </div>
        </div>
        <div className="absolute right-6 top-44 hidden xl:block" style={{ animation: "float 6s ease-in-out infinite 1s" }}>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-3 flex items-center gap-3 shadow-2xl">
            <span className="text-3xl">🇬🇧</span>
            <div>
              <p className="text-xs font-bold text-white">British English</p>
              <div className="flex items-center gap-1">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <p className="text-[10px] text-amber-400 font-medium">4.9 · 342 aulas</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute left-12 bottom-24 hidden xl:block" style={{ animation: "float 4s ease-in-out infinite 0.5s" }}>
          <div className="bg-white/10 backdrop-blur border border-white/20 rounded-2xl px-4 py-2.5 shadow-2xl">
            <p className="text-[10px] text-blue-200">Aula em andamento</p>
            <p className="text-xs font-bold text-white mt-0.5">🇺🇸 English · 18:32</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          {/* Flags badge */}
          <div className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold mb-8 backdrop-blur">
            <span className="text-lg">🇺🇸</span>
            <span className="text-white/60">·</span>
            <span className="text-lg">🇬🇧</span>
            <span className="text-white/60 mx-1">|</span>
            Tutores Nativos de Inglês · Ao Vivo 24/7
          </div>

          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[0.9] tracking-tight mb-6 text-white">
            Fale inglês como{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-200 to-amber-400">
              um nativo
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-blue-100 max-w-2xl mx-auto leading-relaxed mb-4">
            Conversas ao vivo por vídeo com americanos e britânicos verificados.
          </p>
          <p className="text-base text-blue-200/70 max-w-xl mx-auto mb-12">
            Sem gramática chata, sem livros — só conversa real, sob demanda.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link to="/register">
              <Button size="lg" className="group bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-gray-900 font-bold px-8 h-14 text-base rounded-2xl shadow-2xl shadow-amber-500/30 transition-all hover:scale-105 border-0">
                Começar a falar agora
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/register?role=tutor">
              <Button size="lg" variant="outline" className="px-8 h-14 text-base rounded-2xl border-white/30 text-white hover:bg-white/10 hover:border-white/50 transition-all bg-transparent font-medium">
                Ensinar e ganhar
              </Button>
            </Link>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-blue-200">
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-400" /> Tutores verificados</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-emerald-400" /> Disponível 24/7</span>
            <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-emerald-400" /> Vídeo HD</span>
            <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> Aula instantânea</span>
          </div>
        </div>
      </section>

      {/* Stats counter */}
      <section className="py-14 px-4 border-b border-gray-100 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 10000, suffix: "+", label: "Aulas de inglês" },
            { value: 500, suffix: "+", label: "Tutores nativos" },
            { value: 50000, suffix: "+", label: "Minutos praticados" },
            { value: 98, suffix: "%", label: "Satisfação" },
          ].map((s, i) => (
            <div key={i}>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-600">
                <CountUp target={s.value} suffix={s.suffix} />
              </p>
              <p className="text-sm text-gray-600 font-medium mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* English focus banner */}
      <section className="py-10 px-4 bg-gradient-to-r from-blue-600 to-indigo-700">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-6 text-center sm:text-left">
          <div className="flex items-center gap-4">
            <span className="text-5xl">🇺🇸</span>
            <span className="text-5xl">🇬🇧</span>
          </div>
          <div>
            <p className="font-display text-2xl sm:text-3xl font-extrabold text-white">100% focado em Inglês</p>
            <p className="text-blue-200 mt-1">Americanos e britânicos prontos para te ajudar a fluir na língua mais falada do mundo</p>
          </div>
          <Link to="/register" className="shrink-0">
            <Button className="bg-white text-indigo-700 hover:bg-blue-50 font-bold px-6 h-12 rounded-2xl border-0 shadow-xl">
              Começar agora →
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-700 text-sm font-bold tracking-widest uppercase mb-4">Como funciona</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-gray-900 mb-4">
            Do básico ao fluente,<br />em 3 passos simples
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-lg mx-auto">Sem configurações complicadas. Sem contratos longos. Só você e um falante nativo de inglês.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", emoji: "🎯", title: "Escolha seu nível", desc: "Diga se você é iniciante, intermediário ou avançado. Nosso sistema encontra o tutor certo para você.", color: "from-violet-600 to-indigo-600" },
              { step: "02", emoji: "🇺🇸🇬🇧", title: "Encontre seu tutor", desc: "Navegue por americanos e britânicos verificados, assista aos vídeos e escolha seu favorito.", color: "from-indigo-600 to-blue-600" },
              { step: "03", emoji: "🎤", title: "Comece a falar", desc: "Entre em uma chamada ao vivo instantaneamente ou agende uma sessão — simples assim.", color: "from-blue-600 to-cyan-500" },
            ].map(s => (
              <div key={s.step} className="group relative bg-white border border-gray-200 rounded-3xl p-8 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100 transition-all hover:-translate-y-1">
                <div className="absolute top-6 right-6 text-6xl font-extrabold text-gray-100 font-display select-none">{s.step}</div>
                <div className="text-4xl mb-6">{s.emoji}</div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tutors */}
      <section id="tutors" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center gap-3 mb-4">
            <span className="text-2xl">🇺🇸</span>
            <p className="text-violet-700 text-sm font-bold tracking-widest uppercase">Nossos tutores</p>
            <span className="text-2xl">🇬🇧</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-gray-900 mb-4">
            Americanos e britânicos<br />prontos para você falar agora
          </h2>
          <p className="text-center text-gray-600 mb-16 max-w-lg mx-auto">Falantes nativos verificados, com sotaques americano e britânico, especialistas em conversação</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {ENGLISH_TUTORS.map((t, i) => (
              <div key={i} className="group relative bg-white border border-gray-200 rounded-3xl p-6 hover:border-violet-300 hover:shadow-xl hover:shadow-violet-100 transition-all hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center gap-4 mb-4">
                  <div className="relative">
                    <img src={t.photo} alt={t.name} className="w-16 h-16 rounded-2xl object-cover ring-2 ring-gray-100 group-hover:ring-violet-200 transition-all" />
                    {t.available && (
                      <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 border-2 border-white rounded-full">
                        <span className="absolute inset-0 bg-emerald-400 rounded-full animate-ping opacity-60" />
                      </span>
                    )}
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-gray-900">{t.name}</h4>
                    <p className="text-sm font-semibold text-gray-700">{t.country}</p>
                    <p className="text-xs text-violet-600 font-medium mt-0.5">{t.accent}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="flex items-center gap-1 text-sm text-amber-600 font-bold">
                    <Star className="w-3.5 h-3.5 fill-amber-500" /> {t.rating}
                  </span>
                  {t.available
                    ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">● Disponível agora</span>
                    : <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">Agendável</span>
                  }
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {t.topics.map(topic => (
                    <span key={topic} className="text-xs px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-700 font-medium">{topic}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why One Talky */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-700 text-sm font-bold tracking-widest uppercase mb-4">Por que nós</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-gray-900 mb-16">
            Tudo que você precisa<br />para falar inglês de verdade
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { emoji: "💬", title: "100% Conversação", desc: "Sem exercícios chatos de gramática. Só conversa real com americanos e britânicos.", bg: "bg-violet-50 border-violet-200", titleColor: "text-violet-900" },
              { emoji: "⚡", title: "Sob demanda 24/7", desc: "Aulas instantâneas a qualquer hora. Sem agendamento — clique e comece.", bg: "bg-blue-50 border-blue-200", titleColor: "text-blue-900" },
              { emoji: "🎯", title: "Sotaque americano ou britânico", desc: "Escolha o sotaque que quer praticar. Nós temos nativos dos dois países.", bg: "bg-amber-50 border-amber-200", titleColor: "text-amber-900" },
              { emoji: "📹", title: "Gravações de aulas", desc: "Cada sessão é gravada para você revisar sua pronúncia e evolução.", bg: "bg-emerald-50 border-emerald-200", titleColor: "text-emerald-900" },
            ].map((d, i) => (
              <div key={i} className={`border rounded-3xl p-7 ${d.bg} hover:-translate-y-1 transition-all hover:shadow-lg`}>
                <div className="text-4xl mb-5">{d.emoji}</div>
                <h3 className={`font-display font-bold text-lg mb-2 ${d.titleColor}`}>{d.title}</h3>
                <p className="text-gray-700 text-sm leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-700 text-sm font-bold tracking-widest uppercase mb-4">Depoimentos</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-gray-900 mb-16">O que os alunos dizem</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:shadow-lg hover:border-violet-200 transition-all">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-500 text-amber-500" />
                  ))}
                </div>
                <p className="text-gray-700 text-sm leading-relaxed mb-8">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Become Tutor */}
      <section className="py-24 px-4" style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #1e40af 100%)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="flex items-center justify-center gap-4 mb-6">
            <span className="text-5xl">🇺🇸</span>
            <span className="text-5xl">🇬🇧</span>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-white mb-6">
            É nativo de inglês?<br />Ganhe dinheiro ensinando
          </h2>
          <p className="text-blue-200 mb-10 max-w-xl mx-auto text-lg">
            Você já fala inglês perfeitamente — por que não ajudar outros a falar como você? Defina seu horário e comece a ganhar de onde quiser.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/register?role=tutor">
              <Button size="lg" className="bg-gradient-to-r from-amber-400 to-yellow-500 hover:from-amber-300 hover:to-yellow-400 text-gray-900 font-bold px-10 h-14 text-base rounded-2xl shadow-2xl shadow-amber-500/20 transition-all hover:scale-105 border-0">
                Candidatar-se como tutor <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-6 mt-8 text-blue-200 text-sm">
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> Sem mensalidade</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> Você define seu horário</span>
            <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-emerald-400" /> Pague via Payoneer</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-14 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-3 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-gray-900 text-lg">One Talky</span>
              </div>
              <p className="text-sm text-gray-600">Conversas reais com nativos americanos e britânicos.</p>
              <div className="flex items-center gap-2 mt-4">
                <span className="text-2xl">🇺🇸</span>
                <span className="text-2xl">🇬🇧</span>
              </div>
            </div>
            <div>
              <h4 className="text-gray-900 font-bold text-sm mb-4">Plataforma</h4>
              <p className="text-sm text-gray-600 mb-2 hover:text-gray-900 cursor-pointer">Como funciona</p>
              <p className="text-sm text-gray-600 mb-2 hover:text-gray-900 cursor-pointer">Preços</p>
              <p className="text-sm text-gray-600 mb-2 hover:text-gray-900 cursor-pointer">Seja um tutor</p>
            </div>
            <div>
              <h4 className="text-gray-900 font-bold text-sm mb-4">Tutores</h4>
              <Link to="/register?role=tutor" className="block text-sm text-violet-700 hover:text-violet-500 transition-colors mb-2 font-semibold">
                Candidatar-se →
              </Link>
              <Link to="/login" className="block text-sm text-gray-600 hover:text-gray-800 transition-colors mb-2">
                Login de tutores
              </Link>
              <p className="text-sm text-gray-600 mb-2">Diretrizes para tutores</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 text-center text-sm text-gray-500">
            © 2026 One Talky. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}