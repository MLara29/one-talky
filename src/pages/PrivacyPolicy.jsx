import React from "react";
import { Link } from "react-router-dom";
import { MessageCircle, ArrowLeft } from "lucide-react";

const ACCENT = "#F26A1B";

const sections = [
  {
    title: "1. Quem Somos e Nosso Compromisso com a LGPD",
    content: (
      <p>
        A One Talky adota o princípio da <strong>minimização de dados</strong> previsto
        na Lei Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD).
        Coletamos apenas os dados estritamente necessários para operar a
        plataforma de forma segura, e tratamos seus dados com base em
        fundamentos legais claros: execução de contrato (para prestar o
        serviço que você contratou), cumprimento de obrigação legal
        (ex: emissão de nota fiscal), e consentimento (ex: cookies de
        marketing, que você pode recusar a qualquer momento).
      </p>
    ),
  },
  {
    title: "2. Encarregado de Dados (DPO)",
    content: (
      <p>
        Nos termos do Art. 41 da LGPD, a One Talky designa um Encarregado
        de Proteção de Dados responsável por atender solicitações de
        titulares e se comunicar com a Autoridade Nacional de Proteção de
        Dados (ANPD). Para exercer seus direitos ou tirar dúvidas sobre o
        tratamento de seus dados, entre em contato pelo e-mail
        [inserir e-mail do encarregado, ex: privacidade@onetalky.com] ou
        pelo canal de suporte disponível na plataforma.
      </p>
    ),
  },
  {
    title: "3. Dados Coletados por Perfil de Usuário",
    content: (
      <ul style={{ marginTop: 0, paddingLeft: 20 }}>
        <li><strong>Estudantes:</strong> Nome completo, e-mail, país, idioma de
          interesse, nível declarado, e histórico de consumo de minutos de aula.</li>
        <li><strong>Tutores:</strong> Nome completo, e-mail, país/fuso horário, foto
          de perfil, vídeo de apresentação, biografia pública, e dados de
          pagamento (chave PIX ou dados bancários) necessários para o
          repasse de ganhos.</li>
        <li><strong>Afiliados:</strong> Nome completo, e-mail, e dados de pagamento
          (chave PIX ou dados bancários) necessários para o repasse de
          comissões.</li>
      </ul>
    ),
  },
  {
    title: "4. Gateway de Pagamento — Segurança Financeira",
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
    title: "5. Logs e Vídeo — Infraestrutura Agora.io",
    content: (
      <>
        <p>
          As aulas em tempo real são viabilizadas pela infraestrutura de WebRTC da <strong>Agora.io</strong>, uma plataforma de comunicação em nuvem com padrões internacionais de segurança.
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>A <strong>transmissão de áudio e vídeo é direta (ponta a ponta)</strong> entre aluno e tutor, sem armazenamento de gravações de vídeo pela One Talky.</li>
          <li>Os <strong>logs de duração das chamadas</strong> (horário de início, término e total de minutos) são mantidos nos servidores da One Talky <strong>estritamente para fins de auditoria interna</strong>, conciliação do consumo de minutos do aluno e cálculo dos pagamentos devidos aos tutores.</li>
          <li>Esses logs de duração são dados operacionais essenciais à prestação do serviço e não são compartilhados com terceiros além do próprio tutor participante da aula.</li>
        </ul>
      </>
    ),
  },
  {
    title: "6. Cookies e Rastreamento",
    content: (
      <>
        <p>Utilizamos <strong>cookies essenciais</strong> para manter a sessão do usuário autenticada com segurança em seu painel.</p>
        <p style={{ marginTop: 8 }}>Também utilizamos ferramentas de análise de terceiros (como o Pixel do Meta e tags do Google) exclusivamente para monitorar o desempenho de campanhas de marketing e o comportamento de navegação na Landing Page pública, não no painel autenticado dos usuários. Você pode gerenciar suas preferências de cookies através do banner de consentimento exibido em sua primeira visita à plataforma.</p>
      </>
    ),
  },
  {
    title: "7. Provedores de Serviço e Compartilhamento de Dados",
    content: (
      <>
        <p>
          A One Talky não vende, aluga ou compartilha dados pessoais com
          terceiros para fins comerciais. Compartilhamos dados apenas com
          prestadores de serviço essenciais ao funcionamento da
          plataforma, na medida estritamente necessária:
        </p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li><strong>Agora.io</strong> — infraestrutura de videochamada;</li>
          <li><strong>Mercado Pago</strong> — processamento de pagamentos de alunos;</li>
          <li><strong>Hostinger</strong> — envio de e-mails transacionais (verificação,
            notificações);</li>
          <li><strong>Brevo</strong> — envio de e-mails do sistema;</li>
          <li><strong>Cloudflare</strong> — proteção e desempenho da infraestrutura web.</li>
        </ul>
        <p style={{ marginTop: 10 }}>
          Todos esses prestadores estão contratualmente obrigados a tratar
          seus dados apenas para as finalidades aqui descritas.
        </p>
      </>
    ),
  },
  {
    title: "8. Transferência Internacional de Dados",
    content: (
      <p>
        Como a One Talky conecta alunos e tutores de diferentes países, e
        alguns de nossos prestadores de serviço (como a Agora.io) operam
        infraestrutura internacional, seus dados podem ser processados fora
        do Brasil. Nesses casos, exigimos que os prestadores adotem
        padrões de proteção de dados compatíveis com a LGPD.
      </p>
    ),
  },
  {
    title: "9. Retenção e Exclusão de Dados",
    content: (
      <p>
        Mantemos seus dados pelo tempo necessário para a prestação do
        serviço e cumprimento de obrigações legais (ex: fiscais). Ao
        solicitar a exclusão de sua conta, seus dados pessoais são
        removidos ou anonimizados dentro de um prazo razoável, exceto
        quando a manutenção for exigida por lei (ex: registros financeiros).
      </p>
    ),
  },
  {
    title: "10. Privacidade de Menores",
    content: (
      <p>
        A One Talky é destinada a maiores de 18 anos. Não coletamos
        intencionalmente dados de menores de idade. Caso identifiquemos
        que dados de um menor foram coletados sem o consentimento adequado
        de um responsável legal, tomaremos medidas para excluí-los.
      </p>
    ),
  },
  {
    title: "11. Comunicações de Marketing",
    content: (
      <p>
        Você pode optar por não receber comunicações promocionais por
        e-mail a qualquer momento, através do link de descadastro presente
        em cada mensagem, sem afetar o recebimento de comunicações
        essenciais sobre sua conta e suas aulas.
      </p>
    ),
  },
  {
    title: "12. Notificação de Incidentes de Segurança",
    content: (
      <p>
        Em caso de incidente de segurança que possa acarretar risco
        relevante aos titulares de dados, a One Talky notificará a ANPD e
        os titulares afetados, conforme exigido pelo Art. 48 da LGPD,
        informando a natureza dos dados afetados e as medidas tomadas.
      </p>
    ),
  },
  {
    title: "13. Seus Direitos como Titular de Dados",
    content: (
      <>
        <p>Nos termos da LGPD, você tem direito a:</p>
        <ul style={{ marginTop: 10, paddingLeft: 20 }}>
          <li>Confirmar a existência de tratamento de seus dados;</li>
          <li>Acessar seus dados pessoais armazenados;</li>
          <li>Corrigir dados incompletos ou desatualizados;</li>
          <li>Solicitar a anonimização, bloqueio ou exclusão de dados
            desnecessários ou tratados em desconformidade com a lei;</li>
          <li>Solicitar a portabilidade de seus dados a outro fornecedor;</li>
          <li>Revogar o consentimento dado, quando aplicável;</li>
          <li>Apresentar reclamação à Autoridade Nacional de Proteção de
            Dados (ANPD).</li>
        </ul>
        <p style={{ marginTop: 10 }}>
          Para exercer seus direitos, entre em contato pelo canal oficial
          de suporte disponível na plataforma ou pelo e-mail do
          Encarregado de Dados indicado na Seção 2.
        </p>
      </>
    ),
  },
  {
    title: "14. Alterações a Esta Política",
    content: (
      <p>
        Podemos atualizar esta Política periodicamente. Mudanças materiais
        serão comunicadas por e-mail ou aviso na plataforma antes de
        entrarem em vigor. O uso continuado da plataforma após a data de
        vigência constitui aceite das alterações.
      </p>
    ),
  },
  {
    title: "15. Transferência em Caso de Transação Empresarial",
    content: (
      <p>
        Caso a One Talky passe por uma fusão, aquisição, venda de ativos ou
        outra reorganização societária, seus dados pessoais poderão ser
        transferidos como parte dessa transação, sempre respeitando as
        proteções previstas nesta Política e na LGPD.
      </p>
    ),
  },
  {
    title: "16. Segurança da Informação",
    content: (
      <p>
        Adotamos medidas técnicas e organizacionais para proteger seus
        dados contra acesso não autorizado, perda ou alteração indevida.
        Nenhuma transmissão de dados pela internet, no entanto, pode ser
        garantida como 100% segura — recomendamos que você proteja suas
        credenciais de acesso e nos avise imediatamente em caso de suspeita
        de uso não autorizado de sua conta.
      </p>
    ),
  },
  {
    title: "17. Sites e Serviços de Terceiros",
    content: (
      <p>
        Nossa plataforma pode conter links para sites ou serviços de
        terceiros. Não somos responsáveis pelas práticas de privacidade
        desses sites — recomendamos a leitura das políticas próprias de
        cada um antes de fornecer qualquer informação a eles.
      </p>
    ),
  },
  {
    title: "18. Verificação de Identidade para Solicitações",
    content: (
      <p>
        Para proteger sua conta contra solicitações fraudulentas, podemos
        pedir informações adicionais para confirmar sua identidade antes
        de atender a pedidos de acesso, correção ou exclusão de dados.
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