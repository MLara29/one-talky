// Constrói o e-mail de LEMBRETE semanal de "minutos grátis" enviado ao aluno
// que recebeu minutos de presente do admin (admin_gift_minutes) e ainda não
// usou (não completou nenhuma aula desde a concessão). Traduzido nos 9 idiomas
// do sistema — o idioma é escolhido a partir da nacionalidade cadastrada do
// aluno (campo nationality do StudentProfile), usando o mesmo langForCountry
// já exportado por freeMinutesEmail.js.
//
// Espelha exatamente o padrão visual do freeMinutesEmail.js (mesmo template
// HTML, logo, cores, CTA), mudando apenas o copy para tom de lembrete/urgência
// e adicionando os dias restantes até a expiração.

// Reutiliza o mesmo mapeamento país → idioma do freeMinutesEmail.js.
export { langForCountry } from './freeMinutesEmail.js';

const LOGO_URL = 'https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png';

const TEXTS = {
  en: {
    subject: `⏰ Your free minutes expire in {days} days!`,
    preheader: `Don't let your free conversation minutes go to waste.`,
    headline: `Your free minutes are expiring soon!`,
    body: `You still have <strong>{minutes} free minutes</strong> waiting in your One Talky account. They expire in <strong>{days} days</strong> — book a lesson now and make the most of them before they're gone!`,
    minutesLabel: `free minutes remaining`,
    daysLabel: `days until expiry`,
    cta: `Book my lesson now`,
    footer: `This is an automatic reminder from One Talky.`
  },
  pt_br: {
    subject: `⏰ Seus minutos grátis expiram em {days} dias!`,
    preheader: `Não deixe seus minutos grátis de conversação expirarem.`,
    headline: `Seus minutos grátis estão acabando!`,
    body: `Você ainda tem <strong>{minutes} minutos grátis</strong> esperando na sua conta One Talky. Eles expiram em <strong>{days} dias</strong> — agende uma aula agora e aproveite antes que seja tarde!`,
    minutesLabel: `minutos grátis restantes`,
    daysLabel: `dias até expirar`,
    cta: `Agendar minha aula agora`,
    footer: `Este é um lembrete automático da One Talky.`
  },
  pt_pt: {
    subject: `⏰ Os seus minutos grátis expiram em {days} dias!`,
    preheader: `Não deixe os seus minutos grátis de conversação expirar.`,
    headline: `Os seus minutos grátis estão a acabar!`,
    body: `Ainda tem <strong>{minutes} minutos grátis</strong> à espera na sua conta One Talky. Expiram em <strong>{days} dias</strong> — marque uma aula agora e aproveite antes que seja tarde!`,
    minutesLabel: `minutos grátis restantes`,
    daysLabel: `dias até expirar`,
    cta: `Marcar a minha aula agora`,
    footer: `Este é um lembrete automático da One Talky.`
  },
  es: {
    subject: `⏰ ¡Tus minutos gratis expiran en {days} días!`,
    preheader: `No dejes que tus minutos gratis de conversación se desperdicien.`,
    headline: `¡Tus minutos gratis están por expirar!`,
    body: `Aún tienes <strong>{minutes} minutos gratis</strong> esperando en tu cuenta de One Talky. Expiran en <strong>{days} días</strong> — ¡reserva una clase ahora y aprovéchalos antes de que se acaben!`,
    minutesLabel: `minutos gratis restantes`,
    daysLabel: `días hasta expirar`,
    cta: `Reservar mi clase ahora`,
    footer: `Este es un recordatorio automático de One Talky.`
  },
  fr: {
    subject: `⏰ Vos minutes gratuites expirent dans {days} jours !`,
    preheader: `Ne laissez pas vos minutes gratuites de conversation expirer.`,
    headline: `Vos minutes gratuites expirent bientôt !`,
    body: `Il vous reste encore <strong>{minutes} minutes gratuites</strong> dans votre compte One Talky. Elles expirent dans <strong>{days} jours</strong> — réservez un cours maintenant et profitez-en avant qu'il ne soit trop tard !`,
    minutesLabel: `minutes gratuites restantes`,
    daysLabel: `jours avant expiration`,
    cta: `Réserver mon cours maintenant`,
    footer: `Ceci est un rappel automatique de One Talky.`
  },
  de: {
    subject: `⏰ Ihre Gratis-Minuten laufen in {days} Tagen ab!`,
    preheader: `Lassen Sie Ihre Gratis-Minuten nicht verfallen.`,
    headline: `Ihre Gratis-Minuten laufen bald ab!`,
    body: `Sie haben noch <strong>{minutes} Gratis-Minuten</strong> in Ihrem One Talky-Konto. Sie laufen in <strong>{days} Tagen</strong> ab — buchen Sie jetzt eine Lektion und nutzen Sie sie, bevor es zu spät ist!`,
    minutesLabel: `verbleibende Gratis-Minuten`,
    daysLabel: `Tage bis zum Ablauf`,
    cta: `Meine Lektion jetzt buchen`,
    footer: `Dies ist eine automatische Erinnerung von One Talky.`
  },
  it: {
    subject: `⏰ I tuoi minuti gratuiti scadono tra {days} giorni!`,
    preheader: `Non lasciare scadere i tuoi minuti gratuiti di conversazione.`,
    headline: `I tuoi minuti gratuiti stanno per scadere!`,
    body: `Hai ancora <strong>{minutes} minuti gratuiti</strong> nel tuo account One Talky. Scadono tra <strong>{days} giorni</strong> — prenota una lezione ora e approfittane prima che scadano!`,
    minutesLabel: `minuti gratuiti rimanenti`,
    daysLabel: `giorni alla scadenza`,
    cta: `Prenota la mia lezione ora`,
    footer: `Questo è un promemoria automatico di One Talky.`
  },
  ja: {
    subject: `⏰ 無料分数はあと{days}日で期限切れになります！`,
    preheader: `無料の会話分数を無駄にしないでください。`,
    headline: `無料分数の期限が迫っています！`,
    body: `One Talkyアカウントにまだ<strong>{minutes}分の無料分数</strong>が残っています。あと<strong>{days}日</strong>で期限切れになります — 今すぐレッスンを予約して、期限切れ前に使い切りましょう！`,
    minutesLabel: `残り無料分数`,
    daysLabel: `期限切れまでの日数`,
    cta: `今すぐレッスンを予約する`,
    footer: `これはOne Talkyからの自動リマインダーです。`
  },
  ko: {
    subject: `⏰ 무료 분이 {days}일 후에 만료됩니다!`,
    preheader: `무료 대화 분을 낭비하지 마세요.`,
    headline: `무료 분이 곧 만료됩니다!`,
    body: `One Talky 계정에 아직 <strong>{minutes}분의 무료 분</strong>이 남아 있습니다. <strong>{days}일 후</strong>에 만료됩니다 — 지금 수업을 예약하고 만료되기 전에 활용하세요!`,
    minutesLabel: `남은 무료 분`,
    daysLabel: `만료까지 남은 일수`,
    cta: `지금 수업 예약하기`,
    footer: `이것은 One Talky에서 보낸 자동 알림입니다.`
  }
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function buildFreeMinutesReminderEmail({ studentName, minutes, daysRemaining, lang }) {
  const tx = TEXTS[lang] || TEXTS.en;
  const safeName = escapeHtml(studentName || '');
  const body = tx.body.replace('{minutes}', minutes).replace('{days}', daysRemaining);
  const subject = tx.subject.replace('{days}', daysRemaining);

  const html = `<!DOCTYPE html>
<html lang="${lang.replace('_', '-')}">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F5F1;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="display:none;max-height:0;overflow:hidden;font-size:1px;color:#F7F5F1;">${escapeHtml(tx.preheader)}</div>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F1;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #EFECE6;">
        <tr>
          <td style="padding:32px 36px 20px;text-align:center;border-bottom:1px solid #F3F1EC;">
            <img src="${LOGO_URL}" alt="One Talky" height="36" style="width:auto;max-width:200px;display:block;margin:0 auto;object-fit:contain;" />
          </td>
        </tr>
        <tr>
          <td style="padding:36px 40px 8px;text-align:center;">
            <div style="font-size:40px;margin-bottom:8px;">⏰</div>
            <h1 style="margin:0;font-size:22px;line-height:1.3;color:#17181C;">${escapeHtml(tx.headline)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 40px 0;">
            <p style="margin:0;font-size:15px;line-height:1.6;color:#4B4C57;text-align:center;">${safeName ? escapeHtml(safeName) + ',<br/>' : ''}${body}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px 0;" align="center">
            <table cellpadding="0" cellspacing="0" style="background:#FFF7F1;border:1.5px dashed #F26A1B;border-radius:14px;">
              <tr><td align="center" style="padding:20px 32px;">
                <p style="margin:0;font-size:34px;font-weight:800;color:#F26A1B;">${minutes}</p>
                <p style="margin:4px 0 0;font-size:13px;color:#5A5B66;">${escapeHtml(tx.minutesLabel)}</p>
                <p style="margin:12px 0 0;font-size:18px;font-weight:700;color:#E5484D;">${daysRemaining} ${escapeHtml(tx.daysLabel)}</p>
              </td></tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:32px 40px 36px;" align="center">
            <a href="https://onetalky.com/dashboard" target="_blank" style="display:inline-block;background:#F26A1B;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:14px 32px;border-radius:999px;">${escapeHtml(tx.cta)} →</a>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #F3F1EC;" align="center">
            <p style="margin:0;font-size:11.5px;color:#A29A8C;">${escapeHtml(tx.footer)}</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}