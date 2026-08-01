import React, { useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const STUDENT_FAQS = [
  { q: "Como funcionam os créditos (minutos)?", a: "As aulas são contabilizadas em minutos em tempo real. Os minutos do seu plano mensal têm validade de 60 dias a partir da ativação. Minutos pré-pagos avulsos não expiram enquanto sua conta estiver ativa." },
  { q: "Qual é a política de cancelamento?", a: "Aulas agendadas com mais de 24h de antecedência podem ser canceladas até 24h antes sem penalidade. Aulas marcadas em cima da hora têm até 1h após o agendamento para cancelar. Cancelamentos fora desses prazos e faltas (no-show) resultam em débito integral dos minutos da aula." },
  { q: "Como eu agendo uma aula?", a: "Na tela 'Encontrar Tutores', escolha um tutor e veja os horários disponíveis na agenda dele. Você também pode iniciar uma aula instantânea com tutores online no momento." },
  { q: "Posso cancelar minha assinatura quando quiser?", a: "Sim. Não há fidelidade. Você pode cancelar a qualquer momento na tela de Planos — o cancelamento é imediato e os minutos restantes do ciclo atual são zerados." },
  { q: "O que acontece se eu me atrasar para a aula?", a: "Você tem até 10 minutos de tolerância após o horário marcado para entrar na sala. Depois disso, se o tutor estiver presente, a aula é registrada como falta e os minutos são debitados." },
];

function FaqList({ items, prefix }) {
  const [open, setOpen] = useState(-1);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {items.map((f, i) => {
        const isOpen = open === i;
        return (
          <div key={`${prefix}-${i}`} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 14, overflow: "hidden" }}>
            <button
              onClick={() => setOpen(isOpen ? -1 : i)}
              style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "18px 22px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}
            >
              <span style={{ fontSize: 15.5, fontWeight: 700, color: "#111827" }}>{f.q}</span>
              <span style={{ flexShrink: 0, fontSize: 20, color: ACCENT, transform: isOpen ? "rotate(45deg)" : "rotate(0deg)", transition: "transform .2s" }}>+</span>
            </button>
            {isOpen && <p style={{ padding: "0 22px 20px", fontSize: 14.5, color: "#374151", margin: 0, lineHeight: 1.6 }}>{f.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

export default function FAQ() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Inter', sans-serif" }}>
      <header style={{ background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "16px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/landing" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", color: "#374151" }}>
            <ArrowLeft size={18} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>Voltar</span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${ACCENT}, #e05a10)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <MessageCircle size={18} color="#fff" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#111827" }}>One Talky</span>
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 780, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#111827", margin: 0 }}>
            Perguntas Frequentes
          </h1>
          <p style={{ marginTop: 12, fontSize: 15.5, color: "#6b7280" }}>
            Dúvidas comuns de alunos sobre a One Talky.
          </p>
        </div>

        <FaqList items={STUDENT_FAQS} prefix="student" />

        <p style={{ marginTop: 40, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
          Não encontrou sua resposta? Fale com o <Link to="/my-messages" style={{ color: ACCENT }}>Suporte</Link>.
        </p>
      </main>
    </div>
  );
}