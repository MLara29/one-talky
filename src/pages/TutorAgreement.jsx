import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Natureza da Relação — Prestador de Serviço Independente",
    content: (
      <p>
        O tutor que atua na One Talky faz isso como <strong>prestador de serviço autônomo e independente</strong>, e não como empregado, sócio ou representante da One Talky. Este Contrato aplica-se a tutores de qualquer país e não cria vínculo empregatício, previdenciário ou societário de nenhuma espécie entre o tutor e a One Talky, independentemente da legislação local do país de residência do tutor.
      </p>
    ),
  },
  {
    title: "2. Impostos e Obrigações Fiscais",
    content: (
      <p>
        O tutor é <strong>o único responsável</strong> por declarar e recolher quaisquer impostos, contribuições previdenciárias ou obrigações fiscais aplicáveis aos valores recebidos através da plataforma, de acordo com a legislação do seu país de residência. A One Talky <strong>não retém, não recolhe e não declara impostos em nome do tutor</strong> em nenhuma jurisdição.
      </p>
    ),
  },
  {
    title: "3. Estrutura de Pagamento",
    content: (
      <>
        <p>Os pagamentos aos tutores seguem a estrutura abaixo, de acordo com o tipo de contrato vinculado ao perfil do tutor:</p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li><strong>Contrato direto:</strong> pagamentos realizados via <strong>Payoneer</strong>.</li>
          <li><strong>Contrato via Upwork:</strong> pagamentos processados através da própria plataforma <strong>Upwork</strong>, conforme os termos daquela plataforma.</li>
          <li>Os saques são processados em duas janelas mensais, nos dias <strong>15 e 30</strong> de cada mês, referentes aos minutos de aula já concluídos e confirmados no período.</li>
          <li>Um saque só pode ser solicitado quando não houver outro saque pendente ou em processamento na conta do tutor.</li>
          <li>O valor devido ao tutor é calculado com base na taxa por minuto (price_per_minute) vigente no momento em que cada aula foi concluída — nunca recalculado retroativamente.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Cancelamento e No-Show — Lado do Tutor",
    content: (
      <>
        <ul style={{ marginTop: 0, paddingLeft: 20 }}>
          <li>O tutor pode cancelar uma aula agendada com até <strong>4 horas de antecedência</strong> em relação ao horário marcado, sem penalidade.</li>
          <li>Cancelamentos recorrentes ou de última hora por parte do tutor podem resultar em advertência ou <strong>suspensão da conta</strong>, a critério da One Talky.</li>
          <li>Se o tutor não comparecer a uma aula agendada (no-show do tutor) e o aluno estiver presente na sala, o aluno não é penalizado e a aula não gera pagamento ao tutor.</li>
          <li>Cancelamentos tardios ou ausências recorrentes são monitorados pela equipe de qualidade da One Talky.</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Propriedade Intelectual de Materiais Didáticos",
    content: (
      <p>
        Materiais didáticos, roteiros de aula, exercícios ou qualquer conteúdo produzido pelo tutor especificamente para uso nas aulas da One Talky podem ser utilizados livremente pelo próprio tutor. A One Talky não reivindica propriedade sobre o conteúdo pedagógico autoral do tutor, mas reserva-se o direito de remover materiais que violem direitos autorais de terceiros ou as diretrizes de conduta da plataforma.
      </p>
    ),
  },
  {
    title: "6. Código de Conduta do Tutor",
    content: (
      <>
        <p>Como prestador de serviço em contato direto com alunos, o tutor se compromete a:</p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Manter conduta profissional, respeitosa e livre de qualquer forma de assédio, discriminação ou linguagem ofensiva durante as aulas;</li>
          <li>Comparecer pontualmente aos horários agendados em sua disponibilidade;</li>
          <li>Não solicitar pagamentos, dados de contato pessoal ou qualquer forma de negociação fora da plataforma para contornar a estrutura de pagamento da One Talky;</li>
          <li>Manter a qualidade pedagógica esperada pela plataforma.</li>
        </ul>
      </>
    ),
  },
  {
    title: "7. Suspensão e Desligamento",
    content: (
      <p>
        A One Talky pode suspender ou encerrar o acesso do tutor à plataforma em caso de violação deste Contrato, das políticas de conduta gerais, fraude, ausências recorrentes não justificadas, ou avaliações consistentemente negativas dos alunos. Em caso de banimento por violação grave (assédio, discriminação, conduta imprópria), o tutor perde o direito a qualquer saque pendente relacionado ao período da violação, sem prejuízo de valores já confirmados e pagos anteriormente.
      </p>
    ),
  },
  {
    title: "8. Disposições Gerais",
    content: (
      <p>
        Este Contrato complementa os <Link to="/termos" style={{ color: ACCENT, fontWeight: 700 }}>Termos de Uso gerais</Link> da One Talky, aplicáveis a todos os usuários. Em caso de conflito entre este Contrato e os Termos gerais, prevalece este Contrato para as matérias específicas da relação entre a One Talky e o tutor como prestador de serviço.
      </p>
    ),
  },
];

export default function TutorAgreement() {
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
            Contrato de Prestação de Serviço para Tutores
          </h1>
          <p style={{ marginTop: 12, fontSize: 15.5, color: "#6b7280", lineHeight: 1.6 }}>
            Este Contrato regula especificamente a relação entre a <strong>One Talky</strong> e os <strong>tutores</strong> que prestam aulas na plataforma, como prestadores de serviço independentes. Ele complementa — e não substitui — os Termos de Uso gerais aplicáveis a todos os usuários.
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
          © {new Date().getFullYear()} One Talky · Este Contrato pode ser atualizado. Notificaremos por e-mail com antecedência mínima de 15 dias.
        </p>
      </main>
    </div>
  );
}