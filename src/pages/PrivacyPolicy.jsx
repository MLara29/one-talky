import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Dados Coletados",
    content: (
      <>
        <p>Coletamos os seguintes dados necessários para a prestação e melhoria dos nossos serviços:</p>
        <ul>
          <li><strong>Estudantes:</strong> Nome completo, endereço de e-mail e histórico de consumo de minutos.</li>
          <li><strong>Tutores:</strong> Nome completo, e-mail, fuso horário, foto de perfil, vídeo de apresentação e biografia pública.</li>
        </ul>
      </>
    ),
  },
  {
    title: "2. Processamento de Pagamentos e Segurança Financeira",
    content: (
      <p>
        A One Talky <strong>não armazena nem processa dados de cartão de crédito</strong> em seus servidores próprios.
        Todas as transações financeiras são realizadas de forma externa, criptografada e segura pela instituição parceira <strong>Mercado Pago</strong>.
        A One Talky tem acesso apenas à confirmação do status do pagamento.
      </p>
    ),
  },
  {
    title: "3. Transmissão de Vídeo, Imagem e Áudio",
    content: (
      <>
        <p>As aulas e chamadas de vídeo em tempo real são viabilizadas através da tecnologia de infraestrutura da <strong>Agora.io</strong>.</p>
        <p>As transmissões de áudio e vídeo ocorrem de forma privada entre o aluno e o tutor.</p>
        <p>A One Talky <strong>não realiza gravações rotineiras</strong> das aulas para uso comercial. Eventuais registros podem ser mantidos estritamente nos logs do servidor por curtos períodos apenas para auditoria de segurança interna e resolução de disputas técnicas ou de conduta.</p>
      </>
    ),
  },
  {
    title: "4. Cookies, Pixel e Rastreamento",
    content: (
      <>
        <p>Utilizamos <strong>cookies essenciais</strong> para manter o usuário conectado em seu Dashboard com segurança.</p>
        <p>Também utilizamos ferramentas de análise de terceiros (como o Pixel do Meta e tags do Google) para monitorar o desempenho de nossas campanhas de marketing e entender o comportamento de navegação em nossa Landing Page.</p>
      </>
    ),
  },
  {
    title: "5. Direitos do Usuário",
    content: (
      <p>
        Nos termos da LGPD, você poderá, a qualquer momento, solicitar a confirmação da existência de tratamento de seus dados, a correção de dados incompletos ou a exclusão definitiva de sua conta e dados de nossa base, enviando um e-mail para o nosso canal oficial de suporte.
      </p>
    ),
  },
];

export default function PrivacyPolicy() {
  return (
    <div style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "'Inter', sans-serif" }}>
      {/* Header */}
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

      {/* Content */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "48px 24px 80px" }}>
        {/* Title */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "inline-block", background: `${ACCENT}18`, color: ACCENT, fontWeight: 700, fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", borderRadius: 999, padding: "4px 14px", marginBottom: 16 }}>
            LGPD — Lei nº 13.709/2018
          </div>
          <h1 style={{ fontSize: "clamp(26px, 4vw, 38px)", fontWeight: 800, color: "#111827", lineHeight: 1.15, margin: 0 }}>
            Política de Privacidade
          </h1>
          <p style={{ marginTop: 12, fontSize: 15.5, color: "#6b7280", lineHeight: 1.6 }}>
            A One Talky está comprometida com a proteção de seus dados pessoais. Esta Política de Privacidade descreve como coletamos, usamos e protegemos suas informações, em total conformidade com a <strong>Lei Geral de Proteção de Dados (LGPD)</strong> no Brasil.
          </p>
        </div>

        {/* Sections */}
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

        {/* Footer note */}
        <p style={{ marginTop: 40, fontSize: 13, color: "#9ca3af", textAlign: "center" }}>
          © {new Date().getFullYear()} One Talky · Esta política pode ser atualizada a qualquer momento. Recomendamos consulta periódica.
        </p>
      </main>
    </div>
  );
}