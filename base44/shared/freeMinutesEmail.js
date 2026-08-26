// Constrói o e-mail de "minutos grátis" enviado ao aluno quando um admin
// adiciona créditos avulsos pela tela de Usuários. Traduzido nos 9 idiomas
// do sistema — o idioma é escolhido a partir da nacionalidade cadastrada do
// aluno (campo nationality do StudentProfile), já que ainda não sabemos o
// idioma de interface que ele tem selecionado no momento do envio.

// Mesmo mapeamento país → idioma já usado no frontend (src/lib/countries.js)
// — duplicado aqui porque funções de backend (Deno) não importam de src/.
const COUNTRY_TO_LANG = {
  BR: "pt_br", PT: "pt_pt", FR: "fr",
  DE: "de", AT: "de", CH: "de",
  IT: "it", ES: "es", JP: "ja", KR: "ko",
  AR: "es", MX: "es", CO: "es", CL: "es", PE: "es", UY: "es", PY: "es",
  BO: "es", EC: "es", VE: "es", CR: "es", PA: "es", GT: "es", HN: "es",
  SV: "es", NI: "es", DO: "es", CU: "es", PR: "es",
};

export function langForCountry(code) {
  if (!code) return "en";
  return COUNTRY_TO_LANG[String(code).toUpperCase()] || "en";
}

const LOGO_URL = 'https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png';

const TEXTS = {
  en: {
    subject: `🎉 You've been granted free minutes!`,
    preheader: `Free conversation minutes were added to your One Talky account.`,
    headline: `You've received free minutes!`,
    body: `The One Talky team has added <strong>{minutes} free minutes</strong> to your account — no payment required. Use them to practice real conversation with a tutor from anywhere in the world.`,
    minutesLabel: `free minutes`,
    cta: `Book my free lesson`,
    footer: `This is an automatic message from One Talky.`
  },
  pt_br: {
    subject: `🎉 Você ganhou minutos grátis!`,
    preheader: `Minutos grátis de conversação foram adicionados à sua conta One Talky.`,
    headline: `Você foi contemplado com minutos grátis!`,
    body: `A equipe da One Talky adicionou <strong>{minutes} minutos grátis</strong> à sua conta — sem nenhum custo. Use pra praticar conversação de verdade com um tutor de qualquer lugar do mundo.`,
    minutesLabel: `minutos grátis`,
    cta: `Agendar minha aula grátis`,
    footer: `Esta é uma mensagem automática da One Talky.`
  },
  pt_pt: {
    subject: `🎉 Recebeu minutos grátis!`,
    preheader: `Minutos grátis de conversação foram adicionados à sua conta One Talky.`,
    headline: `Foi contemplado com minutos grátis!`,
    body: `A equipa da One Talky adicionou <strong>{minutes} minutos grátis</strong> à sua conta — sem qualquer custo. Use para praticar conversação a sério com um tutor de qualquer lugar do mundo.`,
    minutesLabel: `minutos grátis`,
    cta: `Marcar a minha aula grátis`,
    footer: `Esta é uma mensagem automática da One Talky.`
  },
  es: {
    subject: `🎉 ¡Has recibido minutos gratis!`,
    preheader: `Se agregaron minutos gratis de conversación a tu cuenta de One Talky.`,
    headline: `¡Has recibido minutos gratis!`,
    body: `El equipo de One Talky ha agregado <strong>{minutes} minutos gratis</strong> a tu cuenta — sin ningún costo. Úsalos para practicar conversación real con un tutor de cualquier parte del mundo.`,
    minutesLabel: `minutos gratis`,
    cta: `Reservar mi clase gratis`,
    footer: `Este es un mensaje automático de One Talky.`
  },
  fr: {
    subject: `🎉 Vous avez reçu des minutes gratuites !`,
    preheader: `Des minutes de conversation gratuites ont été ajoutées à votre compte One Talky.`,
    headline: `Vous avez reçu des minutes gratuites !`,
    body: `L'équipe One Talky a ajouté <strong>{minutes} minutes gratuites</strong> à votre compte — sans aucun coût. Utilisez-les pour pratiquer une vraie conversation avec un tuteur du monde entier.`,
    minutesLabel: `minutes gratuites`,
    cta: `Réserver mon cours gratuit`,
    footer: `Ceci est un message automatique de One Talky.`
  },
  de: {
    subject: `🎉 Sie haben Gratis-Minuten erhalten!`,
    preheader: `Kostenlose Konversationsminuten wurden Ihrem One Talky-Konto gutgeschrieben.`,
    headline: `Sie haben Gratis-Minuten erhalten!`,
    body: `Das One Talky-Team hat Ihrem Konto <strong>{minutes} Gratis-Minuten</strong> gutgeschrieben — ohne jegliche Kosten. Nutzen Sie sie, um mit einem Tutor aus der ganzen Welt echte Konversation zu üben.`,
    minutesLabel: `Gratis-Minuten`,
    cta: `Meine Gratis-Lektion buchen`,
    footer: `Dies ist eine automatische Nachricht von One Talky.`
  },
  it: {
    subject: `🎉 Hai ricevuto minuti gratuiti!`,
    preheader: `Minuti di conversazione gratuiti sono stati aggiunti al tuo account One Talky.`,
    headline: `Hai ricevuto minuti gratuiti!`,
    body: `Il team di One Talky ha aggiunto <strong>{minutes} minuti gratuiti</strong> al tuo account — senza alcun costo. Usali per praticare una conversazione vera con un tutor da qualsiasi parte del mondo.`,
    minutesLabel: `minuti gratuiti`,
    cta: `Prenota la mia lezione gratuita`,
    footer: `Questo è un messaggio automatico di One Talky.`
  },
  ja: {
    subject: `🎉 無料分数プレゼントのお知らせ`,
    preheader: `One Talkyアカウントに無料の会話分数が追加されました。`,
    headline: `無料分数をプレゼントされました！`,
    body: `One Talkyチームより、アカウントに<strong>{minutes}分の無料分数</strong>を追加いたしました — 費用は一切かかりません。世界各国の講師との本物の会話練習にぜひご利用ください。`,
    minutesLabel: `無料分`,
    cta: `無料レッスンを予約する`,
    footer: `これはOne Talkyからの自動送信メッセージです。`
  },
  ko: {
    subject: `🎉 무료 분이 지급되었습니다!`,
    preheader: `One Talky 계정에 무료 대화 분이 추가되었습니다.`,
    headline: `무료 분을 받으셨습니다!`,
    body: `One Talky 팀이 회원님의 계정에 <strong>{minutes}분의 무료 분</strong>을 추가했습니다 — 어떠한 비용도 들지 않습니다. 전 세계 튜터와의 진짜 대화 연습에 사용해 보세요.`,
    minutesLabel: `무료 분`,
    cta: `무료 수업 예약하기`,
    footer: `이것은 One Talky에서 보낸 자동 메시지입니다.`
  }
};

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

export function buildFreeMinutesEmail({ studentName, minutes, lang }) {
  const tx = TEXTS[lang] || TEXTS.en;
  const safeName = escapeHtml(studentName || '');
  const body = tx.body.replace('{minutes}', minutes);

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
            <div style="font-size:40px;margin-bottom:8px;">🎉</div>
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

  return { subject: tx.subject, html };
}
