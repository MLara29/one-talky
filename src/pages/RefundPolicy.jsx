import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Garantia de 7 dias",
    content: (
      <p>
        Todo novo assinante tem direito a solicitar o <strong>reembolso integral (100%)</strong> do valor pago na primeira assinatura, dentro de <strong>7 dias corridos</strong> a partir da data de contratação, sem necessidade de justificativa. Basta entrar em contato pelo Suporte dentro desse prazo.
      </p>
    ),
  },
  {
    title: "2. Falha técnica comprovada da plataforma",
    content: (
      <p>
        Caso o aluno tenha minutos debitados indevidamente por uma falha técnica comprovada da plataforma (ex: instabilidade da infraestrutura de vídeo que impediu a realização da aula), a One Talky restitui os minutos consumidos indevidamente ao saldo do aluno, mediante análise do caso pelo Suporte.
      </p>
    ),
  },
  {
    title: "3. Casos em que NÃO há reembolso",
    content: (
      <ul style={{ marginTop: 0, paddingLeft: 20 }}>
        <li>Cancelamento de assinatura após o período de 7 dias da garantia — os minutos do ciclo em curso são zerados, sem reembolso em dinheiro (veja a Política de Cancelamento nos Termos de Uso).</li>
        <li>No-show do aluno (falta sem cancelamento dentro do prazo) ou cancelamento tardio — os minutos debitados remuneram o tutor que reservou o horário.</li>
        <li>Problemas de conexão de internet ou equipamento do próprio aluno.</li>
        <li>Insatisfação com um tutor específico — nesse caso, oriente-se a agendar com outro tutor; entre em contato com o Suporte se o problema persistir.</li>
        <li>Compras de pacotes pré-pagos de minutos avulsos já utilizados.</li>
      </ul>
    ),
  },
  {
    title: "4. Como solicitar",
    content: (
      <p>
        Solicitações de reembolso devem ser feitas pelo canal de Suporte dentro da plataforma, informando a data da assinatura ou compra e o motivo. Pedidos dentro da garantia de 7 dias são processados automaticamente; casos de falha técnica são analisados individualmente pela equipe.
      </p>
    ),
  },
];

export default function RefundPolicy() {
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

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-block", background: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
            Última atualização: julho de 2025
          </div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#111827", lineHeight: 1.15, margin: 0 }}>
            Política de Reembolso
          </h1>
          <p style={{ marginTop: 12, fontSize: 15.5, color: "#6b7280", lineHeight: 1.6 }}>
            Esta página detalha em quais situações a One Talky reembolsa valores pagos, e em quais não há reembolso. Complementa os <Link to="/termos" style={{ color: ACCENT, fontWeight: 700 }}>Termos de Uso</Link>.
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {sections.map((s, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, padding: "28px 32px" }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#111827", margin: "0 0 14px", borderLeft: `4px solid ${ACCENT}`, paddingLeft: 12 }}>
                {s.title}
              </h2>
              <div style={{ fontSize: 15.5, color: "#374151", lineHeight: 1.75 }}>
                {s.content}
              </div>
            </div>
          ))}
        </div>

        <p style={{ marginTop: 40, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
          © {new Date().getFullYear()} One Talky · Dúvidas? Fale com o Suporte.
        </p>
      </main>
    </div>
  );
}