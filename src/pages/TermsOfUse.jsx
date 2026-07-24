import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Aceitação dos Termos",
    content: (
      <p>
        Ao criar uma conta na One Talky, o usuário declara ter lido, compreendido e concordado integralmente com estes Termos de Uso. O uso continuado da plataforma implica aceitação automática de qualquer atualização futura, que será comunicada por e-mail com antecedência mínima de 15 dias.
      </p>
    ),
  },
  {
    title: "2. Modelo de Créditos (Minutos)",
    content: (
      <>
        <p>
          As aulas na One Talky são contabilizadas em minutos em tempo real, medidos automaticamente pela infraestrutura de vídeo da <strong>Agora.io</strong>. O consumo começa no momento em que a conexão de vídeo é estabelecida entre aluno e tutor e encerra no momento do desligamento.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Os minutos incluídos em cada plano mensal têm <strong>validade de 60 dias</strong> a partir da data de ativação do plano.</li>
          <li>Minutos não utilizados dentro desse período <strong>expiram e não acumulam</strong> para o ciclo seguinte.</li>
          <li>O saldo de minutos disponível pode ser consultado a qualquer momento no painel do aluno.</li>
        </ul>
      </>
    ),
  },
  {
    title: "3. Pré-Pago / Minutos Avulsos",
    content: (
      <>
        <p>
          A One Talky oferece um modelo diferenciado de créditos avulsos pré-pagos para usuários com assinatura mensal ativa.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>O usuário com um plano mensal ativo <strong>ganha o direito de comprar pacotes de minutos avulsos adicionais</strong> a qualquer momento, sem necessidade de upgrade de plano.</li>
          <li>Os minutos pré-pagos avulsos <strong>não expiram</strong> enquanto a conta permanecer ativa.</li>
          <li>Não é possível adquirir créditos avulsos sem uma assinatura mensal vigente.</li>
          <li>Créditos pré-pagos avulsos são utilizados somente após o esgotamento dos minutos do plano mensal.</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Cancelamento e No-Show de Aulas Agendadas",
    content: (
      <>
        <p>
          Para garantir a remuneração justa dos tutores e a qualidade da plataforma, aplicam-se as seguintes regras de cancelamento:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>
            <strong>Agendamentos com mais de 24 horas de antecedência:</strong> O aluno deve cancelar com no mínimo <strong>24 horas de antecedência</strong> em relação ao horário da aula. Cancelamentos fora deste prazo serão considerados tardios.
          </li>
          <li>
            <strong>Agendamentos realizados com menos de 24 horas de antecedência:</strong> Quando o aluno agenda uma aula em cima da hora (menos de 24h antes do horário), ele terá até <strong>1 hora após o momento do agendamento</strong> para cancelar sem penalidade.
          </li>
          <li>
            Cancelamentos tardios e ausências sem aviso (no-show) resultarão no <strong>débito integral dos minutos</strong> correspondentes à duração da aula agendada.
          </li>
          <li>Os minutos debitados por cancelamento tardio ou no-show remuneram o tutor que reservou aquele horário em sua agenda.</li>
          <li>Tutores podem cancelar aulas com até 4 horas de antecedência sem penalidade. Cancelamentos recorrentes por parte de tutores podem resultar em suspensão da conta.</li>
        </ul>
      </>
    ),
  },
  {
    title: "5. Tolerância Zero — Conduta nas Salas de Vídeo",
    content: (
      <>
        <p>
          A One Talky é um ambiente de aprendizado seguro, respeitoso e inclusivo. Qualquer forma de conduta inadequada é terminantemente proibida.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>São consideradas condutas proibidas: assédio sexual ou moral, discriminação por raça, gênero, orientação sexual, religião ou nacionalidade, linguagem ofensiva, exibição de conteúdo impróprio e qualquer forma de preconceito.</li>
          <li>A violação desta cláusula resultará em <strong>banimento imediato e permanente da conta</strong>, sem direito a reembolso de planos ou créditos avulsos.</li>
          <li>A One Talky reserva-se o direito de reportar condutas ilegais às autoridades competentes.</li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Responsabilidades da Plataforma",
    content: (
      <p>
        A One Talky atua como intermediadora tecnológica entre alunos e tutores independentes. Não nos responsabilizamos por interrupções de serviço causadas por falhas de internet do usuário, indisponibilidade de provedores terceiros (Agora.io, Mercado Pago) ou eventos de força maior. Em caso de falha técnica comprovada da plataforma, os minutos consumidos indevidamente serão restituídos ao aluno.
      </p>
    ),
  },
  {
    title: "7. Disposições Gerais",
    content: (
      <p>
        Estes Termos são regidos pela legislação brasileira. Eventuais disputas serão dirimidas no foro da comarca de São Paulo — SP. Para dúvidas ou notificações formais, entre em contato pelo canal oficial de suporte disponível na plataforma.
      </p>
    ),
  },
];

export default function TermsOfUse() {
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
            Termos de Uso
          </h1>
          <p style={{ marginTop: 12, fontSize: 15.5, color: "#6b7280", lineHeight: 1.6 }}>
            Estes Termos de Uso regulam a relação entre a <strong>One Talky</strong> e seus usuários (alunos e tutores). Ao utilizar nossa plataforma, você concorda com todas as condições descritas abaixo.
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
          © {new Date().getFullYear()} One Talky · Estes Termos podem ser atualizados. Notificaremos por e-mail com antecedência mínima de 15 dias.
        </p>
      </main>
    </div>
  );
}