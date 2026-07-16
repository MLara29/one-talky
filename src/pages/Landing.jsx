import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Star, Video, Globe, Users, Clock, Shield, MessageCircle, ChevronRight, Zap, Mic, BookOpen } from "lucide-react";
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
  { name: "Pedro Silva", role: "Engenheiro de Software", text: "Em 3 meses de conversação diária com tutores nativos, passei de entender quase nada a fazer reuniões fluentes em inglês. One Talky mudou minha carreira.", rating: 5, avatar: "PS" },
  { name: "Yuki Tanaka", role: "Designer", text: "Tentei apps, cursos, livros de gramática... nada funcionou como falar com pessoas reais. 20 minutos por dia e finalmente me sinto confiante em francês.", rating: 5, avatar: "YT" },
  { name: "Lisa Müller", role: "Diretora de Marketing", text: "A função de aula instantânea é incrível. Sempre que tenho tempo livre, abro o app e começo a falar espanhol com um nativo. Sem agendamento!", rating: 5, avatar: "LM" },
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
    <div className="min-h-screen bg-gray-50 text-gray-900 overflow-x-hidden" style={{ colorScheme: "light" }}>
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur-xl shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <MessageCircle className="w-5 h-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">One Talky</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-500">
            <a href="#how-it-works" className="hover:text-gray-900 transition-colors">Como funciona</a>
            <a href="#tutors" className="hover:text-gray-900 transition-colors">Tutores</a>
            <a href="#pricing" className="hover:text-gray-900 transition-colors">Preços</a>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm" className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white border-0 shadow-md shadow-violet-500/20 transition-all hover:scale-105">
                Começar agora
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-32 pb-24 px-4 overflow-hidden bg-white">
        {/* Soft background blobs */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-violet-100/80 blur-[120px] pointer-events-none" />
        <div className="absolute top-40 left-1/4 w-72 h-72 rounded-full bg-indigo-100/60 blur-[80px] pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-72 h-72 rounded-full bg-emerald-100/50 blur-[80px] pointer-events-none" />

        {/* Floating avatar cards */}
        <div className="absolute left-8 top-48 hidden xl:block animate-float-slow">
          <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 shadow-xl shadow-gray-200/60">
            <img src={FEATURED_TUTORS[0].photo} className="w-10 h-10 rounded-full object-cover" alt="" />
            <div>
              <p className="text-xs font-semibold text-gray-800">Sarah J.</p>
              <p className="text-[10px] text-emerald-500 font-medium">● Disponível agora</p>
            </div>
          </div>
        </div>
        <div className="absolute right-8 top-52 hidden xl:block animate-float-delayed">
          <div className="bg-white border border-gray-200 rounded-2xl p-3 flex items-center gap-3 shadow-xl shadow-gray-200/60">
            <img src={FEATURED_TUTORS[1].photo} className="w-10 h-10 rounded-full object-cover" alt="" />
            <div>
              <p className="text-xs font-semibold text-gray-800">Carlos M.</p>
              <div className="flex items-center gap-0.5">
                <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                <p className="text-[10px] text-amber-500 font-medium">4.8</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute left-16 bottom-32 hidden xl:block animate-float">
          <div className="bg-white border border-gray-200 rounded-2xl px-4 py-2.5 shadow-xl shadow-gray-200/60">
            <p className="text-[10px] text-gray-400">Aula iniciada</p>
            <p className="text-xs font-semibold text-gray-800 mt-0.5">🇫🇷 Francês · 12:43</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-100 border border-violet-200 text-violet-700 text-sm font-medium mb-8">
            <Zap className="w-3.5 h-3.5 fill-violet-500 text-violet-500" />
            5 idiomas · 100% tutores nativos · Ao vivo agora
          </div>

          <h1 className="font-display text-5xl sm:text-7xl lg:text-8xl font-extrabold leading-[0.92] tracking-tight mb-8 text-gray-900">
            Fale como um{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 via-indigo-500 to-emerald-500">nativo</span>
            <br />
            com nativos reais.
          </h1>

          <p className="text-lg sm:text-xl text-gray-500 max-w-2xl mx-auto leading-relaxed mb-12">
            Conversas ao vivo por vídeo com falantes nativos verificados. Sem exercícios de gramática, sem livros — só conversa real, sob demanda, 24/7.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
            <Link to="/register">
              <Button size="lg" className="group bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-8 h-13 text-base rounded-2xl shadow-lg shadow-violet-500/30 transition-all hover:scale-105 hover:shadow-xl hover:shadow-violet-500/40 border-0">
                Começar a falar agora
                <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            <Link to="/register?role=tutor">
              <Button size="lg" variant="outline" className="px-8 h-13 text-base rounded-2xl border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all bg-white">
                Ensinar e ganhar dinheiro
              </Button>
            </Link>
          </div>

          <div className="flex items-center justify-center gap-8 text-sm text-gray-400">
            <span className="flex items-center gap-1.5"><Shield className="w-4 h-4 text-violet-500" /> Tutores verificados</span>
            <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-violet-500" /> Disponível 24/7</span>
            <span className="flex items-center gap-1.5"><Video className="w-4 h-4 text-violet-500" /> Vídeo HD</span>
          </div>
        </div>
      </section>

      {/* Stats counter */}
      <section className="py-12 px-4 border-y border-gray-100 bg-gray-50">
        <div className="max-w-4xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[
            { value: 10000, suffix: "+", label: "Aulas concluídas" },
            { value: 500, suffix: "+", label: "Tutores nativos" },
            { value: 50000, suffix: "+", label: "Minutos praticados" },
            { value: 98, suffix: "%", label: "Satisfação" },
          ].map((s, i) => (
            <div key={i}>
              <p className="font-display text-3xl sm:text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-indigo-500">
                <CountUp target={s.value} suffix={s.suffix} />
              </p>
              <p className="text-sm text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Language pills */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-3">
          {LANGUAGES.map(l => (
            <div key={l.value} className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-gray-50 border border-gray-200 text-sm font-medium text-gray-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700 transition-all cursor-default">
              <span className="text-lg">{l.flag}</span> {l.label}
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-600 text-sm font-semibold tracking-widest uppercase mb-4">Como funciona</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-gray-900 mb-4">
            Do zero ao fluente,<br />em 3 passos simples
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-lg mx-auto">Sem configurações complicadas. Sem contratos longos. Só você e um falante nativo.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { step: "01", icon: Globe, title: "Escolha seu idioma", desc: "Selecione entre inglês, espanhol, francês, italiano ou alemão e diga seu nível.", color: "from-violet-500 to-indigo-500" },
              { step: "02", icon: Users, title: "Encontre um tutor nativo", desc: "Navegue por falantes nativos verificados, assista aos vídeos de apresentação e escolha o seu.", color: "from-indigo-500 to-blue-500" },
              { step: "03", icon: Video, title: "Comece a falar", desc: "Entre em uma chamada ao vivo instantaneamente ou agende uma sessão — simples assim.", color: "from-emerald-500 to-teal-500" },
            ].map(s => (
              <div key={s.step} className="group relative bg-white border border-gray-200 rounded-3xl p-8 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100 transition-all hover:-translate-y-1">
                <div className="absolute top-6 right-6 text-6xl font-extrabold text-gray-100 font-display select-none">{s.step}</div>
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-6 shadow-lg`}>
                  <s.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Tutors */}
      <section id="tutors" className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-600 text-sm font-semibold tracking-widest uppercase mb-4">Nossos tutores</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-gray-900 mb-4">Conheça as pessoas<br />que vão transformar seu aprendizado</h2>
          <p className="text-center text-gray-500 mb-16 max-w-lg mx-auto">Falantes nativos de todo o mundo, prontos para te ajudar a falar com confiança</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURED_TUTORS.map((t, i) => (
              <div key={i} className="group relative bg-white border border-gray-200 rounded-3xl p-6 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-100 transition-all hover:-translate-y-1 cursor-pointer">
                <div className="flex items-center gap-4 mb-5">
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
                    <p className="text-sm text-gray-500">{t.country}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-violet-700 bg-violet-50 border border-violet-100 px-3 py-1 rounded-full">{t.lang}</span>
                  <span className="flex items-center gap-1 text-sm text-amber-500 font-semibold">
                    <Star className="w-3.5 h-3.5 fill-amber-400" /> {t.rating}
                  </span>
                </div>
                {t.available && (
                  <div className="mt-3 text-xs font-medium text-emerald-500">● Disponível agora</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why One Talky */}
      <section className="py-24 px-4 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-600 text-sm font-semibold tracking-widest uppercase mb-4">Por que nós</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-gray-900 mb-16">
            Tudo que você precisa<br />para realmente falar
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { icon: MessageCircle, title: "100% Conversação", desc: "Sem exercícios chatos de gramática. Só conversa real e significativa.", color: "text-violet-600", bg: "bg-violet-50 border-violet-100" },
              { icon: Zap, title: "Sob demanda 24/7", desc: "Aulas instantâneas disponíveis a qualquer hora. Sem agendamento.", color: "text-indigo-600", bg: "bg-indigo-50 border-indigo-100" },
              { icon: Globe, title: "Tradução em tempo real", desc: "Chat durante a chamada com tradução automática para te ajudar.", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-100" },
              { icon: Video, title: "Gravações de aulas", desc: "Cada sessão é gravada para você revisar e evoluir depois.", color: "text-blue-600", bg: "bg-blue-50 border-blue-100" },
            ].map((d, i) => (
              <div key={i} className={`border rounded-3xl p-7 bg-white ${d.bg} hover:-translate-y-1 transition-all hover:shadow-lg`}>
                <div className={`w-12 h-12 rounded-2xl border ${d.bg} flex items-center justify-center mb-5`}>
                  <d.icon className={`w-6 h-6 ${d.color}`} />
                </div>
                <h3 className="font-display font-bold text-gray-900 text-lg mb-2">{d.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{d.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-violet-600 text-sm font-semibold tracking-widest uppercase mb-4">Depoimentos</p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold text-center text-gray-900 mb-16">O que os alunos dizem</h2>
          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <div key={i} className="bg-gray-50 border border-gray-200 rounded-3xl p-8 hover:shadow-lg hover:border-violet-200 transition-all">
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: t.rating }).map((_, j) => (
                    <Star key={j} className="w-4 h-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-gray-600 text-sm leading-relaxed mb-8">"{t.text}"</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-xs font-bold text-white">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Become Tutor */}
      <section className="py-24 px-4 bg-gradient-to-br from-emerald-50 to-teal-50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-700 text-sm font-medium mb-8">
            <Mic className="w-3.5 h-3.5" /> Seja um tutor
          </div>
          <h2 className="font-display text-3xl sm:text-5xl font-extrabold text-gray-900 mb-6">
            Ganhe dinheiro ensinando<br />seu idioma nativo
          </h2>
          <p className="text-gray-500 mb-10 max-w-xl mx-auto">
            Você já é fluente — por que não ajudar outros a falar como você? Defina seu horário, sua tarifa e comece a ganhar de onde quiser.
          </p>
          <Link to="/register?role=tutor">
            <Button size="lg" className="bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white px-10 h-13 text-base rounded-2xl shadow-lg shadow-emerald-500/20 transition-all hover:scale-105 border-0">
              Candidatar-se como tutor <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-14 px-4 border-t border-gray-200 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-10 mb-12">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                  <MessageCircle className="w-4 h-4 text-white" />
                </div>
                <span className="font-display font-bold text-gray-900 text-lg">One Talky</span>
              </div>
              <p className="text-sm text-gray-500">Conversas reais com nativos reais.</p>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">Idiomas</h4>
              {LANGUAGES.map(l => <p key={l.value} className="text-sm text-gray-500 mb-2">{l.flag} {l.label}</p>)}
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">Plataforma</h4>
              <p className="text-sm text-gray-500 mb-2">Como funciona</p>
              <p className="text-sm text-gray-500 mb-2">Preços</p>
              <p className="text-sm text-gray-500 mb-2">Seja um tutor</p>
            </div>
            <div>
              <h4 className="text-gray-900 font-semibold text-sm mb-4">Tutores</h4>
              <Link to="/register?role=tutor" className="block text-sm text-violet-600 hover:text-violet-500 transition-colors mb-2 font-medium">
                Candidatar-se →
              </Link>
              <Link to="/login" className="block text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2">
                Login de tutores
              </Link>
              <p className="text-sm text-gray-500 mb-2">Diretrizes para tutores</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-8 text-center text-sm text-gray-400">
            © 2026 One Talky. Todos os direitos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}