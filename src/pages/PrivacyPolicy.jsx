import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Adequação à LGPD — Dados Coletados",
    content: (
      <>
        <p>
          A One Talky adota o princípio da <strong>minimização de dados</strong> previsto na Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). Coletamos apenas os dados estritamente necessários para a prestação dos nossos serviços:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li><strong>Estudantes:</strong> Nome completo, endereço de e-mail e histórico de consumo de minutos de aula.</li>
          <li><strong>Tutores:</strong> Nome completo, e-mail, país/fuso horário, foto de perfil, vídeo de apresentação e biografia pública.</li>
        </ul>
        <p style={{ marginTop: 10 }}>
          Não coletamos dados sensíveis como documentos de identidade, dados biométricos ou informações de saúde.
        </p>
      </>
    ),
  },
  {
    title: "2. Gateway de Pagamento — Segurança Financeira",
    content: (
      <>
        <p>
          A One Talky <strong>não armazena, processa nem tem acesso a dados de cartão de crédito</strong> em seus servidores.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Todas as transações financeiras são processadas de forma <strong>100% criptografada e externa</strong> pelo parceiro de pagamentos <strong>Mercado Pago</strong>.</li>
          <li>Os dados de cartão do usuário são inseridos diretamente em um ambiente seguro do Mercado Pago (PCI DSS Compliant), nunca transitando pelos servidores da One Talky.</li>
          <li>A One Talky recebe apenas a confirmação do status do pagamento (aprovado/recusado) e o identificador da transação, sem qualquer dado financeiro sensível.</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. Logs e Vídeo — Infraestrutura Agora.io",
    content: (
      <>
        <p>
          As aulas em tempo real são viabilizadas pela infraestrutura de WebRTC da <strong>Agora.io</strong>, uma plataforma de comunicação em nuvem com padrões internacionais de segurança.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>A <strong>transmissão de áudio e vídeo é direta (ponta a ponta)</strong> entre aluno e tutor, sem armazenamento de gravações de vídeo pela One Talky para uso comercial ou divulgação.</li>
          <li>Os <strong>logs de duração das chamadas</strong> (horário de início, término e total de minutos) são mantidos nos servidores da One Talky <strong>estritamente para fins de auditoria interna</strong>, conciliação do consumo de minutos do aluno e cálculo dos pagamentos devidos aos tutores.</li>
          <li>Esses logs de duração são dados operacionais essenciais à prestação do serviço e não são compartilhados com terceiros além do próprio tutor participante da aula.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Cookies e Rastreamento",
    content: (
      <>
        <p>Utilizamos <strong>cookies essenciais</strong> para manter a sessão do usuário autenticada com segurança em seu painel.</p>
        <p style={{ marginTop: 8 }}>Também utilizamos ferramentas de análise de terceiros (como o Pixel do Meta e tags do Google) exclusivamente para monitorar o desempenho de campanhas de marketing e o comportamento de navegação na Landing Page pública, não no painel autenticado dos usuários.</p>
      </>
    ),
  },
  {
    title: "5. Compartilhamento de Dados",
    content: (
      <p>
        A One Talky não vende, aluga ou compartilha dados pessoais de usuários com terceiros para fins comerciais. O compartilhamento ocorre apenas com prestadores de serviço essenciais (Agora.io para vídeo, Mercado Pago para pagamentos) na exata medida necessária para o funcionamento da plataforma.
      </p>
    ),
  },
  {
    title: "6. Direitos do Usuário (LGPD)",
    content: (
      <>
        <p>Nos termos da LGPD, você tem direito a:</p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Confirmar a existência de tratamento de seus dados;</li>
          <li>Acessar seus dados pessoais armazenados;</li>
          <li>Corrigir dados incompletos ou desatualizados;</li>
          <li>Solicitar a anonimização ou exclusão de dados desnecessários;</li>
          <li>Solicitar a exclusão definitiva de sua conta e dados.</li>
        </ul>
        <p style={{ marginTop: 10 }}>Para exercer seus direitos, entre em contato pelo canal oficial de suporte disponível na plataforma.</p>
      </>
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