import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useLang } from "@/lib/LanguageContext";
import { X, Sparkles, Calendar, Gift } from "lucide-react";

const L = {
  en: {
    welcome: "Welcome",
    greeting: (name) => `Hello, ${name}! 👋`,
    intro: (name) => `${name}, welcome to One Talky — a platform for practicing real English conversation with native tutors from around the world. Here you learn by actually speaking — no textbooks, no grammar drills, just real conversation, on demand.`,
    howToStart: "How to get started:",
    step1: "Click \"Book a lesson\" on a tutor's profile",
    step2: "Browse the tutor's profile and pick an available day and time",
    step3: "Save to confirm your lesson booking",
    freeMinutesTitle: (mins) => `You got ${mins} free minutes! 🎁`,
    freeMinutesBody: "Use your free minutes to take your first lesson at no cost: book a lesson, pick a tutor, day, and time, and save to start practicing.",
    cta: "Start practicing",
    closing: "Loading...",
  },
  pt_br: {
    welcome: "Bem-vindo(a)",
    greeting: (name) => `Olá, ${name}! 👋`,
    intro: (name) => `${name}, bem-vindo(a) à One Talky — uma plataforma de prática de conversação em inglês com tutores do mundo inteiro. Aqui você aprende falando de verdade — sem livros, sem decoreba de gramática, só conversa real, sob demanda.`,
    howToStart: "Como começar:",
    step1: "Clique em \"Agendar aula\" no perfil de um tutor",
    step2: "Veja o perfil do tutor e escolha um dia e horário disponível",
    step3: "Salve para confirmar o agendamento da sua aula",
    freeMinutesTitle: (mins) => `Você ganhou ${mins} minutos grátis! 🎁`,
    freeMinutesBody: "Use seus minutos para fazer a primeira aula grátis: agende uma aula, escolha o tutor, dia e horário, e salve para começar a praticar.",
    cta: "Começar a praticar",
    closing: "Carregando...",
  },
};

export default function WelcomeModal({ profile, onClose }) {
  const { lang } = useLang();
  const [closing, setClosing] = useState(false);
  const tr = L[lang] || L.en;

  const firstName = profile?.full_name?.split(" ")[0] || "";
  const hasFreeMinutes = profile?.signup_free_minutes_source != null;
  const freeMinutes = Math.round(profile?.prepaid_credits_minutes || 0);

  const handleClose = async () => {
    if (closing) return;
    setClosing(true);
    try {
      await base44.functions.invoke("dismissWelcomeModal", {});
    } catch (e) {
      console.error("WelcomeModal: failed to mark welcome_modal_shown:", e);
    }
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div
        className="w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col"
        style={{ background: "#fff", maxHeight: "90vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="relative px-6 py-8 shrink-0"
          style={{ background: "linear-gradient(135deg, #F26A1B 0%, #FF8C42 100%)" }}
        >
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 text-white/90 text-sm font-semibold mb-2">
            <Sparkles className="w-4 h-4" />
            {tr.welcome}
          </div>
          <h2 className="text-white text-2xl font-bold font-heading">{tr.greeting(firstName)}</h2>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 overflow-y-auto">
          <p className="text-sm leading-relaxed" style={{ color: "#475569" }}>
            {tr.intro(firstName)}
          </p>

          <div
            className="rounded-xl p-3.5"
            style={{ background: "#FFF3EA", border: "1px solid #F0EBE5" }}
          >
            <p className="text-xs font-bold mb-2.5 flex items-center gap-1.5" style={{ color: "#F26A1B" }}>
              <Calendar className="w-3.5 h-3.5" />
              {tr.howToStart}
            </p>
            <ol className="space-y-2 text-xs" style={{ color: "#475569" }}>
              <li className="flex gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 text-[10px] font-bold" style={{ background: "#F26A1B", color: "#fff" }}>1</span>
                <span>{tr.step1}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 text-[10px] font-bold" style={{ background: "#F26A1B", color: "#fff" }}>2</span>
                <span>{tr.step2}</span>
              </li>
              <li className="flex gap-2.5">
                <span className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 text-[10px] font-bold" style={{ background: "#F26A1B", color: "#fff" }}>3</span>
                <span>{tr.step3}</span>
              </li>
            </ol>
          </div>

          {hasFreeMinutes && freeMinutes > 0 && (
            <div
              className="rounded-xl p-3.5"
              style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <Gift className="w-4 h-4 text-emerald-600" />
                <p className="text-sm font-bold text-emerald-700">{tr.freeMinutesTitle(freeMinutes)}</p>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#475569" }}>
                {tr.freeMinutesBody}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 shrink-0">
          <button
            onClick={handleClose}
            disabled={closing}
            className="w-full py-3.5 rounded-xl text-white font-semibold text-sm transition-all hover:opacity-90 disabled:opacity-60"
            style={{ background: "#F26A1B" }}
          >
            {closing ? tr.closing : tr.cta}
          </button>
        </div>
      </div>
    </div>
  );
}