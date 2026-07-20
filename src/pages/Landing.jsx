import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const ACCENT = "#F26A1B";

const CONTENT = {
  pt: {
    navHow: "Como funciona", navTutors: "Tutores", navPlans: "Planos", navGuarantee: "Garantia",
    navLogin: "Entrar", navCta: "Começar grátis",
    heroBadge: "Conversação 1 a 1, ao vivo",
    headline: ["Você entende inglês. Só não consegue ", "falar."],
    heroSub1: "Aulas de conversação 1 a 1, por vídeo, com tutores de inglês do mundo inteiro. 30 minutos por vez, no seu horário. A partir de ",
    heroPrice: "R$29,90 por semana", heroSub2: ".",
    heroCta: "Começar com 15 minutos grátis", heroSecondary: "Ver como funciona",
    disarm: ["Sem cartão pra testar", "Cancele quando quiser", "7 dias de garantia"],
    capMain: "\u201CIt\u2019s nice to meet you.\u201D", capSub: "Que bom te conhecer.", bubbleReply: "Oi!",
    fStreakLabel: "Sequência", fStreakVal: "12 dias", fPronLabel: "Pronúncia", fPronVal: "95",
    fSaveLabel: "Nova palavra", fSaveWord: "context",
    heroFactChips: ["Aula 1 a 1, sempre", "30 minutos por vez", "Tutores de vários países", "A partir de R$29,90/sem"],
    openLead: "Você já assistiu série sem legenda. Já leu texto em inglês sem travar. Mas quando alguém te olha e pergunta algo em inglês, ",
    openAccent: "a frase some.",
    openBody: "O problema nunca foi o seu conhecimento. Foi a falta de prática de fala com outro ser humano. É exatamente isso que o One Talky resolve: conversa real, 1 a 1, com tutores de vários países. Você entra, você fala.",
    painEyebrow: "A dor", painTitle: "A conversa trava sempre no mesmo ponto.",
    pains: [
      "Você monta a frase inteira na cabeça — e quando ia falar, o assunto já mudou.",
      "Entende tudo que o outro fala, mas responde em três palavras pra não errar.",
      "Evita reunião, viagem ou call em inglês. Sempre dá pra empurrar pro colega.",
      "Já pagou curso, terminou o módulo — e continua sem conseguir puxar assunto.",
      "Conhece a gramática melhor que muita gente fluente. E isso te irrita.",
      "Não tem medo de inglês. Tem medo de travar na frente dos outros.",
    ],
    painClose: "Não é falta de estudo. É falta de quilometragem falando.",
    mechEyebrow: "A solução", mechTitle: "O One Talky é prática de fala. Só isso. É por isso que funciona.",
    mechSub: "Videochamada de 30 minutos com um tutor real, de outro país, do começo ao fim.",
    mechanism: [
      { n: "1", title: "Um a um, sempre", body: "Nada de turma de 12 pessoas onde você fala 4 minutos. A aula inteira é sua." },
      { n: "2", title: "Tutores ESL de vários países", body: "Treinados pra ensinar quem está aprendendo — ajustam ritmo, vocabulário e paciência ao seu nível." },
      { n: "3", title: "Blocos de 30 min, no seu horário", body: "Você agenda quando dá. Tem 30 minutos livres agora? Entra agora." },
      { n: "4", title: "Modelo global, preço de gente normal", body: "Tutores espalhados pelo mundo: uma aula particular custa uma fração da escola tradicional." },
    ],
    honesty: ["E a gente vai ser honesto: ", "ninguém fica fluente em 15 dias.", " Fluência vem de repetição. O One Talky tira todos os obstáculos entre você e a prática constante — preço, horário, vergonha e agenda."],
    benEyebrow: "Benefícios", benTitle: "O que muda quando você fala toda semana",
    benefits: [
      { title: "Você para de traduzir na cabeça", body: "Falando toda semana, o inglês deixa de ser tradução e vira reflexo." },
      { title: "A vergonha some antes do sotaque", body: "Errar na frente de um tutor que te corrige com calma é o treino que nenhuma sala oferece." },
      { title: "Sua agenda manda, não a nossa", body: "Se a semana virou de cabeça pra baixo, você remarca. Ninguém te cobra presença." },
      { title: "Você conversa com gente de vários países", body: "Isso te prepara pro inglês real do mundo — não pro inglês de áudio de prova." },
      { title: "Cada minuto é seu", body: "No Premium, sua hora de aula particular sai por menos de R$1 por minuto de conversa." },
      { title: "Chega na reunião sem suar frio", body: "Porque já teve aquela conversa dezenas de vezes antes." },
      { title: "Serve pra família inteira", body: "Adulto, adolescente ou criança — o tutor calibra a aula pra idade e o nível de cada um." },
      { title: "Você começa hoje", body: "Sem matrícula, sem material obrigatório, sem turma fechando no próximo semestre." },
    ],
    tutEyebrow: "Conheça seus tutores", tutTitle: "Gente de verdade, de vários países, treinada pra te ouvir",
    tutSub: "Especialistas em ensinar inglês pra quem não é nativo. Do zero ao avançado — o tutor ajusta o ritmo ao seu.",
    sealTitle: "Pagamento seguro via Mercado Pago", sealSub: "Cartão ou boleto — a gente não guarda os dados do seu cartão.",
    priceEyebrow: "Planos", priceTitle: "Escolha quanto você quer falar por semana",
    priceSub: "Todas as aulas são individuais, por vídeo, com 30 minutos de duração.",
    anchor: ["Uma aula particular de inglês no Brasil custa em média ", "R$120–R$200", " por hora. No One Talky, uma hora de conversa 1 a 1 começa em ", "R$59,80", "."],
    anchorNote: "Pagamento seguro via Mercado Pago · Sem fidelidade · Cancele quando quiser.",
    perWeek: "/semana", perMonth: "/mês", totalWord: "Total ",
    plans: [
      { tag: "Básico · 2 aulas", name: "60 min / mês", weekly: "R$29,90", monthly: "R$59,80", features: ["60 minutos de conversa por mês", "2 aulas individuais de 30 min", "Agendamento livre", "Tutores de todos os níveis"], cta: "Começar no Básico", highlight: false, badge: "" },
      { tag: "Básico · 4 aulas", name: "120 min / mês", weekly: "R$29,90", monthly: "R$119,60", features: ["120 minutos de conversa por mês", "4 aulas individuais de 30 min", "Uma conversa por semana: o ritmo mínimo pra criar hábito", "Agendamento livre"], cta: "Quero 1 aula por semana", highlight: true, badge: "Mais escolhido" },
      { tag: "Standard · 240 min", name: "R$28,40 por aula", weekly: "R$56,81", monthly: "R$227,24", features: ["240 minutos de conversa por mês", "Até 8 aulas de 30 min", "Sai por R$28,40 por aula", "Ideal pra quem tem prazo: viagem, entrevista, prova"], cta: "Assinar o Standard", highlight: false, badge: "" },
      { tag: "Premium · 480 min", name: "Menos de R$1/min", weekly: "R$107,64", monthly: "R$430,56", features: ["480 minutos de conversa por mês", "Até 16 aulas de 30 min", "Sai por R$26,91 por aula", "Prática quase diária: o caminho mais curto pra destravar"], cta: "Assinar o Premium", highlight: false, badge: "" },
    ],
    guarTitle: "7 dias. Sem perguntas.",
    guar: ["Assine, faça suas aulas, converse com os tutores. Se em até 7 dias achar que o One Talky não é pra você, manda uma mensagem e a gente devolve ", "100% do valor", ". Sem formulário, sem justificativa."],
    guarBody3: "Se você precisa fazer conta pra decidir se vale a pena, é porque a gente não fez a nossa parte de tirar o risco do seu lado.",
    objEyebrow: "Antes que você pergunte", objTitle: "Quebrando as objeções de frente",
    objections: [
      { q: "Não tenho tempo pra estudar toda semana.", a: "Ninguém tem. Por isso a aula tem 30 minutos, não 2 horas. Abriu uma janela na agenda, você agenda. Semana ruim? Remarca." },
      { q: "E se eu não entender o professor?", a: "Nossos tutores são especialistas em ensinar inglês pra quem não é nativo. Eles reduzem o ritmo, repetem e escrevem no chat até você acompanhar." },
      { q: "Professor particular é caro demais pra mim.", a: "Era. Nosso modelo é global: tutores no mundo inteiro, sem prédio, sem secretaria. Uma aula de 30 minutos sai a partir de R$29,90." },
      { q: "O pagamento no site é seguro?", a: "Todo pagamento é processado direto pelo Mercado Pago. A gente não armazena os dados do seu cartão." },
      { q: "E se não funcionar pra mim?", a: "Você testa 15 minutos de graça antes de pagar nada. E se assinar e não gostar, tem 7 dias pra pedir 100% do dinheiro de volta." },
    ],
    urgBadge: "Lote fundador", urgTitle: "Preço de fundador: os 200 primeiros.",
    urg: ["O One Talky está abrindo agora. Os 200 primeiros assinantes travam o preço de lançamento ", "pra sempre", " — mesmo quando os planos subirem."],
    urgSpotsPre: "Restam", urgSpotsPost: "vagas de fundador", urgCta: "Garantir meu preço de fundador",
    faqTitle: "Perguntas que todo mundo faz",
    faqs: [
      { q: "Quanto tempo eu preciso dedicar por semana?", a: "30 minutos, uma vez por semana, já cria hábito. Quem tem pressa faz 3 ou 4 vezes." },
      { q: "Serve pra quem é iniciante de verdade?", a: "Serve. Os tutores conduzem a aula com quem sabe pouco: ritmo mais devagar, vocabulário simples, apoio no chat." },
      { q: "E se eu já sou avançado?", a: "Também serve — e é onde você mais ganha. Aluno avançado normalmente não tem com quem praticar." },
      { q: "As aulas têm hora marcada?", a: "Você agenda quando quiser, dentro da disponibilidade dos tutores. Sem grade fixa." },
      { q: "Como funciona o pagamento?", a: "Direto pelo Mercado Pago: cartão ou boleto. Assinatura mensal, sem fidelidade." },
      { q: "Preciso instalar alguma coisa?", a: "Não. A aula acontece no navegador, pelo celular ou computador. Só precisa de internet e fone." },
    ],
    finTitle: ["Daqui a seis meses, você vai estar ", "falando", " — ou ainda explicando por que não fala."],
    finBody: "Ninguém destrava lendo sobre inglês. Você destrava falando, errando e falando de novo — com alguém do outro lado tendo paciência com você. São 30 minutos. Começa com 15 de graça.",
    finMicro: "Sem cartão pra testar · Pagamento seguro via Mercado Pago · 7 dias de garantia",
    psBody: "— A gente não vai prometer fluência em 15 dias, porque isso não existe. O que a gente promete: conversa real com gente real, no seu horário, a partir de R$29,90 por semana.",
    ppsBody: "— O teste são 15 minutos e não custa nada. E depois de assinar, tem 7 dias pra pedir todo o dinheiro de volta. O único jeito de sair perdendo é não tentando.",
    footPrivacy: "Política de Privacidade", footTerms: "Termos de Uso", footSupport: "Suporte",
    footLgpd: "One Talky — conversação em inglês 1 a 1. Pagamento via Mercado Pago. Seus dados são tratados conforme a LGPD.",
  },
  en: {
    navHow: "How it works", navTutors: "Tutors", navPlans: "Plans", navGuarantee: "Guarantee",
    navLogin: "Log in", navCta: "Start free",
    heroBadge: "Live 1-on-1 conversation",
    headline: ["You understand English. You just can't ", "speak it."],
    heroSub1: "1-on-1 conversation lessons, by video, with English tutors from all over the world. 30 minutes at a time, on your schedule. Starting at ",
    heroPrice: "R$29.90 per week", heroSub2: ".",
    heroCta: "Start with 15 free minutes", heroSecondary: "See how it works",
    disarm: ["No card to try it", "Cancel anytime", "7-day guarantee"],
    capMain: "\u201CIt\u2019s nice to meet you.\u201D", capSub: "Nice to meet you too!", bubbleReply: "Hi!",
    fStreakLabel: "Streak", fStreakVal: "12 days", fPronLabel: "Pronunciation", fPronVal: "95",
    fSaveLabel: "New word", fSaveWord: "context",
    heroFactChips: ["Always 1-on-1", "30 minutes at a time", "Tutors from many countries", "From R$29.90/week"],
    openLead: "You've watched shows without subtitles. You've read English without freezing. But when someone looks at you and asks something in English, ",
    openAccent: "the words vanish.",
    openBody: "The problem was never your knowledge. It was the lack of speaking practice with another human being. That's exactly what One Talky fixes: real, 1-on-1 conversation with tutors from many countries. You log in, you speak.",
    painEyebrow: "The pain", painTitle: "The conversation always freezes at the same point.",
    pains: [
      "You build the whole sentence in your head — and by the time you'd speak, the topic has moved on.",
      "You understand everything the other person says, but you answer in three words to avoid mistakes.",
      "You avoid meetings, trips or calls in English. There's always a colleague who 'speaks better'.",
      "You've paid for a course, finished the module — and you still can't start a conversation.",
      "You know grammar better than plenty of fluent people. And that annoys you.",
      "You're not afraid of English. You're afraid of freezing in front of others.",
    ],
    painClose: "It's not a lack of study. It's a lack of mileage speaking.",
    mechEyebrow: "The solution", mechTitle: "One Talky is speaking practice. That's it. That's why it works.",
    mechSub: "A 30-minute video call with a real tutor, from another country, start to finish.",
    mechanism: [
      { n: "1", title: "One-on-one, always", body: "No class of 12 people where you speak for 4 minutes. The whole lesson is yours." },
      { n: "2", title: "ESL tutors from many countries", body: "Trained to teach learners — they adjust the pace, vocabulary and patience to your level." },
      { n: "3", title: "30-minute blocks, on your schedule", body: "You book when it works. Got 30 free minutes right now? Jump in now." },
      { n: "4", title: "Global model, normal-people price", body: "Tutors spread around the world: a private lesson costs a fraction of a traditional school." },
    ],
    honesty: ["And we'll be honest with you: ", "nobody becomes fluent in 15 days.", " Fluency comes from repetition. What One Talky does is remove every obstacle between you and constant practice — price, schedule, shyness and calendar."],
    benEyebrow: "Benefits", benTitle: "What changes when you speak every week",
    benefits: [
      { title: "You stop translating in your head", body: "Speaking every week, English stops being translation and becomes reflex." },
      { title: "The shyness goes before the accent", body: "Making mistakes in front of a tutor who corrects you calmly is training no classroom offers." },
      { title: "Your schedule runs the show, not ours", body: "If your week turned upside down, you reschedule. Nobody marks you absent." },
      { title: "You talk to people from many countries", body: "That prepares you for the real English of the world — not the English of a test audio." },
      { title: "Every minute is yours", body: "On Premium, your hour of private lessons costs less than R$1 per minute of conversation." },
      { title: "You show up without breaking a sweat", body: "Because you've had that conversation dozens of times before." },
      { title: "It works for the whole family", body: "Adult, teen or child — the tutor calibrates the lesson to each person's age and level." },
      { title: "You start today", body: "No enrollment, no mandatory materials, no class filling up next semester." },
    ],
    tutEyebrow: "Meet your tutors", tutTitle: "Real people, from many countries, trained to listen to you",
    tutSub: "Specialists in teaching English to non-native speakers. From zero to advanced — the tutor adjusts the pace to yours.",
    sealTitle: "Secure payment via Mercado Pago", sealSub: "Card or bank slip — we don't store your card details.",
    priceEyebrow: "Plans", priceTitle: "Choose how much you want to speak each week",
    priceSub: "Every lesson is one-on-one, by video, 30 minutes long.",
    anchor: ["A private English lesson in Brazil costs on average ", "R$120–R$200", " per hour. At One Talky, an hour of 1-on-1 conversation starts at ", "R$59.80", "."],
    anchorNote: "Secure payment via Mercado Pago · No lock-in · Cancel anytime.",
    perWeek: "/week", perMonth: "/month", totalWord: "Total ",
    plans: [
      { tag: "Basic · 2 lessons", name: "60 min / month", weekly: "R$29.90", monthly: "R$59.80", features: ["60 minutes of conversation per month", "2 one-on-one 30-min lessons", "Free scheduling", "Tutors of every level"], cta: "Start on Basic", highlight: false, badge: "" },
      { tag: "Basic · 4 lessons", name: "120 min / month", weekly: "R$29.90", monthly: "R$119.60", features: ["120 minutes of conversation per month", "4 one-on-one 30-min lessons", "One conversation a week: the minimum to build a habit", "Free scheduling"], cta: "I want 1 lesson a week", highlight: true, badge: "Most chosen" },
      { tag: "Standard · 240 min", name: "R$28.40 per lesson", weekly: "R$56.81", monthly: "R$227.24", features: ["240 minutes of conversation per month", "Up to 8 lessons of 30 min", "Works out to R$28.40 per lesson", "Great for a deadline: trip, interview, exam"], cta: "Subscribe to Standard", highlight: false, badge: "" },
      { tag: "Premium · 480 min", name: "Under R$1/min", weekly: "R$107.64", monthly: "R$430.56", features: ["480 minutes of conversation per month", "Up to 16 lessons of 30 min", "Works out to R$26.91 per lesson", "Near-daily practice: the shortest path to breaking through"], cta: "Subscribe to Premium", highlight: false, badge: "" },
    ],
    guarTitle: "7 days. No questions.",
    guar: ["Subscribe, take your lessons, talk to the tutors. If within 7 days you feel One Talky isn't for you, send us a message and we refund ", "100% of your money", ". No form, no justification."],
    guarBody3: "If you need to do the math to decide whether it's worth it, that's because we didn't do our part of taking the risk off your side.",
    objEyebrow: "Before you ask", objTitle: "Handling the objections head-on",
    objections: [
      { q: "I don't have time to study every week.", a: "Nobody does. That's why the lesson is 30 minutes, not 2 hours. A window opened in your calendar? You book it. Bad week? You reschedule." },
      { q: "What if I don't understand the teacher?", a: "Our tutors are specialists in teaching English to non-natives. They slow down, repeat, write in the chat and adjust the vocabulary until you follow." },
      { q: "A private teacher is too expensive for me.", a: "It was. Our model is global: tutors worldwide, no building, no front desk. A 30-minute lesson starts at R$29.90." },
      { q: "Is payment on the site secure?", a: "Every payment is processed directly by Mercado Pago. We don't store your card details." },
      { q: "What if it doesn't work for me?", a: "You try 15 minutes free before paying anything. And if you subscribe and don't like it, you have 7 days to ask for 100% of your money back." },
    ],
    urgBadge: "Founder batch", urgTitle: "Founder price: the first 200.",
    urg: ["One Talky is opening now. The first 200 subscribers lock in the launch price ", "forever", " — even when plans go up."],
    urgSpotsPre: "Only", urgSpotsPost: "founder spots left", urgCta: "Lock in my founder price",
    faqTitle: "The questions everyone asks",
    faqs: [
      { q: "How much time do I need each week?", a: "30 minutes, once a week, already builds a habit. People in a hurry do it 3 or 4 times." },
      { q: "Does it work for a real beginner?", a: "It does. The tutors run the lesson with people who know little: slower pace, simple vocabulary, support in the chat." },
      { q: "What if I'm already advanced?", a: "It works too — and it's where you gain the most. Advanced learners usually have no one to practice with." },
      { q: "Do lessons have a fixed time?", a: "You book whenever you want, within the tutors' availability. No fixed grid, no roll call." },
      { q: "How does payment work?", a: "Directly through Mercado Pago: card or bank slip. Monthly subscription, no lock-in." },
      { q: "Do I need to install anything?", a: "No. The lesson happens in the browser, on your phone or computer. You just need internet and headphones." },
    ],
    finTitle: ["Six months from now, you'll be ", "speaking", " — or still explaining why you don't."],
    finBody: "Nobody breaks through by reading about English. You break through by speaking, making mistakes and speaking again — with someone on the other side being patient with you. It's 30 minutes. Start with 15 free.",
    finMicro: "No card to try it · Secure payment via Mercado Pago · 7-day guarantee",
    psBody: "— We won't promise you fluency in 15 days, because that doesn't exist. What we do promise: real conversation with real people, on your schedule, starting at R$29.90 a week.",
    ppsBody: "— The trial is 15 minutes and costs nothing. And after subscribing, you have 7 days to ask for all your money back. The only way to lose here is by not trying.",
    footPrivacy: "Privacy Policy", footTerms: "Terms of Use", footSupport: "Support",
    footLgpd: "One Talky — 1-on-1 English conversation. Payment via Mercado Pago. Your data is handled in accordance with Brazil's LGPD.",
  },
};

const TUTORS = [
  { name: "Marcus", country: "South Africa", flag: "🇿🇦", line: "I go at your pace. If you freeze, we breathe and start again.", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face" },
  { name: "Aileen", country: "Philippines", flag: "🇵🇭", line: "I love everyday small talk — that's where English loosens up.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face" },
  { name: "David", country: "United Kingdom", flag: "🇬🇧", line: "I correct you calmly and write in the chat so it sticks.", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face" },
  { name: "Sarah", country: "United States", flag: "🇺🇸", line: "No pressure. The whole half hour is a real conversation.", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face" },
  { name: "Chidi", country: "Nigeria", flag: "🇳🇬", line: "From zero to advanced: I adjust the vocabulary with every answer.", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" },
  { name: "Priya", country: "India", flag: "🇮🇳", line: "I like working real situations: work, travel, interviews.", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face" },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.ot-lp { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #17181C; background: #FDFBF9; -webkit-font-smoothing: antialiased; }
.ot-lp * { box-sizing: border-box; }
@keyframes ot-floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes ot-floaty2 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(9px)} }
@keyframes ot-floaty3 { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-7px)} }

/* Nav links: hide on small, show on large */
.ot-nav-links { display:flex; gap:4px; justify-content:center; flex:1; }
@media(max-width:860px){ .ot-nav-links { display:none!important; } }

/* Nav mobile menu */
.ot-mobile-menu { display:none; flex-direction:column; gap:4px; padding:12px 16px 16px; border-top:1px solid #EFEAE3; }
.ot-mobile-menu.open { display:flex!important; }
.ot-mobile-menu a { padding:10px 14px; border-radius:10px; color:#4B4C57; fontWeight:600; font-size:15px; text-decoration:none; background:#F7F2EB; }

/* Hamburger: only on small */
.ot-hamburger { display:none; cursor:pointer; background:none; border:1px solid #E4DED6; border-radius:8px; padding:7px 9px; color:#3A3B45; }
@media(max-width:860px){ .ot-hamburger { display:flex!important; align-items:center; justify-content:center; } }

/* Nav CTAs: hide login text on very small */
@media(max-width:500px){ .ot-nav-login { display:none!important; } }

/* Hero: stack on mobile, show image below text */
@media(max-width:860px){
  .ot-hero-grid { grid-template-columns:1fr!important; }
  .ot-hero-visual { display:flex!important; justify-content:center; margin-top:32px; min-height:auto!important; }
  .ot-hero-visual > div:first-child { display:none!important; } /* hide radial bg on mobile */
  .ot-hero-card { width:min(280px,86vw)!important; }
  .ot-float-card { display:none!important; }
  .ot-grid2 { grid-template-columns:1fr!important; }
}
`;

export default function Landing() {
  const [lang, setLang] = useState("pt");
  const [openFaq, setOpenFaq] = useState(0);
  const [spots, setSpots] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const founderSpotsLeft = 137;
  const c = CONTENT[lang];
  const navigate = useNavigate();

  useEffect(() => {
    let cur = 0;
    const step = Math.max(1, Math.round(founderSpotsLeft / 40));
    const t = setInterval(() => {
      cur = Math.min(founderSpotsLeft, cur + step);
      setSpots(cur);
      if (cur >= founderSpotsLeft) clearInterval(t);
    }, 28);
    return () => clearInterval(t);
  }, []);

  const spotsTaken = 200 - spots;

  const eyebrowStyle = { fontSize: 13, fontWeight: 700, letterSpacing: ".1em", textTransform: "uppercase", color: "#C4520B" };
  const h2Style = { marginTop: 10, fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, letterSpacing: "-.02em", color: "#17181C" };

  const plans = c.plans.map((p) => ({
    ...p,
    big: p.monthly,
    bigUnit: c.perMonth,
    sub: p.weekly + c.perWeek,
  }));

  return (
    <div className="ot-lp" style={{ overflowX: "hidden", minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(253,251,249,.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid #EFEAE3" }}>
        <nav style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo */}
          <a href="#top" style={{ display: "flex", alignItems: "center", gap: 9, color: "#17181C", textDecoration: "none", flexShrink: 0 }}>
            <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/58595725d_ChatGPTImage19dejulde202620_57_33.png" alt="One Talky" style={{ width: 32, height: 32, borderRadius: 9, objectFit: "cover" }} />
            <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: "-.01em" }}>One Talky</span>
          </a>

          {/* Links — hidden on mobile */}
          <div className="ot-nav-links">
            {[["#como", c.navHow], ["#tutores", c.navTutors], ["#planos", c.navPlans], ["#garantia", c.navGuarantee]].map(([href, label]) => (
              <a key={href} href={href} style={{ padding: "7px 13px", borderRadius: 999, color: "#4B4C57", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>{label}</a>
            ))}
          </div>

          {/* Spacer on mobile */}
          <div style={{ flex: 1 }} />

          {/* Lang toggle + CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ display: "flex", border: "1px solid #E4DED6", borderRadius: 999, overflow: "hidden", fontSize: 12, fontWeight: 700 }}>
              {["pt", "en"].map((l) => (
                <button key={l} onClick={() => setLang(l)} style={{ padding: "5px 10px", border: "none", cursor: "pointer", background: lang === l ? ACCENT : "transparent", color: lang === l ? "#fff" : "#7A7B85", fontFamily: "inherit", fontWeight: 700 }}>{l.toUpperCase()}</button>
              ))}
            </div>
            <button className="ot-nav-login" onClick={() => navigate("/login")} style={{ padding: "8px 14px", borderRadius: 999, background: "transparent", border: "1.5px solid #E4DED6", color: "#3A3B45", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{c.navLogin}</button>
            <button onClick={() => navigate("/register")} style={{ padding: "9px 14px", borderRadius: 999, background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{c.navCta}</button>
            {/* Hamburger */}
            <button className="ot-hamburger" onClick={() => setMobileMenuOpen(v => !v)} aria-label="Menu">
              <svg width="18" height="14" viewBox="0 0 18 14" fill="none"><rect width="18" height="2" rx="1" fill="#3A3B45"/><rect y="6" width="18" height="2" rx="1" fill="#3A3B45"/><rect y="12" width="18" height="2" rx="1" fill="#3A3B45"/></svg>
            </button>
          </div>
        </nav>
        {/* Mobile dropdown menu */}
        <div className={`ot-mobile-menu ${mobileMenuOpen ? "open" : ""}`}>
          {[["#como", c.navHow], ["#tutores", c.navTutors], ["#planos", c.navPlans], ["#garantia", c.navGuarantee]].map(([href, label]) => (
            <a key={href} href={href} onClick={() => setMobileMenuOpen(false)}>{label}</a>
          ))}
          <a href="/login" onClick={() => setMobileMenuOpen(false)} style={{ background: "#fff", border: "1px solid #E4DED6" }}>{c.navLogin}</a>
        </div>
      </header>

      {/* HERO */}
      <section id="top" className="ot-hero-grid" style={{ maxWidth: 1180, margin: "0 auto", padding: "60px 24px 46px", display: "grid", gridTemplateColumns: "1.02fr .98fr", gap: 44, alignItems: "center" }}>
        <div>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#FDECE0", color: "#C4520B", fontWeight: 700, fontSize: 13, padding: "7px 13px", borderRadius: 999, marginBottom: 22 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: ACCENT }} />{c.heroBadge}
          </div>
          <h1 style={{ fontSize: "clamp(38px,5vw,60px)", fontWeight: 800, letterSpacing: "-.025em", lineHeight: 1.02, margin: 0 }}>
            {c.headline[0]}<span style={{ color: ACCENT }}>{c.headline[1]}</span>
          </h1>
          <p style={{ marginTop: 22, fontSize: 18, color: "#54555F", maxWidth: 520 }}>
            {c.heroSub1}<strong style={{ color: "#17181C" }}>{c.heroPrice}</strong>{c.heroSub2}
          </p>
          <div style={{ marginTop: 28, display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
            <button onClick={() => navigate("/register")} style={{ padding: "14px 24px", borderRadius: 999, background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 16, border: "none", cursor: "pointer", boxShadow: "0 10px 24px -8px rgba(242,106,27,.55)", fontFamily: "inherit" }}>
              {c.heroCta} →
            </button>
            <a href="#como" style={{ padding: "14px 22px", borderRadius: 999, border: "1.5px solid #E4DED6", color: "#3A3B45", fontWeight: 700, fontSize: 16, background: "#fff", textDecoration: "none" }}>{c.heroSecondary}</a>
          </div>
          <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", gap: "7px 16px", fontSize: 13.5, color: "#7A7B85", fontWeight: 600 }}>
            {c.disarm.map((d, i) => <span key={i}>✓ {d}</span>)}
          </div>
        </div>

        {/* Visual */}
        <div className="ot-hero-visual" style={{ position: "relative", minHeight: 480, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ position: "absolute", inset: -10, background: "radial-gradient(120% 90% at 65% 25%,#FDEBDD 0%,rgba(253,235,221,0) 62%)" }} />
          <div className="ot-hero-card" style={{ position: "relative", width: 300, borderRadius: 26, overflow: "hidden", boxShadow: "0 34px 64px -24px rgba(23,24,28,.34)", border: "5px solid #fff", background: "#fff", zIndex: 2 }}>
            {/* Photo */}
            <div style={{ position: "relative", aspectRatio: "1/1", overflow: "hidden" }}>
              <img
                src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/7144b090a_lucid-origin_cira_a_fot_de_uma_pessoa_em_uma_video_chamada_um_tutor_que_ensina_ingles_uma_mul-0.jpg"
                alt="English tutor"
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
              {/* EN badge top-left */}
              <div style={{ position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.92)", backdropFilter: "blur(6px)", borderRadius: 999, padding: "5px 10px", fontSize: 12, fontWeight: 700, color: "#17181C" }}>
                🇬🇧 EN
              </div>
              {/* Play button top-right */}
              <div style={{ position: "absolute", top: 12, right: 12, width: 34, height: 34, borderRadius: "50%", background: "rgba(23,24,28,0.75)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                <span style={{ color: "#fff", fontSize: 13, marginLeft: 2 }}>▶</span>
              </div>
            </div>
            {/* Caption */}
            <div style={{ padding: "13px 15px", background: "#17181C", color: "#fff" }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{c.capMain}</div>
              <div style={{ fontSize: 12, color: "#F7A76A", marginTop: 2 }}>{c.capSub}</div>
            </div>
          </div>
          {/* Floating cards */}
          <div className="ot-float-card" style={{ position: "absolute", top: 8, left: 0, background: "#fff", border: "1px solid #EFEAE3", borderRadius: 16, padding: "12px 14px", boxShadow: "0 16px 34px -16px rgba(0,0,0,.28)", animation: "ot-floaty 5s ease-in-out infinite", zIndex: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 34, height: 34, borderRadius: 10, background: "#FDECE0", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 16 }}>🔥</span>
              <div><div style={{ fontSize: 11, color: "#7A7B85", fontWeight: 600 }}>{c.fStreakLabel}</div><div style={{ fontSize: 16, fontWeight: 800 }}>{c.fStreakVal}</div></div>
            </div>
          </div>
          <div className="ot-float-card" style={{ position: "absolute", top: 34, right: -6, background: "#fff", border: "1px solid #EFEAE3", borderRadius: 16, padding: "12px 15px", boxShadow: "0 16px 34px -16px rgba(0,0,0,.28)", animation: "ot-floaty2 6s ease-in-out infinite", zIndex: 3 }}>
            <div style={{ fontSize: 11, color: "#7A7B85", fontWeight: 600 }}>{c.fPronLabel}</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}><span style={{ fontSize: 22, fontWeight: 800, color: "#2E9E5B" }}>{c.fPronVal}</span><span style={{ fontSize: 12, color: "#2E9E5B", fontWeight: 700 }}>%</span></div>
          </div>
          <div className="ot-float-card" style={{ position: "absolute", bottom: 70, left: -8, background: "#fff", border: "1px solid #EFEAE3", borderRadius: 16, padding: "12px 14px", boxShadow: "0 16px 34px -16px rgba(0,0,0,.28)", animation: "ot-floaty3 5.5s ease-in-out infinite", zIndex: 3 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: "#EAF1FB", color: "#2F6BD4", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>✓</span>
              <div><div style={{ fontSize: 11, color: "#7A7B85", fontWeight: 600 }}>{c.fSaveLabel}</div><div style={{ fontSize: 14, fontWeight: 800 }}>{c.fSaveWord}</div></div>
            </div>
          </div>
          <div className="ot-float-card" style={{ position: "absolute", bottom: 8, left: 70, background: ACCENT, color: "#fff", borderRadius: "14px 14px 14px 4px", padding: "7px 13px", fontWeight: 800, fontSize: 14, boxShadow: "0 12px 26px -12px rgba(242,106,27,.6)", zIndex: 3 }}>Hello!</div>
          <div className="ot-float-card" style={{ position: "absolute", top: 2, right: 64, background: "#fff", border: "1px solid #EFEAE3", color: "#17181C", borderRadius: "14px 14px 4px 14px", padding: "7px 13px", fontWeight: 800, fontSize: 14, zIndex: 3 }}>{c.bubbleReply}</div>
        </div>
      </section>

      {/* Fact chips */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 36px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, justifyContent: "center" }}>
          {c.heroFactChips.map((fc, i) => (
            <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", border: "1px solid #EEE7DD", borderRadius: 999, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, color: "#3E3F49" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: ACCENT }} />{fc}
            </span>
          ))}
        </div>
      </div>

      {/* OPENING */}
      <section style={{ maxWidth: 820, margin: "0 auto", padding: "44px 24px 20px", textAlign: "center" }}>
        <p style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 700, lineHeight: 1.35, letterSpacing: "-.01em", color: "#26272E" }}>
          {c.openLead}<span style={{ color: ACCENT }}>{c.openAccent}</span>
        </p>
        <p style={{ marginTop: 18, fontSize: 17.5, color: "#5A5B66" }}>{c.openBody}</p>
      </section>

      {/* PAIN */}
      <section style={{ background: "#F7F2EB", borderTop: "1px solid #EFEAE3", borderBottom: "1px solid #EFEAE3", marginTop: 48 }}>
        <div style={{ maxWidth: 1080, margin: "0 auto", padding: "80px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={eyebrowStyle}>{c.painEyebrow}</div>
            <h2 style={h2Style}>{c.painTitle}</h2>
          </div>
          <div className="ot-grid2" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 16 }}>
            {c.pains.map((pain, i) => (
              <div key={i} style={{ display: "flex", gap: 14, background: "#fff", border: "1px solid #EEE7DD", borderRadius: 16, padding: "20px 22px" }}>
                <span style={{ flexShrink: 0, width: 26, height: 26, borderRadius: "50%", background: "#FDECE0", color: "#C4520B", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 14 }}>✕</span>
                <p style={{ fontSize: 15.5, color: "#3E3F49", margin: 0 }}>{pain}</p>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 34, fontSize: 19, fontWeight: 700, margin: "34px 0 0" }}>{c.painClose}</p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="como" style={{ maxWidth: 1120, margin: "0 auto", padding: "90px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 48 }}>
          <div style={eyebrowStyle}>{c.mechEyebrow}</div>
          <h2 style={{ ...h2Style, fontSize: "clamp(28px,4vw,42px)", maxWidth: 760, marginInline: "auto" }}>{c.mechTitle}</h2>
          <p style={{ marginTop: 16, fontSize: 17, color: "#5A5B66", maxWidth: 640, marginInline: "auto" }}>{c.mechSub}</p>
        </div>
        <div className="ot-grid2" style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 20 }}>
          {c.mechanism.map((m, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #EEE7DD", borderRadius: 20, padding: 28, boxShadow: "0 10px 30px -20px rgba(23,24,28,.2)" }}>
              <div style={{ width: 46, height: 46, borderRadius: 12, background: "#FDECE0", color: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 20, marginBottom: 16 }}>{m.n}</div>
              <h3 style={{ fontSize: 19, fontWeight: 800, marginBottom: 8, margin: "0 0 8px" }}>{m.title}</h3>
              <p style={{ fontSize: 15.5, color: "#5A5B66", margin: 0 }}>{m.body}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 24, background: "#17181C", borderRadius: 20, padding: "26px 30px", color: "#EDE9E2", fontSize: 16.5 }}>
          {c.honesty[0]}<strong style={{ color: "#fff" }}>{c.honesty[1]}</strong>{c.honesty[2]}
        </div>
      </section>

      {/* BENEFITS */}
      <section style={{ background: "#F7F2EB", borderTop: "1px solid #EFEAE3", borderBottom: "1px solid #EFEAE3" }}>
        <div style={{ maxWidth: 1120, margin: "0 auto", padding: "88px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 44 }}>
            <div style={eyebrowStyle}>{c.benEyebrow}</div>
            <h2 style={h2Style}>{c.benTitle}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(300px,1fr))", gap: 16 }}>
            {c.benefits.map((b, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #EEE7DD", borderRadius: 16, padding: "22px 24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <span style={{ flexShrink: 0, width: 22, height: 22, borderRadius: "50%", background: ACCENT, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800 }}>✓</span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0 }}>{b.title}</h3>
                </div>
                <p style={{ fontSize: 14.5, color: "#5A5B66", margin: 0 }}>{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TUTORS */}
      <section id="tutores" style={{ maxWidth: 1120, margin: "0 auto", padding: "90px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div style={eyebrowStyle}>{c.tutEyebrow}</div>
          <h2 style={h2Style}>{c.tutTitle}</h2>
          <p style={{ marginTop: 14, fontSize: 16, color: "#5A5B66", maxWidth: 600, marginInline: "auto" }}>{c.tutSub}</p>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(250px,1fr))", gap: 18 }}>
          {TUTORS.map((t, i) => (
            <div key={i} style={{ background: "#fff", border: "1px solid #EEE7DD", borderRadius: 20, padding: 24, textAlign: "center", boxShadow: "0 10px 30px -22px rgba(23,24,28,.25)" }}>
              <div style={{ position: "relative", width: 80, height: 80, borderRadius: "50%", margin: "0 auto 14px", overflow: "hidden", border: "3px solid #FDECE0" }}>
                <img src={t.photo} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 18 }}>{t.flag}</span>
                <div style={{ fontSize: 17, fontWeight: 800 }}>{t.name}</div>
              </div>
              <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#7A7B85", background: "#F4EFE8", padding: "3px 10px", borderRadius: 999 }}>{t.country}</div>
              <p style={{ marginTop: 12, fontSize: 14, color: "#5A5B66", fontStyle: "italic" }}>"{t.line}"</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, display: "flex", justifyContent: "center" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, background: "#fff", border: "1px solid #EEE7DD", borderRadius: 14, padding: "12px 18px" }}>
            <span style={{ width: 34, height: 34, borderRadius: 9, background: "#EAF1FB", display: "flex", alignItems: "center", justifyContent: "center" }}>🔒</span>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 800 }}>{c.sealTitle}</div>
              <div style={{ fontSize: 12.5, color: "#7A7B85" }}>{c.sealSub}</div>
            </div>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="planos" style={{ background: "#F7F2EB", borderTop: "1px solid #EFEAE3", borderBottom: "1px solid #EFEAE3" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "90px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 46 }}>
            <div style={eyebrowStyle}>{c.priceEyebrow}</div>
            <h2 style={{ ...h2Style, fontSize: "clamp(28px,4vw,42px)" }}>{c.priceTitle}</h2>
            <p style={{ marginTop: 14, fontSize: 16, color: "#5A5B66" }}>{c.priceSub}</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 16, alignItems: "stretch" }}>
            {plans.map((p, i) => (
              <div key={i} style={{ position: "relative", background: p.highlight ? "#FFF7F1" : "#fff", border: `2px solid ${p.highlight ? ACCENT : "#EEE7DD"}`, borderRadius: 22, padding: "28px 22px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 14px 34px -24px rgba(23,24,28,.35)" }}>
                {p.badge && <span style={{ position: "absolute", top: -13, left: 22, background: ACCENT, color: "#fff", fontSize: 11.5, fontWeight: 800, padding: "5px 12px", borderRadius: 999 }}>{p.badge}</span>}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#A29A8C" }}>{p.tag}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>{p.name}</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.02em" }}>{p.big}</span>
                  <span style={{ fontSize: 14, color: "#8A8B94", fontWeight: 700 }}>{p.bigUnit}</span>
                </div>
                <div style={{ fontSize: 13, color: "#8A8B94", fontWeight: 600 }}>{p.sub}</div>
                <div style={{ height: 1, background: "#EEE7DD" }} />
                <ul style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, padding: 0, margin: 0, listStyle: "none" }}>
                  {p.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", gap: 9, fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate("/register")} style={{ textAlign: "center", padding: 13, borderRadius: 999, fontWeight: 700, fontSize: 14.5, background: p.highlight ? ACCENT : "#fff", color: p.highlight ? "#fff" : "#3A3B45", border: `1.5px solid ${p.highlight ? ACCENT : "#E4DED6"}`, cursor: "pointer", fontFamily: "inherit" }}>
                  {p.cta}
                </button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 34, maxWidth: 760, marginInline: "auto", background: "#fff", border: "1px solid #EEE7DD", borderRadius: 18, padding: "24px 28px", textAlign: "center" }}>
            <p style={{ fontSize: 16, color: "#3E3F49", margin: 0 }}>
              {c.anchor[0]}<span style={{ fontFamily: "ui-monospace,monospace", background: "#FDECE0", color: "#C4520B", padding: "1px 7px", borderRadius: 6, fontSize: 14 }}>{c.anchor[1]}</span>{c.anchor[2]}<strong style={{ color: "#17181C" }}>{c.anchor[3]}</strong>{c.anchor[4]}
            </p>
            <p style={{ marginTop: 10, fontSize: 14, color: "#7A7B85", margin: "10px 0 0" }}>{c.anchorNote}</p>
          </div>
        </div>
      </section>

      {/* GUARANTEE */}
      <section id="garantia" style={{ maxWidth: 900, margin: "0 auto", padding: "90px 24px" }}>
        <div style={{ background: "#17181C", borderRadius: 26, padding: "56px 44px", textAlign: "center", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: -40, right: -40, width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,rgba(242,106,27,.35),transparent 70%)" }} />
          <div style={{ position: "relative" }}>
            <div style={{ width: 66, height: 66, margin: "0 auto 20px", borderRadius: 16, background: ACCENT, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>🛡️</div>
            <h2 style={{ fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, letterSpacing: "-.02em", margin: 0 }}>{c.guarTitle}</h2>
            <p style={{ marginTop: 18, fontSize: 17, color: "#C9C5BD", maxWidth: 560, marginInline: "auto" }}>
              {c.guar[0]}<strong style={{ color: "#fff" }}>{c.guar[1]}</strong>{c.guar[2]}
            </p>
            <p style={{ marginTop: 18, fontSize: 15, color: "#8E8B84", maxWidth: 560, marginInline: "auto" }}>{c.guarBody3}</p>
          </div>
        </div>
      </section>

      {/* OBJECTIONS */}
      <section style={{ background: "#F7F2EB", borderTop: "1px solid #EFEAE3", borderBottom: "1px solid #EFEAE3" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "88px 24px" }}>
          <div style={{ textAlign: "center", marginBottom: 40 }}>
            <div style={eyebrowStyle}>{c.objEyebrow}</div>
            <h2 style={h2Style}>{c.objTitle}</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {c.objections.map((o, i) => (
              <div key={i} style={{ background: "#fff", border: "1px solid #EEE7DD", borderRadius: 16, padding: "24px 26px" }}>
                <h3 style={{ fontSize: 17.5, fontWeight: 800, marginBottom: 8, margin: "0 0 8px" }}>"{o.q}"</h3>
                <p style={{ fontSize: 15.5, color: "#5A5B66", margin: 0 }}>{o.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* URGENCY */}
      <section style={{ maxWidth: 840, margin: "0 auto", padding: "90px 24px" }}>
        <div style={{ background: `linear-gradient(135deg,${ACCENT},#DC5109)`, borderRadius: 26, padding: "52px 44px", color: "#fff", textAlign: "center", boxShadow: "0 30px 60px -30px rgba(242,106,27,.7)" }}>
          <div style={{ display: "inline-block", fontSize: 12, fontWeight: 800, letterSpacing: ".1em", textTransform: "uppercase", background: "rgba(255,255,255,.2)", padding: "6px 14px", borderRadius: 999 }}>{c.urgBadge}</div>
          <h2 style={{ marginTop: 18, fontSize: "clamp(28px,4vw,40px)", fontWeight: 800, letterSpacing: "-.02em" }}>{c.urgTitle}</h2>
          <p style={{ marginTop: 16, fontSize: 17, color: "#FCE7D8", maxWidth: 540, marginInline: "auto" }}>
            {c.urg[0]}<strong style={{ color: "#fff" }}>{c.urg[1]}</strong>{c.urg[2]}
          </p>
          <div style={{ maxWidth: 420, margin: "26px auto 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
              <span>{c.urgSpotsPre} {spots} {c.urgSpotsPost}</span><span>{spotsTaken}/200</span>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: "rgba(255,255,255,.25)", overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${(spotsTaken / 200) * 100}%`, background: "#fff", borderRadius: 999, transition: "width .8s ease" }} />
            </div>
          </div>
          <button onClick={() => navigate("/register")} style={{ display: "inline-block", marginTop: 28, padding: "15px 30px", borderRadius: 999, background: "#fff", color: "#DC5109", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", fontFamily: "inherit" }}>
            {c.urgCta} →
          </button>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" style={{ maxWidth: 820, margin: "0 auto", padding: "70px 24px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={eyebrowStyle}>FAQ</div>
          <h2 style={h2Style}>{c.faqTitle}</h2>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {c.faqs.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={i} style={{ background: "#fff", border: "1px solid #EEE7DD", borderRadius: 14, overflow: "hidden" }}>
                <button onClick={() => setOpenFaq(open ? -1 : i)} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "20px 24px", background: "none", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
                  <span style={{ fontSize: 16.5, fontWeight: 700, color: "#17181C" }}>{f.q}</span>
                  <span style={{ flexShrink: 0, fontSize: 22, color: ACCENT, transform: open ? "rotate(45deg)" : "rotate(0deg)", transition: "transform .2s", display: "inline-block" }}>+</span>
                </button>
                {open && <p style={{ padding: "0 24px 22px", fontSize: 15.5, color: "#5A5B66", margin: 0 }}>{f.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* FINAL CTA */}
      <section style={{ background: "#17181C", color: "#fff" }}>
        <div style={{ maxWidth: 820, margin: "0 auto", padding: "96px 24px", textAlign: "center" }}>
          <h2 style={{ fontSize: "clamp(28px,4.4vw,46px)", fontWeight: 800, letterSpacing: "-.025em", lineHeight: 1.1, margin: 0 }}>
            {c.finTitle[0]}<span style={{ color: "#F7A76A" }}>{c.finTitle[1]}</span>{c.finTitle[2]}
          </h2>
          <p style={{ marginTop: 22, fontSize: 17.5, color: "#C2BEB6", maxWidth: 600, marginInline: "auto" }}>{c.finBody}</p>
          <button onClick={() => navigate("/register")} style={{ display: "inline-block", marginTop: 32, padding: "16px 34px", borderRadius: 999, background: ACCENT, color: "#fff", fontWeight: 800, fontSize: 17, border: "none", cursor: "pointer", boxShadow: "0 14px 30px -10px rgba(242,106,27,.6)", fontFamily: "inherit" }}>
            {c.heroCta} →
          </button>
          <div style={{ marginTop: 18, fontSize: 13.5, color: "#8E8B84", fontWeight: 600 }}>{c.finMicro}</div>
          <div style={{ marginTop: 56, textAlign: "left", display: "flex", flexDirection: "column", gap: 20, maxWidth: 620, marginInline: "auto" }}>
            <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "22px 24px" }}>
              <span style={{ fontWeight: 800, color: "#F7A76A" }}>P.S.</span>{" "}<span style={{ color: "#D2CEC6", fontSize: 15.5 }}>{c.psBody}</span>
            </div>
            <div style={{ background: "rgba(255,255,255,.05)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 16, padding: "22px 24px" }}>
              <span style={{ fontWeight: 800, color: "#F7A76A" }}>P.P.S.</span>{" "}<span style={{ color: "#D2CEC6", fontSize: 15.5 }}>{c.ppsBody}</span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer style={{ background: "#101115", color: "#8E8B84", padding: "44px 24px" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 9, color: "#fff" }}>
            <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/58595725d_ChatGPTImage19dejulde202620_57_33.png" alt="One Talky" style={{ width: 26, height: 26, borderRadius: 8, objectFit: "cover" }} />
            <span style={{ fontWeight: 800, fontSize: 16 }}>One Talky</span>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 13.5 }}>
            <a href="#" style={{ color: "#B7B3AB", textDecoration: "none" }}>{c.footPrivacy}</a>
            <a href="#" style={{ color: "#B7B3AB", textDecoration: "none" }}>{c.footTerms}</a>
            <a href="#" style={{ color: "#B7B3AB", textDecoration: "none" }}>{c.footSupport}</a>
            <Link to="/login" style={{ color: ACCENT, textDecoration: "none", fontWeight: 700 }}>{c.navLogin}</Link>
          </div>
        </div>
        <p style={{ maxWidth: 1180, margin: "20px auto 0", fontSize: 12, color: "#63615C" }}>{c.footLgpd}</p>
      </footer>
    </div>
  );
}