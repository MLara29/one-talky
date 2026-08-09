import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

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
    title: "4. Cancelamento, No-Show e Atraso na Entrada",
    content: (
      <>
        <p>
          Para garantir a remuneração justa dos tutores e a qualidade da plataforma, aplicam-se as seguintes regras:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>
            <strong>Agendamentos com mais de 24 horas de antecedência:</strong> O aluno deve cancelar com no mínimo <strong>24 horas de antecedência</strong> em relação ao horário da aula. Cancelamentos fora deste prazo serão considerados tardios.
          </li>
          <li>
            <strong>Agendamentos realizados com menos de 24 horas de antecedência:</strong> Quando o aluno agenda uma aula em cima da hora (menos de 24h antes do horário), ele terá até <strong>1 hora após o momento do agendamento</strong> para cancelar sem penalidade.
          </li>
          <li>
            <strong>Limite de tolerância para entrada (no-show):</strong> O aluno tem até <strong>10 minutos</strong> após o horário de início da aula agendada para entrar na sala de vídeo. Caso o tutor esteja online e pronto para a aula e o aluno não compareça dentro desse prazo, os minutos correspondentes à duração da aula serão <strong>debitados automaticamente</strong>. Se o tutor não estiver na plataforma no momento agendado, o aluno <strong>não será penalizado</strong>.
          </li>
          <li>
            Cancelamentos tardios e ausências sem aviso (no-show) resultarão no <strong>débito integral dos minutos</strong> correspondentes à duração da aula agendada.
          </li>
          <li>Os minutos debitados por cancelamento tardio ou no-show remuneram o tutor que reservou aquele horário em sua agenda.</li>
        </ul>
        <p style={{ marginTop: 10 }}>
          Regras específicas de cancelamento e no-show do lado do tutor, bem como pagamento e demais condições da prestação de serviço, estão descritas no{" "}
          <Link to="/tutor-agreement" style={{ color: ACCENT, fontWeight: 700 }}>Contrato de Prestação de Serviço para Tutores</Link>.
        </p>
      </>
    ),
  },
  {
    title: "4.1 Período de Garantia (Primeiros 7 Dias)",
    content: (
      <>
        <p>
          Nos termos do Art. 49 do Código de Defesa do Consumidor, você tem direito de desistir da assinatura em até <strong>7 dias corridos</strong> a partir da contratação, sem necessidade de justificativa, com direito ao reembolso integral do valor pago.
        </p>
        <p style={{ marginTop: 10 }}>
          Para viabilizar esse direito de forma equilibrada, durante os primeiros 7 dias da assinatura:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Você pode agendar <strong>apenas 1 aula, de 30 minutos</strong>, independentemente do plano contratado. Aulas adicionais só ficam disponíveis a partir do <strong>8º dia</strong> da assinatura.</li>
          <li>Caso você cancele a assinatura dentro desse período de 7 dias, o valor pago será integralmente reembolsado, e os minutos de crédito do plano (usados ou não) serão <strong>extintos imediatamente</strong> no momento do cancelamento — diferente do cancelamento após esse período, que mantém os minutos restantes disponíveis por até 60 dias adicionais (ver Seção 4 acima).</li>
          <li>Créditos comprados avulsamente (pacotes de minutos pré-pagos) não são afetados por essa regra, seguindo sua própria validade de 60 dias a partir da compra.</li>
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
  {
    title: "8. Elegibilidade e Idade Mínima",
    content: (
      <p>
        A One Talky é destinada exclusivamente a maiores de 18 anos. Ao criar uma conta, você declara e garante ter 18 anos ou mais. A One Talky reserva-se o direito de suspender ou encerrar contas que violem esta condição, a qualquer momento, sem aviso prévio.
      </p>
    ),
  },
  {
    title: "9. Sua Conta e Responsabilidade",
    content: (
      <>
        <p>
          Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta. Notifique imediatamente o Suporte caso suspeite de uso não autorizado.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Cada conta é de uso pessoal e intransferível — não é permitido compartilhar credenciais de acesso com terceiros.</li>
          <li>Não é permitido criar mais de uma conta por pessoa, nem se passar por outra pessoa ou entidade.</li>
        </ul>
      </>
    ),
  },
  {
    title: "10. Licença de Uso e Restrições",
    content: (
      <>
        <p>
          A One Talky concede a você uma licença limitada, não exclusiva e revogável para acessar e usar a plataforma conforme sua finalidade pretendida. Você concorda em não:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Copiar, modificar ou criar obras derivadas da plataforma;</li>
          <li>Utilizar robôs, scrapers ou outros meios automatizados para acessar a plataforma sem autorização expressa;</li>
          <li>Tentar obter acesso não autorizado a contas, sistemas ou redes conectadas à plataforma;</li>
          <li>Interferir no funcionamento normal da plataforma ou no uso por outros usuários, incluindo por meio de vírus ou código malicioso;</li>
          <li>Utilizar marcas, logotipos ou materiais da One Talky sem autorização prévia por escrito.</li>
        </ul>
      </>
    ),
  },
  {
    title: "11. Registros de Sessão e Confiança e Segurança",
    content: (
      <p>
        Conforme detalhado em nossa <Link to="/privacidade" style={{ color: ACCENT, fontWeight: 700 }}>Política de Privacidade</Link>, não gravamos vídeo ou áudio das aulas. Mensagens de texto trocadas durante as aulas e registros de duração são mantidos para fins de auditoria, resolução de disputas e conformidade com estas regras. A One Talky busca promover um ambiente de aprendizado seguro, mas não garante nem se responsabiliza integralmente pelo comportamento de alunos ou tutores fora do que está descrito nestes Termos — utilize o canal de Suporte para relatar qualquer preocupação sobre outro usuário.
      </p>
    ),
  },
  {
    title: "12. Propriedade Intelectual",
    content: (
      <p>
        Todo o conteúdo, design, código, marca e demais materiais da plataforma são de propriedade da One Talky ou de seus licenciadores, protegidos por leis de propriedade intelectual aplicáveis. Nenhuma licença ou direito é concedido a você além do uso pessoal previsto nestes Termos.
      </p>
    ),
  },
  {
    title: "13. Conteúdo Enviado pelo Usuário",
    content: (
      <p>
        Ao enviar fotos, vídeos de apresentação, biografia ou outro conteúdo à plataforma (ex: perfil de tutor), você garante possuir os direitos necessários sobre esse conteúdo e concede à One Talky uma licença para exibi-lo dentro da plataforma, na medida necessária para o funcionamento do serviço (ex: exibir seu perfil a alunos interessados).
      </p>
    ),
  },
  {
    title: "14. Rescisão de Conta",
    content: (
      <p>
        Você pode encerrar sua conta a qualquer momento pelo canal de Suporte. A One Talky também pode suspender ou encerrar contas que violem estes Termos, a seu critério, especialmente em casos de violação da Seção 5 (Tolerância Zero). Tutores com contrato encerrado têm direito ao pagamento de aulas já realizadas antes da data efetiva de encerramento, conforme o ciclo de pagamento vigente.
      </p>
    ),
  },
  {
    title: "15. Isenções e Limitação de Responsabilidade",
    content: (
      <p>
        A plataforma é fornecida "como está", sem garantia de operação ininterrupta ou livre de erros. Na máxima medida permitida pela legislação brasileira aplicável — incluindo o Código de Defesa do Consumidor, cujos direitos não podem ser afastados por este instrumento — a responsabilidade da One Talky por danos indiretos ou consequenciais é limitada ao valor efetivamente pago pelo usuário nos últimos seis meses anteriores ao evento gerador da reclamação.
      </p>
    ),
  },
  {
    title: "16. Cessão e Acordo Integral",
    content: (
      <p>
        Estes Termos, em conjunto com a Política de Privacidade, a Política de Reembolso e (quando aplicável) o Contrato de Prestação de Serviço para Tutores, constituem o acordo integral entre você e a One Talky. Você não pode ceder ou transferir seus direitos sob estes Termos a terceiros; a One Talky pode fazê-lo livremente, por exemplo em caso de reorganização societária.
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
          <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png" alt="One Talky" style={{ height: 40, width: "auto" }} />
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