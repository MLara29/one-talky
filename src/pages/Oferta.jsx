import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const ACCENT = "#F26A1B";
const STORAGE_KEY = "ot_oferta_timer_start";
const DURATION_MS = 15 * 60 * 1000;
const COUPON_CODE = "SOCIAL30";

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.ot-oferta { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #17181C; background: #FDFBF9; -webkit-font-smoothing: antialiased; }
.ot-oferta * { box-sizing: border-box; }
@keyframes ot-pulse-ring { 0%{box-shadow:0 0 0 0 rgba(242,106,27,.45)} 70%{box-shadow:0 0 0 14px rgba(242,106,27,0)} 100%{box-shadow:0 0 0 0 rgba(242,106,27,0)} }
.ot-timer-pulse { animation: ot-pulse-ring 2s infinite; }
`;

export default function Oferta() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState(DURATION_MS);

  useEffect(() => {
    let startTime = sessionStorage.getItem(STORAGE_KEY);
    if (!startTime) {
      startTime = Date.now().toString();
      sessionStorage.setItem(STORAGE_KEY, startTime);
    }
    const update = () => {
      const elapsed = Date.now() - parseInt(startTime, 10);
      setTimeLeft(Math.max(0, DURATION_MS - elapsed));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  const timerDisplay = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  const expired = timeLeft <= 0;

  const goToRegister = () => navigate(`/register?coupon=${COUPON_CODE}`);

  const steps = [
    { n: "1", title: "Faça seu cadastro", body: "Criação da conta leva menos de 2 minutos. Sem cartão de crédito." },
    { n: "2", title: "Ganhe 15 minutos grátis", body: "Os 15 minutos entram automaticamente na sua conta ao concluir o cadastro." },
    { n: "3", title: "Agende uma aula com o tutor que preferir", body: "Escolha entre tutores nativos do mundo todo, pela disponibilidade que funciona pra você." },
    { n: "4", title: "Teste a plataforma de verdade", body: "Entre na videochamada, converse 1 a 1 e sinta na prática como funciona." },
    { n: "5", title: "Se gostar, assine com 30% de desconto", body: "Garantido para quem veio por este anúncio — no primeiro mês, sem fidelidade." },
  ];

  const benefits = [
    "Tutores nativos do mundo todo",
    "Aulas de conversação 1 a 1 (não é aula em grupo, não é curso gravado)",
    "Planos a partir de R$59,90/mês",
    "Cancele quando quiser, sem fidelidade",
    "Garantia de 7 dias — reembolso integral",
  ];

  return (
    <div className="ot-oferta" style={{ overflowX: "hidden", minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(253,251,249,.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid #EFEAE3" }}>
        <nav style={{ maxWidth: 1080, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png" alt="One Talky" style={{ height: 56, width: "auto" }} />
          <button onClick={() => navigate("/login")} style={{ padding: "8px 16px", borderRadius: 999, background: "transparent", border: "1.5px solid #E4DED6", color: "#3A3B45", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>Entrar</button>
        </nav>
      </header>

      {/* 1. HEADLINE DE DOR */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px 40px", textAlign: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FDECE0", color: "#C4520B", fontWeight: 700, fontSize: 13, padding: "7px 14px", borderRadius: 999, marginBottom: 24 }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT }} /> Oferta exclusiva · tráfego pago
        </div>
        <h1 style={{ fontSize: "clamp(32px,5vw,48px)", fontWeight: 800, letterSpacing: "-.025em", lineHeight: 1.08, margin: 0 }}>
          Precisa se expressar em inglês com confiança? <span style={{ color: ACCENT }}>A prática que faltou está aqui.</span>
        </h1>
      </section>

      {/* 2. POSICIONAMENTO */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px 56px" }}>
        <div style={{ background: "#fff", border: "1px solid #EEE7DD", borderRadius: 20, padding: "32px 28px", boxShadow: "0 10px 30px -20px rgba(23,24,28,.15)" }}>
          <p style={{ fontSize: 18, lineHeight: 1.6, color: "#3E3F49", margin: 0 }}>
            A <strong style={{ color: "#17181C" }}>One Talky</strong> <strong style={{ color: ACCENT }}>NÃO é uma escola</strong>, não é um curso.
            É uma plataforma de prática de <strong style={{ color: "#17181C" }}>CONVERSAÇÃO</strong> em inglês, com aulas individuais
            (<strong style={{ color: "#17181C" }}>um a um</strong>) com tutores nativos do mundo todo.
          </p>
        </div>
      </section>

      {/* 3. BENEFÍCIOS / CONDIÇÕES */}
      <section style={{ background: "#F7F2EB", borderTop: "1px solid #EFEAE3", borderBottom: "1px solid #EFEAE3" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "56px 24px" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", margin: "0 0 32px" }}>O que você tem com a One Talky</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {benefits.map((b, i) => (
              <div key={i} style={{ display: "flex", gap: 14, background: "#fff", border: "1px solid #EEE7DD", borderRadius: 14, padding: "18px 22px", alignItems: "flex-start" }}>
                <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "#FDECE0", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>✓</span>
                <p style={{ fontSize: 16, color: "#3E3F49", margin: 0, lineHeight: 1.45 }}>{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. BLOCO DE OFERTA + CRONÔMETRO */}
      <section style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px" }}>
        <div style={{ background: `linear-gradient(135deg, ${ACCENT}, #DC5109)`, borderRadius: 26, padding: "48px 36px", color: "#fff", textAlign: "center", boxShadow: "0 30px 60px -30px rgba(242,106,27,.6)" }}>
          <div style={{ display: "inline-block", fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", background: "rgba(255,255,255,.2)", padding: "6px 14px", borderRadius: 999, marginBottom: 20 }}>Sua oferta</div>

          <p style={{ fontSize: "clamp(20px,3vw,26px)", fontWeight: 800, lineHeight: 1.3, margin: "0 0 12px" }}>
            Cadastre-se agora e ganhe <span style={{ background: "rgba(255,255,255,.2)", padding: "2px 10px", borderRadius: 8 }}>15 minutos grátis</span> para testar uma aula com qualquer tutor.
          </p>
          <p style={{ fontSize: "clamp(18px,2.5vw,22px)", fontWeight: 700, lineHeight: 1.35, margin: "8px 0 0", color: "#FCE7D8" }}>
            Feche conosco hoje e garanta <span style={{ color: "#fff", textDecoration: "underline", textDecorationThickness: 2 }}>30% de desconto no primeiro mês</span> — oferta exclusiva para quem chegou por este anúncio.
          </p>

          {/* CRONÔMETRO */}
          <div style={{ marginTop: 32, marginBottom: 8 }}>
            <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", color: "#FCE7D8", margin: "0 0 12px" }}>
              {expired ? "Oferta expirada — recarregue a página para tentar novamente" : "Esta oferta expira em"}
            </p>
            <div className={expired ? "" : "ot-timer-pulse"} style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              width: 160, height: 160, borderRadius: "50%",
              background: expired ? "rgba(255,255,255,.15)" : "rgba(255,255,255,.12)",
              border: "3px solid rgba(255,255,255,.35)",
            }}>
              <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: "-.02em", fontVariantNumeric: "tabular-nums" }}>
                {expired ? "00:00" : timerDisplay}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. PASSO A PASSO */}
      <section style={{ background: "#F7F2EB", borderTop: "1px solid #EFEAE3", borderBottom: "1px solid #EFEAE3" }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "64px 24px" }}>
          <h2 style={{ fontSize: "clamp(24px,3vw,32px)", fontWeight: 800, letterSpacing: "-.02em", textAlign: "center", margin: "0 0 36px" }}>Como funciona, passo a passo</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: "flex", gap: 18, background: "#fff", border: "1px solid #EEE7DD", borderRadius: 16, padding: "22px 24px", alignItems: "flex-start" }}>
                <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, background: ACCENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 18 }}>{s.n}</div>
                <div>
                  <h3 style={{ fontSize: 17, fontWeight: 800, margin: "0 0 6px" }}>{s.title}</h3>
                  <p style={{ fontSize: 15, color: "#5A5B66", margin: 0, lineHeight: 1.5 }}>{s.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CTA FINAL */}
      <section style={{ background: "#17181C", color: "#fff" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, letterSpacing: "-.025em", lineHeight: 1.1, margin: 0 }}>
            Pronto para destravar seu inglês falado?
          </h2>
          <p style={{ marginTop: 18, fontSize: 17, color: "#C2BEB6", maxWidth: 480, marginInline: "auto" }}>
            Comece grátis agora. Sem cartão, sem compromisso — só você e um tutor nativo conversando por vídeo.
          </p>
          <button
            onClick={goToRegister}
            disabled={expired}
            style={{
              marginTop: 32, padding: "18px 40px", borderRadius: 999,
              background: expired ? "#555" : ACCENT, color: "#fff",
              fontWeight: 800, fontSize: 18, border: "none", cursor: expired ? "not-allowed" : "pointer",
              boxShadow: expired ? "none" : "0 14px 30px -10px rgba(242,106,27,.6)",
              fontFamily: "inherit", transition: "opacity .2s",
            }}
          >
            {expired ? "Oferta expirada" : "Quero começar agora"} →
          </button>
          <div style={{ marginTop: 16, fontSize: 13.5, color: "#8E8B84", fontWeight: 600 }}>
            15 minutos grátis · 30% off no primeiro mês · Sem fidelidade · Garantia de 7 dias
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#101115", color: "#8E8B84", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 16 }}>
          <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png" alt="One Talky" style={{ height: 28, width: "auto" }} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 18, fontSize: 13 }}>
            <a href="/privacidade" style={{ color: "#B7B3AB", textDecoration: "none" }}>Privacidade</a>
            <a href="/termos" style={{ color: "#B7B3AB", textDecoration: "none" }}>Termos</a>
            <a href="/faq" style={{ color: "#B7B3AB", textDecoration: "none" }}>FAQ</a>
            <a href="/reembolso" style={{ color: "#B7B3AB", textDecoration: "none" }}>Reembolso</a>
          </div>
        </div>
      </footer>
    </div>
  );
}