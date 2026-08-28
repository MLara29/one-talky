import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";

const ACCENT = "#F26A1B";
const LANG_FULL_LABELS = { pt: "Português", en: "English", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano", ja: "日本語", ko: "한국어" };
const LANG_ORDER = ["pt", "en", "es", "fr", "de", "it", "ja", "ko"];

// Mapeia o país detectado por IP pro idioma inicial da página — só usado na
// PRIMEIRA carga, antes de qualquer escolha manual da pessoa. Países fora
// dessa lista caem em inglês (mais seguro que assumir português por padrão
// pra quem não é do Brasil).
const COUNTRY_TO_LANG = {
  BR: "pt",
  FR: "fr",
  DE: "de", AT: "de", CH: "de",
  IT: "it",
  ES: "es",
  JP: "ja",
  KR: "ko",
  AR: "es", MX: "es", CO: "es", CL: "es", PE: "es", UY: "es", PY: "es",
  BO: "es", EC: "es", VE: "es", CR: "es", PA: "es", GT: "es", HN: "es",
  SV: "es", NI: "es", DO: "es", CU: "es", PR: "es",
};

// Mapeia o idioma ESCOLHIDO manualmente pra uma região de preço — assim, se
// a pessoa trocar pra japonês, o preço já muda pra iene mesmo que o IP real
// dela não seja do Japão (ex: alguém testando o site de fora, ou querendo
// ver o preço de outra região). Idiomas sem região fixa (inglês) continuam
// usando a detecção por IP normalmente.

import { detectAndCacheRegion, getRegionalConfig, formatRegionalPrice, getCachedRegion } from "@/lib/regionPricing";
import { base44 } from "@/api/base44Client";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import TrackingScripts from "@/components/TrackingScripts";

const CONTENT = {
  pt: {
    navHow: "Como funciona", navTutors: "Tutores", navPlans: "Planos", navGuarantee: "Garantia",
    navLogin: "Entrar", navCta: "Crie sua conta",
    heroBadge: "Conversação 1 a 1, ao vivo",
    headline: ["Você entende inglês. Só não consegue ", "falar."],
    heroSub1: "Aulas de conversação 1 a 1, por vídeo, com tutores de inglês do mundo inteiro. 30 minutos por vez, no seu horário. A partir de ",
    heroPrice: "R$14,95 por semana", heroSub2: ".",
    heroCta: "Começar agora", heroSecondary: "Ver como funciona",
    disarm: ["Cancele quando quiser", "7 dias de garantia", "Sem fidelidade"],
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
      { title: "Chega na reunião sem suar frio", body: "Porque já teve aquela conversa dezenas de vezes antes." },
      { title: "Serve pra família inteira", body: "Adulto, adolescente ou criança — o tutor calibra a aula pra idade e o nível de cada um." },
      { title: "Você começa hoje", body: "Sem matrícula, sem material obrigatório, sem turma fechando no próximo semestre." },
    ],
    tutEyebrow: "Conheça seus tutores", tutTitle: "Gente de verdade, de vários países, treinada pra te ouvir",
    tutSub: "Especialistas em ensinar inglês pra quem não é nativo. Do zero ao avançado — o tutor ajusta o ritmo ao seu.",
    sealTitle: "Pagamento seguro via Stripe", sealSub: "Cartão de crédito — a gente não guarda os dados do seu cartão.",
    priceEyebrow: "Planos", priceTitle: "Escolha quanto você quer falar por semana",
    priceSub: "Todas as aulas são individuais, por vídeo, com 30 minutos de duração.",
    anchor: ["Uma aula particular de inglês no Brasil custa em média ", "R$120–R$200", " por hora. No One Talky, uma hora de conversa 1 a 1 começa em ", "R$59,80", "."],
    anchorNote: "Pagamento seguro via Stripe · Sem fidelidade · Cancele quando quiser.",
    perWeek: "/semana", perMonth: "/mês", totalWord: "Total ",
    plans: [
      { tag: "Básico", name: "60 min / mês", weekly: "R$14,95", monthly: "R$59,80", features: ["60 minutos de conversa por mês", "2 aulas individuais de 30 min", "Agendamento livre", "Tutores de todos os níveis"], cta: "Começar no Básico", highlight: false, badge: "" },
      { tag: "Standard", name: "120 min / mês", weekly: "R$29,90", monthly: "R$119,60", features: ["120 minutos de conversa por mês", "4 aulas de 30 min ou 2 aulas de 1 hora", "Uma conversa por semana: o ritmo mínimo pra criar hábito", "Agendamento livre"], cta: "Assinar o Standard", highlight: true, badge: "Mais escolhido" },
      { tag: "Premium", name: "240 min / mês", weekly: "R$56,81", monthly: "R$227,24", features: ["240 minutos de conversa por mês", "8 aulas de 30 min ou 4 aulas de 1 hora", "Sai por R$28,40 por aula", "Prática 2× por semana: o caminho mais rápido pra destravar"], cta: "Assinar o Premium", highlight: false, badge: "" },
    ],
    guarTitle: "7 dias. Sem perguntas.",
    guar: ["Assine, faça suas aulas, converse com os tutores. Se em até 7 dias achar que o One Talky não é pra você, manda uma mensagem e a gente devolve ", "100% do valor", ". Sem formulário, sem justificativa."],
    guarBody3: "Se você precisa fazer conta pra decidir se vale a pena, é porque a gente não fez a nossa parte de tirar o risco do seu lado.",
    objEyebrow: "Antes que você pergunte", objTitle: "Quebrando as objeções de frente",
    objections: [
      { q: "Não tenho tempo pra estudar toda semana.", a: "Ninguém tem. Por isso a aula tem 30 minutos, não 2 horas. Abriu uma janela na agenda, você agenda. Semana ruim? Remarca." },
      { q: "E se eu não entender o professor?", a: "Nossos tutores são especialistas em ensinar inglês pra quem não é nativo. Eles reduzem o ritmo, repetem e escrevem no chat até você acompanhar." },
      { q: "Professor particular é caro demais pra mim.", a: "Era. Nosso modelo é global: tutores no mundo inteiro, sem prédio, sem secretaria. Uma aula de 30 minutos sai a partir de R$29,90." },
      { q: "O pagamento no site é seguro?", a: "Todo pagamento é processado direto pela Stripe, uma das maiores plataformas de pagamento do mundo. A gente não armazena os dados do seu cartão." },
      { q: "E se não funcionar pra mim?", a: "Se assinar e não gostar, tem 7 dias pra pedir 100% do dinheiro de volta. Sem formulário, sem justificativa." },
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
      { q: "Como funciona o pagamento?", a: "Direto pela Stripe: cartão de crédito. Assinatura mensal, sem fidelidade." },
      { q: "Preciso instalar alguma coisa?", a: "Não. A aula acontece no navegador, pelo celular ou computador. Só precisa de internet e fone." },
    ],
    finTitle: ["Daqui a seis meses, você vai estar ", "falando", " — ou ainda explicando por que não fala."],
    finBody: "Ninguém destrava lendo sobre inglês. Você destrava falando, errando e falando de novo — com alguém do outro lado tendo paciência com você. São 30 minutos. Começa hoje.",
    finMicro: "Sem fidelidade · Pagamento seguro via Stripe · 7 dias de garantia",
    psBody: "— A gente não vai prometer fluência em 15 dias, porque isso não existe. O que a gente promete: conversa real com gente real, no seu horário, a partir de R$29,90 por semana.",
    ppsBody: "— Depois de assinar, tem 7 dias pra pedir todo o dinheiro de volta. O único jeito de sair perdendo é não tentando.",
    weeklySuffix: " por semana",
    noCommitmentBadge: "Cadastro grátis",
    noCommitmentTitle: "Crie sua conta sem pagar nada",
    noCommitmentBody: "Você se cadastra, escolhe um tutor e agenda sua primeira aula só quando quiser. Nenhum plano é cobrado no cadastro — você decide se assina depois de experimentar.",
    noCommitmentCta: "Criar conta grátis",
    noCommitmentFooter: "Sem cartão de crédito · Sem compromisso · Cancele quando quiser",
    refundPolicyLabel: "Política de Reembolso",
    footPrivacy: "Política de Privacidade", footTerms: "Termos de Uso", footSupport: "Suporte",
    footLgpd: "One Talky — conversação em inglês 1 a 1. Pagamento via Stripe. Seus dados são tratados conforme a LGPD.",
  },
  en: {
    navHow: "How it works", navTutors: "Tutors", navPlans: "Plans", navGuarantee: "Guarantee",
    navLogin: "Log in", navCta: "Sign up",
    heroBadge: "Live 1-on-1 conversation",
    headline: ["You understand English. You just can't ", "speak it."],
    heroSub1: "1-on-1 conversation lessons, by video, with English tutors from all over the world. 30 minutes at a time, on your schedule. Starting at ",
    heroPrice: "R$14.95 per week", heroSub2: ".",
    heroCta: "Start now", heroSecondary: "See how it works",
    disarm: ["Cancel anytime", "7-day guarantee", "No lock-in"],
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
      { title: "You show up without breaking a sweat", body: "Because you've had that conversation dozens of times before." },
      { title: "It works for the whole family", body: "Adult, teen or child — the tutor calibrates the lesson to each person's age and level." },
      { title: "You start today", body: "No enrollment, no mandatory materials, no class filling up next semester." },
    ],
    tutEyebrow: "Meet your tutors", tutTitle: "Real people, from many countries, trained to listen to you",
    tutSub: "Specialists in teaching English to non-native speakers. From zero to advanced — the tutor adjusts the pace to yours.",
    sealTitle: "Secure payment via Stripe", sealSub: "Credit card — we don't store your card details.",
    priceEyebrow: "Plans", priceTitle: "Choose how much you want to speak each week",
    priceSub: "Every lesson is one-on-one, by video, 30 minutes long.",
    anchor: ["A private English lesson in Brazil costs on average ", "R$120–R$200", " per hour. At One Talky, an hour of 1-on-1 conversation starts at ", "R$59.80", "."],
    anchorNote: "Secure payment via Stripe · No lock-in · Cancel anytime.",
    perWeek: "/week", perMonth: "/month", totalWord: "Total ",
    plans: [
      { tag: "Basic", name: "60 min / month", weekly: "R$14.95", monthly: "R$59.80", features: ["60 minutes of conversation per month", "2 one-on-one 30-min lessons", "Free scheduling", "Tutors of every level"], cta: "Start on Basic", highlight: false, badge: "" },
      { tag: "Standard", name: "120 min / month", weekly: "R$29.90", monthly: "R$119.60", features: ["120 minutes of conversation per month", "4 lessons of 30 min or 2 lessons of 1 hour", "One conversation a week: the minimum to build a habit", "Free scheduling"], cta: "Subscribe to Standard", highlight: true, badge: "Most chosen" },
      { tag: "Premium", name: "240 min / month", weekly: "R$56.81", monthly: "R$227.24", features: ["240 minutes of conversation per month", "8 lessons of 30 min or 4 lessons of 1 hour", "Works out to R$28.40 per lesson", "Twice a week practice: the fastest path to fluency"], cta: "Subscribe to Premium", highlight: false, badge: "" },
    ],
    guarTitle: "7 days. No questions.",
    guar: ["Subscribe, take your lessons, talk to the tutors. If within 7 days you feel One Talky isn't for you, send us a message and we refund ", "100% of your money", ". No form, no justification."],
    guarBody3: "If you need to do the math to decide whether it's worth it, that's because we didn't do our part of taking the risk off your side.",
    objEyebrow: "Before you ask", objTitle: "Handling the objections head-on",
    objections: [
      { q: "I don't have time to study every week.", a: "Nobody does. That's why the lesson is 30 minutes, not 2 hours. A window opened in your calendar? You book it. Bad week? You reschedule." },
      { q: "What if I don't understand the teacher?", a: "Our tutors are specialists in teaching English to non-natives. They slow down, repeat, write in the chat and adjust the vocabulary until you follow." },
      { q: "A private teacher is too expensive for me.", a: "It was. Our model is global: tutors worldwide, no building, no front desk. A 30-minute lesson starts at R$29.90." },
      { q: "Is payment on the site secure?", a: "Every payment is processed directly by Stripe, one of the world's largest payment platforms. We don't store your card details." },
      { q: "What if it doesn't work for me?", a: "If you subscribe and don't like it, you have 7 days to ask for 100% of your money back. No form, no justification." },
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
      { q: "How does payment work?", a: "Directly through Stripe: credit card. Monthly subscription, no lock-in." },
      { q: "Do I need to install anything?", a: "No. The lesson happens in the browser, on your phone or computer. You just need internet and headphones." },
    ],
    finTitle: ["Six months from now, you'll be ", "speaking", " — or still explaining why you don't."],
    finBody: "Nobody breaks through by reading about English. You break through by speaking, making mistakes and speaking again — with someone on the other side being patient with you. It's 30 minutes. Start today.",
    finMicro: "No lock-in · Secure payment via Stripe · 7-day guarantee",
    psBody: "— We won't promise you fluency in 15 days, because that doesn't exist. What we do promise: real conversation with real people, on your schedule, starting at R$29.90 a week.",
    ppsBody: "— After subscribing, you have 7 days to ask for all your money back. The only way to lose here is by not trying.",
    weeklySuffix: " per week",
    noCommitmentBadge: "Free sign-up",
    noCommitmentTitle: "Create your account without paying anything",
    noCommitmentBody: "You sign up, pick a tutor and book your first lesson only when you want. No plan is charged at sign-up — you decide whether to subscribe after trying it.",
    noCommitmentCta: "Create a free account",
    noCommitmentFooter: "No credit card · No commitment · Cancel anytime",
    refundPolicyLabel: "Refund Policy",
    footPrivacy: "Privacy Policy", footTerms: "Terms of Use", footSupport: "Support",
    footLgpd: "One Talky — 1-on-1 English conversation. Payment via Stripe. Your data is handled in accordance with Brazil's LGPD.",
  },
  es: {
    navHow: "Cómo funciona",
    navTutors: "Tutores",
    navPlans: "Planes",
    navGuarantee: "Garantía",
    navLogin: "Iniciar sesión",
    navCta: "Regístrate",
    heroBadge: "Conversación 1 a 1, en vivo",
    headline: ["Entiendes inglés. Solo no puedes ", "hablarlo."],
    heroSub1: "Clases de conversación 1 a 1, por video, con tutores de inglés de todo el mundo. 30 minutos por vez, en tu horario. Desde ",
    heroPrice: "$2,98 por semana",
    heroSub2: ".",
    heroCta: "Empezar ahora",
    heroSecondary: "Ver cómo funciona",
    disarm: ["Cancela cuando quieras", "Garantía de 7 días", "Sin permanencia"],
    capMain: "“It’s nice to meet you.”",
    capSub: "Un placer conocerte.",
    bubbleReply: "¡Hola!",
    fStreakLabel: "Racha",
    fStreakVal: "12 días",
    fPronLabel: "Pronunciación",
    fPronVal: "95",
    fSaveLabel: "Palabra nueva",
    fSaveWord: "context",
    heroFactChips: ["Siempre 1 a 1", "30 minutos por vez", "Tutores de varios países", "Desde $11,90/sem"],
    openLead: "Has visto series sin subtítulos. Has leído textos en inglés sin trabarte. Pero cuando alguien te mira y te pregunta algo en inglés, ",
    openAccent: "la frase desaparece.",
    openBody: "El problema nunca fue tu conocimiento. Fue la falta de práctica hablando con otra persona. Eso es justo lo que resuelve One Talky: conversación real, 1 a 1, con tutores de varios países. Entras, hablas.",
    painEyebrow: "El dolor",
    painTitle: "La conversación siempre se traba en el mismo punto.",
    pains: ["Armas la frase entera en tu cabeza — y cuando ibas a hablar, el tema ya cambió.", "Entiendes todo lo que dice el otro, pero respondes en tres palabras para no equivocarte.", "Evitas reuniones, viajes o llamadas en inglés. Siempre hay un colega que 'habla mejor'.", "Ya pagaste un curso, terminaste el módulo — y sigues sin poder sostener una conversación.", "Conoces la gramática mejor que mucha gente fluida. Y eso te frustra.", "No le tienes miedo al inglés. Le tienes miedo a trabarte delante de otros."],
    painClose: "No es falta de estudio. Es falta de kilometraje hablando.",
    mechEyebrow: "La solución",
    mechTitle: "One Talky es práctica de habla. Solo eso. Por eso funciona.",
    mechSub: "Videollamada de 30 minutos con un tutor real, de otro país, de principio a fin.",
    mechanism: [
      {
        n: "1",
        title: "Uno a uno, siempre",
        body: "Nada de clases de 12 personas donde hablas 4 minutos. La clase entera es tuya."
      },
      {
        n: "2",
        title: "Tutores ESL de varios países",
        body: "Entrenados para enseñar a estudiantes — ajustan el ritmo, el vocabulario y la paciencia a tu nivel."
      },
      {
        n: "3",
        title: "Bloques de 30 min, en tu horario",
        body: "Agendas cuando puedas. ¿Tienes 30 minutos libres ahora? Entra ahora."
      },
      {
        n: "4",
        title: "Modelo global, precio de gente normal",
        body: "Tutores repartidos por el mundo: una clase particular cuesta una fracción de la escuela tradicional."
      }
    ],
    honesty: ["Y vamos a ser honestos: ", "nadie se vuelve fluido en 15 días.", " La fluidez viene de la repetición. One Talky elimina todos los obstáculos entre tú y la práctica constante — precio, horario, vergüenza y agenda."],
    benEyebrow: "Beneficios",
    benTitle: "Lo que cambia cuando hablas cada semana",
    benefits: [
      {
        title: "Dejas de traducir en tu cabeza",
        body: "Hablando cada semana, el inglés deja de ser traducción y se vuelve reflejo."
      },
      {
        title: "La vergüenza se va antes que el acento",
        body: "Equivocarte frente a un tutor que te corrige con calma es el entrenamiento que ningún salón de clases ofrece."
      },
      {
        title: "Tu agenda manda, no la nuestra",
        body: "Si la semana se complicó, reagendas. Nadie te marca falta."
      },
      {
        title: "Hablas con gente de varios países",
        body: "Eso te prepara para el inglés real del mundo — no el inglés de un audio de examen."
      },
      {
        title: "Llegas a la reunión sin sudar frío",
        body: "Porque ya tuviste esa conversación docenas de veces antes."
      },
      {
        title: "Sirve para toda la familia",
        body: "Adulto, adolescente o niño — el tutor ajusta la clase a la edad y el nivel de cada uno."
      },
      {
        title: "Empiezas hoy",
        body: "Sin matrícula, sin material obligatorio, sin esperar a que abra el próximo grupo."
      }
    ],
    tutEyebrow: "Conoce a tus tutores",
    tutTitle: "Gente real, de varios países, entrenada para escucharte",
    tutSub: "Especialistas en enseñar inglés a quienes no son nativos. Desde cero hasta avanzado — el tutor ajusta el ritmo al tuyo.",
    sealTitle: "Pago seguro vía Stripe",
    sealSub: "Tarjeta de crédito — no guardamos los datos de tu tarjeta.",
    priceEyebrow: "Planes",
    priceTitle: "Elige cuánto quieres hablar cada semana",
    priceSub: "Todas las clases son individuales, por video, de 30 minutos de duración.",
    anchor: ["Una clase particular de inglés cuesta en promedio ", "$25–$40", " por hora. En One Talky, una hora de conversación 1 a 1 empieza en ", "$11,90", "."],
    anchorNote: "Pago seguro vía Stripe · Sin permanencia · Cancela cuando quieras.",
    perWeek: "/semana",
    perMonth: "/mes",
    totalWord: "Total ",
    plans: [
      {
        tag: "Básico",
        name: "60 min / mes",
        weekly: "$2,98",
        monthly: "$11,90",
        features: ["60 minutos de conversación al mes", "2 clases individuales de 30 min", "Agenda libre", "Tutores de todos los niveles"],
        cta: "Empezar con Básico",
        highlight: false,
        badge: ""
      },
      {
        tag: "Standard",
        name: "120 min / mes",
        weekly: "$11,90",
        monthly: "$23,80",
        features: ["120 minutos de conversación al mes", "4 clases de 30 min o 2 clases de 1 hora", "Una conversación por semana: el ritmo mínimo para crear el hábito", "Agenda libre"],
        cta: "Suscribirme a Standard",
        highlight: true,
        badge: "El más elegido"
      },
      {
        tag: "Premium",
        name: "240 min / mes",
        weekly: "$22,60",
        monthly: "$45,20",
        features: ["240 minutos de conversación al mes", "8 clases de 30 min o 4 clases de 1 hora", "Sale por $5,65 por clase", "Práctica 2× por semana: el camino más rápido para destrabarte"],
        cta: "Suscribirme a Premium",
        highlight: false,
        badge: ""
      }
    ],
    guarTitle: "7 días. Sin preguntas.",
    guar: ["Suscríbete, toma tus clases, habla con los tutores. Si en 7 días sientes que One Talky no es para ti, mándanos un mensaje y te devolvemos ", "el 100% de tu dinero", ". Sin formularios, sin justificación."],
    guarBody3: "Si necesitas sacar cuentas para decidir si vale la pena, es porque nosotros no hicimos nuestra parte de quitarte el riesgo.",
    objEyebrow: "Antes de que preguntes",
    objTitle: "Resolviendo las objeciones de frente",
    objections: [
      {
        q: "No tengo tiempo para estudiar cada semana.",
        a: "Nadie lo tiene. Por eso la clase dura 30 minutos, no 2 horas. ¿Se abrió un espacio en tu agenda? Lo reservas. ¿Mala semana? Reagendas."
      },
      {
        q: "¿Y si no entiendo al profesor?",
        a: "Nuestros tutores son especialistas en enseñar inglés a no nativos. Bajan el ritmo, repiten y escriben en el chat hasta que puedas seguirles."
      },
      {
        q: "Un profesor particular es demasiado caro para mí.",
        a: "Lo era. Nuestro modelo es global: tutores en todo el mundo, sin edificio, sin recepción. Una clase de 30 minutos empieza en $11,90."
      },
      {
        q: "¿El pago en el sitio es seguro?",
        a: "Todo pago se procesa directamente por Stripe, una de las plataformas de pago más grandes del mundo. No almacenamos los datos de tu tarjeta."
      },
      {
        q: "¿Y si no funciona para mí?",
        a: "Si te suscribes y no te gusta, tienes 7 días para pedir el 100% de tu dinero de vuelta. Sin formularios, sin justificación."
      }
    ],
    urgBadge: "Edición de fundador",
    urgTitle: "Precio de fundador: los primeros 200.",
    urg: ["One Talky está abriendo ahora. Los primeros 200 suscriptores fijan el precio de lanzamiento ", "para siempre", " — incluso cuando los planes suban."],
    urgSpotsPre: "Quedan",
    urgSpotsPost: "cupos de fundador",
    urgCta: "Asegurar mi precio de fundador",
    faqTitle: "Las preguntas que todos hacen",
    faqs: [
      {
        q: "¿Cuánto tiempo necesito dedicar por semana?",
        a: "30 minutos, una vez por semana, ya crea el hábito. Quien tiene prisa lo hace 3 o 4 veces."
      },
      {
        q: "¿Sirve para principiantes de verdad?",
        a: "Sí. Los tutores llevan la clase con quien sabe poco: ritmo más lento, vocabulario simple, apoyo en el chat."
      },
      {
        q: "¿Y si ya soy avanzado?",
        a: "También sirve — y es donde más ganas. El alumno avanzado normalmente no tiene con quién practicar."
      },
      {
        q: "¿Las clases tienen horario fijo?",
        a: "Agendas cuando quieras, dentro de la disponibilidad de los tutores. Sin horario fijo."
      },
      {
        q: "¿Cómo funciona el pago?",
        a: "Directo por Stripe: tarjeta de crédito. Suscripción mensual, sin permanencia."
      },
      {
        q: "¿Necesito instalar algo?",
        a: "No. La clase sucede en el navegador, desde el celular o la computadora. Solo necesitas internet y audífonos."
      }
    ],
    finTitle: ["Dentro de seis meses, vas a estar ", "hablando", " — o todavía explicando por qué no hablas."],
    finBody: "Nadie se destraba leyendo sobre inglés. Te destrabas hablando, equivocándote y hablando de nuevo — con alguien del otro lado teniendo paciencia contigo. Son 30 minutos. Empieza hoy.",
    finMicro: "Sin permanencia · Pago seguro vía Stripe · Garantía de 7 días",
    psBody: "— No te vamos a prometer fluidez en 15 días, porque eso no existe. Lo que sí prometemos: conversación real con gente real, en tu horario, desde $11,90 por semana.",
    ppsBody: "— Después de suscribirte, tienes 7 días para pedir todo tu dinero de vuelta. La única forma de perder aquí es no intentarlo.",
    weeklySuffix: " por semana",
    noCommitmentBadge: "Registro gratis",
    noCommitmentTitle: "Crea tu cuenta sin pagar nada",
    noCommitmentBody: "Te registras, eliges un tutor y reservas tu primera clase solo cuando quieras. Ningún plan se cobra al registrarte — decides si te suscribes después de probar.",
    noCommitmentCta: "Crear cuenta gratis",
    noCommitmentFooter: "Sin tarjeta de crédito · Sin compromiso · Cancela cuando quieras",
    refundPolicyLabel: "Política de Reembolso",
    footPrivacy: "Política de Privacidad",
    footTerms: "Términos de Uso",
    footSupport: "Soporte",
    footLgpd: "One Talky — conversación en inglés 1 a 1. Pago vía Stripe. Tus datos se tratan conforme a la normativa de protección de datos aplicable."
  },
  fr: {
    navHow: "Comment ça marche",
    navTutors: "Tuteurs",
    navPlans: "Forfaits",
    navGuarantee: "Garantie",
    navLogin: "Connexion",
    navCta: "S'inscrire",
    heroBadge: "Conversation 1 à 1, en direct",
    headline: ["Vous comprenez l'anglais. Vous n'arrivez juste pas à ", "le parler."],
    heroSub1: "Cours de conversation 1 à 1, par vidéo, avec des tuteurs d'anglais du monde entier. 30 minutes à la fois, selon votre emploi du temps. À partir de ",
    heroPrice: "3,73€ par semaine",
    heroSub2: ".",
    heroCta: "Commencer maintenant",
    heroSecondary: "Voir comment ça marche",
    disarm: ["Annulez à tout moment", "Garantie de 7 jours", "Sans engagement"],
    capMain: "“It’s nice to meet you.”",
    capSub: "Ravi de vous rencontrer.",
    bubbleReply: "Salut !",
    fStreakLabel: "Série",
    fStreakVal: "12 jours",
    fPronLabel: "Prononciation",
    fPronVal: "95",
    fSaveLabel: "Nouveau mot",
    fSaveWord: "context",
    heroFactChips: ["Toujours en 1 à 1", "30 minutes à la fois", "Tuteurs de plusieurs pays", "Dès 14,90€/sem"],
    openLead: "Vous avez regardé des séries sans sous-titres. Vous avez lu de l'anglais sans bloquer. Mais quand quelqu'un vous regarde et vous pose une question en anglais, ",
    openAccent: "les mots s'envolent.",
    openBody: "Le problème n'a jamais été vos connaissances. C'était le manque de pratique orale avec un autre être humain. C'est exactement ce que One Talky résout : une vraie conversation, en 1 à 1, avec des tuteurs de plusieurs pays. Vous vous connectez, vous parlez.",
    painEyebrow: "Le problème",
    painTitle: "La conversation bloque toujours au même endroit.",
    pains: ["Vous construisez la phrase entière dans votre tête — et le temps de parler, le sujet a déjà changé.", "Vous comprenez tout ce que dit l'autre, mais vous répondez en trois mots pour ne pas vous tromper.", "Vous évitez les réunions, voyages ou appels en anglais. Il y a toujours un collègue qui « parle mieux ».", "Vous avez payé un cours, terminé le module — et vous n'arrivez toujours pas à engager une conversation.", "Vous connaissez la grammaire mieux que beaucoup de gens à l'aise. Et ça vous agace.", "Vous n'avez pas peur de l'anglais. Vous avez peur de bloquer devant les autres."],
    painClose: "Ce n'est pas un manque d'étude. C'est un manque de kilométrage à l'oral.",
    mechEyebrow: "La solution",
    mechTitle: "One Talky, c'est de la pratique orale. Rien de plus. C'est pour ça que ça marche.",
    mechSub: "Un appel vidéo de 30 minutes avec un vrai tuteur, d'un autre pays, du début à la fin.",
    mechanism: [
      {
        n: "1",
        title: "Toujours en tête-à-tête",
        body: "Pas de classe de 12 personnes où vous parlez 4 minutes. Le cours entier est à vous."
      },
      {
        n: "2",
        title: "Tuteurs ESL de plusieurs pays",
        body: "Formés pour enseigner aux apprenants — ils ajustent le rythme, le vocabulaire et la patience à votre niveau."
      },
      {
        n: "3",
        title: "Créneaux de 30 min, selon votre emploi du temps",
        body: "Vous réservez quand ça vous arrange. 30 minutes de libre là, maintenant ? Connectez-vous."
      },
      {
        n: "4",
        title: "Modèle mondial, prix accessible",
        body: "Des tuteurs répartis dans le monde entier : un cours particulier coûte une fraction d'une école traditionnelle."
      }
    ],
    honesty: ["Et on va être honnêtes : ", "personne ne devient bilingue en 15 jours.", " La fluidité vient de la répétition. One Talky supprime tous les obstacles entre vous et une pratique régulière — le prix, l'horaire, la gêne et l'emploi du temps."],
    benEyebrow: "Avantages",
    benTitle: "Ce qui change quand vous parlez chaque semaine",
    benefits: [
      {
        title: "Vous arrêtez de traduire dans votre tête",
        body: "En parlant chaque semaine, l'anglais cesse d'être une traduction et devient un réflexe."
      },
      {
        title: "La gêne disparaît avant l'accent",
        body: "Se tromper devant un tuteur qui vous corrige avec calme, c'est l'entraînement qu'aucune salle de classe n'offre."
      },
      {
        title: "C'est votre emploi du temps qui décide, pas le nôtre",
        body: "Si votre semaine part en vrille, vous reprogrammez. Personne ne vous compte absent."
      },
      {
        title: "Vous parlez avec des gens de plusieurs pays",
        body: "Cela vous prépare au véritable anglais du monde — pas à celui d'un audio d'examen."
      },
      {
        title: "Vous arrivez en réunion sans stresser",
        body: "Parce que vous avez déjà eu cette conversation des dizaines de fois."
      },
      {
        title: "Adapté à toute la famille",
        body: "Adulte, adolescent ou enfant — le tuteur calibre le cours selon l'âge et le niveau de chacun."
      },
      {
        title: "Vous commencez aujourd'hui",
        body: "Pas d'inscription, pas de matériel obligatoire, pas de classe qui se remplit le semestre prochain."
      }
    ],
    tutEyebrow: "Découvrez vos tuteurs",
    tutTitle: "De vraies personnes, de plusieurs pays, formées pour vous écouter",
    tutSub: "Spécialistes de l'enseignement de l'anglais aux non-natifs. Du débutant à l'avancé — le tuteur adapte le rythme au vôtre.",
    sealTitle: "Paiement sécurisé via Stripe",
    sealSub: "Carte de crédit — nous ne conservons pas les données de votre carte.",
    priceEyebrow: "Forfaits",
    priceTitle: "Choisissez combien vous voulez parler chaque semaine",
    priceSub: "Chaque cours est individuel, par vidéo, d'une durée de 30 minutes.",
    anchor: ["Un cours d'anglais particulier coûte en moyenne ", "25€–40€", " de l'heure. Chez One Talky, une heure de conversation 1 à 1 démarre à ", "14,90€", "."],
    anchorNote: "Paiement sécurisé via Stripe · Sans engagement · Annulez à tout moment.",
    perWeek: "/semaine",
    perMonth: "/mois",
    totalWord: "Total ",
    plans: [
      {
        tag: "Basique",
        name: "60 min / mois",
        weekly: "3,73€",
        monthly: "14,90€",
        features: ["60 minutes de conversation par mois", "2 cours individuels de 30 min", "Réservation libre", "Tuteurs de tous niveaux"],
        cta: "Commencer avec Basique",
        highlight: false,
        badge: ""
      },
      {
        tag: "Standard",
        name: "120 min / mois",
        weekly: "14,90€",
        monthly: "29,80€",
        features: ["120 minutes de conversation par mois", "4 cours de 30 min ou 2 cours d'1 heure", "Une conversation par semaine : le rythme minimum pour créer l'habitude", "Réservation libre"],
        cta: "S'abonner à Standard",
        highlight: true,
        badge: "Le plus choisi"
      },
      {
        tag: "Premium",
        name: "240 min / mois",
        weekly: "28,30€",
        monthly: "56,60€",
        features: ["240 minutes de conversation par mois", "8 cours de 30 min ou 4 cours d'1 heure", "Soit 7,08€ par cours", "Pratique 2×/semaine : le chemin le plus rapide vers l'aisance"],
        cta: "S'abonner à Premium",
        highlight: false,
        badge: ""
      }
    ],
    guarTitle: "7 jours. Sans questions.",
    guar: ["Abonnez-vous, suivez vos cours, parlez aux tuteurs. Si d'ici 7 jours vous pensez que One Talky n'est pas pour vous, envoyez-nous un message et on vous rembourse ", "100% de votre argent", ". Sans formulaire, sans justification."],
    guarBody3: "Si vous devez faire des calculs pour décider si ça en vaut la peine, c'est qu'on n'a pas fait notre part du travail : enlever le risque de votre côté.",
    objEyebrow: "Avant que vous ne demandiez",
    objTitle: "Répondre aux objections directement",
    objections: [
      {
        q: "Je n'ai pas le temps d'étudier chaque semaine.",
        a: "Personne n'a le temps. C'est pour ça que le cours dure 30 minutes, pas 2 heures. Un créneau s'est libéré ? Vous réservez. Mauvaise semaine ? Vous reprogrammez."
      },
      {
        q: "Et si je ne comprends pas le professeur ?",
        a: "Nos tuteurs sont spécialisés dans l'enseignement de l'anglais aux non-natifs. Ils ralentissent, répètent et écrivent dans le chat jusqu'à ce que vous suiviez."
      },
      {
        q: "Un professeur particulier est trop cher pour moi.",
        a: "C'était le cas. Notre modèle est mondial : des tuteurs partout dans le monde, sans bâtiment, sans accueil. Un cours de 30 minutes démarre à 14,90€."
      },
      {
        q: "Le paiement sur le site est-il sécurisé ?",
        a: "Chaque paiement est traité directement par Stripe, l'une des plus grandes plateformes de paiement au monde. Nous ne stockons pas les données de votre carte."
      },
      {
        q: "Et si ça ne marche pas pour moi ?",
        a: "Si vous vous abonnez et que ça ne vous plaît pas, vous avez 7 jours pour demander un remboursement à 100%. Sans formulaire, sans justification."
      }
    ],
    urgBadge: "Lot fondateur",
    urgTitle: "Prix fondateur : les 200 premiers.",
    urg: ["One Talky ouvre en ce moment. Les 200 premiers abonnés bloquent le prix de lancement ", "pour toujours", " — même quand les forfaits augmenteront."],
    urgSpotsPre: "Il reste",
    urgSpotsPost: "places fondateur",
    urgCta: "Garantir mon prix fondateur",
    faqTitle: "Les questions que tout le monde se pose",
    faqs: [
      {
        q: "Combien de temps dois-je consacrer par semaine ?",
        a: "30 minutes, une fois par semaine, ça crée déjà l'habitude. Ceux qui sont pressés le font 3 ou 4 fois."
      },
      {
        q: "Est-ce fait pour les vrais débutants ?",
        a: "Oui. Les tuteurs mènent le cours avec ceux qui savent peu : rythme plus lent, vocabulaire simple, soutien dans le chat."
      },
      {
        q: "Et si je suis déjà avancé ?",
        a: "Ça marche aussi — et c'est là que vous progressez le plus. Un élève avancé n'a généralement personne avec qui pratiquer."
      },
      {
        q: "Les cours ont-ils un horaire fixe ?",
        a: "Vous réservez quand vous voulez, selon la disponibilité des tuteurs. Pas de grille fixe."
      },
      {
        q: "Comment fonctionne le paiement ?",
        a: "Directement via Stripe : carte de crédit. Abonnement mensuel, sans engagement."
      },
      {
        q: "Dois-je installer quelque chose ?",
        a: "Non. Le cours se passe dans le navigateur, sur téléphone ou ordinateur. Il vous faut juste internet et un casque."
      }
    ],
    finTitle: ["Dans six mois, vous serez en train de ", "parler", " — ou encore en train d'expliquer pourquoi vous ne le faites pas."],
    finBody: "Personne ne progresse en lisant sur l'anglais. On progresse en parlant, en se trompant et en reparlant — avec quelqu'un en face qui est patient avec vous. Ce sont 30 minutes. Commencez aujourd'hui.",
    finMicro: "Sans engagement · Paiement sécurisé via Stripe · Garantie de 7 jours",
    psBody: "— On ne va pas vous promettre la fluidité en 15 jours, parce que ça n'existe pas. Ce qu'on promet : une vraie conversation avec de vraies personnes, selon votre horaire, à partir de 14,90€ par semaine.",
    ppsBody: "— Après votre abonnement, vous avez 7 jours pour demander un remboursement complet. La seule façon de perdre ici, c'est de ne pas essayer.",
    weeklySuffix: " par semaine",
    noCommitmentBadge: "Inscription gratuite",
    noCommitmentTitle: "Créez votre compte sans rien payer",
    noCommitmentBody: "Vous vous inscrivez, choisissez un tuteur et réservez votre premier cours seulement quand vous le souhaitez. Aucun forfait n'est facturé à l'inscription — vous décidez de vous abonner après avoir essayé.",
    noCommitmentCta: "Créer un compte gratuit",
    noCommitmentFooter: "Sans carte de crédit · Sans engagement · Annulez à tout moment",
    refundPolicyLabel: "Politique de Remboursement",
    footPrivacy: "Politique de Confidentialité",
    footTerms: "Conditions d'Utilisation",
    footSupport: "Support",
    footLgpd: "One Talky — conversation en anglais 1 à 1. Paiement via Stripe. Vos données sont traitées conformément à la réglementation applicable en matière de protection des données."
  },
  de: {
    navHow: "So funktioniert's",
    navTutors: "Tutoren",
    navPlans: "Pläne",
    navGuarantee: "Garantie",
    navLogin: "Anmelden",
    navCta: "Registrieren",
    heroBadge: "Live 1-zu-1-Konversation",
    headline: ["Sie verstehen Englisch. Sie können es nur nicht ", "sprechen."],
    heroSub1: "1-zu-1-Konversationsunterricht per Video mit Englischtutoren aus aller Welt. 30 Minuten am Stück, zu Ihrer Zeit. Ab ",
    heroPrice: "3,73€ pro Woche",
    heroSub2: ".",
    heroCta: "Jetzt starten",
    heroSecondary: "So funktioniert's ansehen",
    disarm: ["Jederzeit kündbar", "7 Tage Garantie", "Ohne Mindestlaufzeit"],
    capMain: "“It’s nice to meet you.”",
    capSub: "Schön, dich kennenzulernen.",
    bubbleReply: "Hi!",
    fStreakLabel: "Serie",
    fStreakVal: "12 Tage",
    fPronLabel: "Aussprache",
    fPronVal: "95",
    fSaveLabel: "Neues Wort",
    fSaveWord: "context",
    heroFactChips: ["Immer 1-zu-1", "30 Minuten am Stück", "Tutoren aus vielen Ländern", "Ab 14,90€/Woche"],
    openLead: "Sie haben Serien ohne Untertitel gesehen. Sie haben englische Texte gelesen, ohne stecken zu bleiben. Aber wenn Sie jemand ansieht und etwas auf Englisch fragt, ",
    openAccent: "verschwindet der Satz.",
    openBody: "Das Problem war nie Ihr Wissen. Es war der fehlende Sprechübung mit einem anderen Menschen. Genau das löst One Talky: echte 1-zu-1-Konversation mit Tutoren aus vielen Ländern. Sie loggen sich ein, Sie sprechen.",
    painEyebrow: "Das Problem",
    painTitle: "Das Gespräch stockt immer an derselben Stelle.",
    pains: ["Sie bauen den ganzen Satz im Kopf zusammen — und bis Sie sprechen wollten, hat sich das Thema schon geändert.", "Sie verstehen alles, was der andere sagt, antworten aber mit drei Wörtern, um keine Fehler zu machen.", "Sie vermeiden Meetings, Reisen oder Calls auf Englisch. Es gibt immer einen Kollegen, der 'besser spricht'.", "Sie haben für einen Kurs bezahlt, das Modul beendet — und können immer noch kein Gespräch beginnen.", "Sie kennen die Grammatik besser als viele fließend Sprechende. Und das frustriert Sie.", "Sie haben keine Angst vor Englisch. Sie haben Angst, vor anderen stecken zu bleiben."],
    painClose: "Es ist kein Mangel an Lernen. Es ist ein Mangel an Sprechpraxis.",
    mechEyebrow: "Die Lösung",
    mechTitle: "One Talky ist Sprechpraxis. Nur das. Deshalb funktioniert es.",
    mechSub: "Ein 30-minütiger Videoanruf mit einem echten Tutor aus einem anderen Land, von Anfang bis Ende.",
    mechanism: [
      {
        n: "1",
        title: "Immer eins zu eins",
        body: "Keine Klasse mit 12 Leuten, wo Sie 4 Minuten sprechen. Die ganze Stunde gehört Ihnen."
      },
      {
        n: "2",
        title: "ESL-Tutoren aus vielen Ländern",
        body: "Ausgebildet, um Lernende zu unterrichten — sie passen Tempo, Wortschatz und Geduld Ihrem Niveau an."
      },
      {
        n: "3",
        title: "30-Minuten-Blöcke, zu Ihrer Zeit",
        body: "Sie buchen, wenn es passt. Gerade 30 freie Minuten? Steigen Sie jetzt ein."
      },
      {
        n: "4",
        title: "Globales Modell, fairer Preis",
        body: "Tutoren auf der ganzen Welt verteilt: eine Privatstunde kostet einen Bruchteil einer traditionellen Schule."
      }
    ],
    honesty: ["Und wir sind ehrlich: ", "niemand wird in 15 Tagen fließend.", " Sprachgewandtheit kommt durch Wiederholung. One Talky beseitigt jedes Hindernis zwischen Ihnen und regelmäßiger Praxis — Preis, Zeitplan, Scheu und Terminkalender."],
    benEyebrow: "Vorteile",
    benTitle: "Was sich ändert, wenn Sie jede Woche sprechen",
    benefits: [
      {
        title: "Sie hören auf, im Kopf zu übersetzen",
        body: "Wenn Sie jede Woche sprechen, hört Englisch auf, Übersetzung zu sein, und wird zum Reflex."
      },
      {
        title: "Die Scheu verschwindet vor dem Akzent",
        body: "Fehler vor einem Tutor zu machen, der Sie ruhig korrigiert, ist das Training, das kein Klassenzimmer bietet."
      },
      {
        title: "Ihr Zeitplan bestimmt, nicht unserer",
        body: "Wenn Ihre Woche durcheinandergerät, verschieben Sie einfach. Niemand markiert Sie als abwesend."
      },
      {
        title: "Sie sprechen mit Menschen aus vielen Ländern",
        body: "Das bereitet Sie auf das echte Englisch der Welt vor — nicht auf das Englisch einer Prüfungsaufnahme."
      },
      {
        title: "Sie kommen entspannt ins Meeting",
        body: "Weil Sie dieses Gespräch schon Dutzende Male geführt haben."
      },
      {
        title: "Passt für die ganze Familie",
        body: "Erwachsener, Teenager oder Kind — der Tutor passt die Stunde an Alter und Niveau jedes Einzelnen an."
      },
      {
        title: "Sie starten heute",
        body: "Keine Anmeldegebühr, kein Pflichtmaterial, keine Klasse, die im nächsten Semester voll ist."
      }
    ],
    tutEyebrow: "Lernen Sie Ihre Tutoren kennen",
    tutTitle: "Echte Menschen, aus vielen Ländern, geschult, Ihnen zuzuhören",
    tutSub: "Spezialisten im Unterrichten von Englisch für Nicht-Muttersprachler. Von Null bis Fortgeschritten — der Tutor passt das Tempo Ihrem an.",
    sealTitle: "Sichere Zahlung via Stripe",
    sealSub: "Kreditkarte — wir speichern Ihre Kartendaten nicht.",
    priceEyebrow: "Pläne",
    priceTitle: "Wählen Sie, wie viel Sie jede Woche sprechen möchten",
    priceSub: "Jede Stunde ist eins zu eins, per Video, 30 Minuten lang.",
    anchor: ["Eine private Englischstunde kostet im Schnitt ", "25€–40€", " pro Stunde. Bei One Talky startet eine Stunde 1-zu-1-Konversation bei ", "14,90€", "."],
    anchorNote: "Sichere Zahlung via Stripe · Ohne Mindestlaufzeit · Jederzeit kündbar.",
    perWeek: "/Woche",
    perMonth: "/Monat",
    totalWord: "Gesamt ",
    plans: [
      {
        tag: "Basic",
        name: "60 Min / Monat",
        weekly: "3,73€",
        monthly: "14,90€",
        features: ["60 Minuten Konversation pro Monat", "2 Einzelstunden à 30 Min", "Freie Terminwahl", "Tutoren für jedes Niveau"],
        cta: "Mit Basic starten",
        highlight: false,
        badge: ""
      },
      {
        tag: "Standard",
        name: "120 Min / Monat",
        weekly: "14,90€",
        monthly: "29,80€",
        features: ["120 Minuten Konversation pro Monat", "4 Stunden à 30 Min oder 2 Stunden à 1h", "Ein Gespräch pro Woche: das Minimum, um eine Gewohnheit aufzubauen", "Freie Terminwahl"],
        cta: "Standard abonnieren",
        highlight: true,
        badge: "Meistgewählt"
      },
      {
        tag: "Premium",
        name: "240 Min / Monat",
        weekly: "28,30€",
        monthly: "56,60€",
        features: ["240 Minuten Konversation pro Monat", "8 Stunden à 30 Min oder 4 Stunden à 1h", "Entspricht 7,08€ pro Stunde", "2× pro Woche üben: der schnellste Weg zur Sprachgewandtheit"],
        cta: "Premium abonnieren",
        highlight: false,
        badge: ""
      }
    ],
    guarTitle: "7 Tage. Ohne Fragen.",
    guarBody3: "Wenn Sie rechnen müssen, um zu entscheiden, ob es sich lohnt, dann haben wir unseren Teil nicht erfüllt: das Risiko von Ihnen zu nehmen.",
    guar: ["Abonnieren Sie, nehmen Sie Ihre Stunden, sprechen Sie mit den Tutoren. Wenn Sie innerhalb von 7 Tagen finden, dass One Talky nichts für Sie ist, schreiben Sie uns und wir erstatten ", "100% Ihres Geldes", ". Kein Formular, keine Begründung."],
    objEyebrow: "Bevor Sie fragen",
    objTitle: "Einwände direkt angehen",
    objections: [
      {
        q: "Ich habe keine Zeit, jede Woche zu lernen.",
        a: "Niemand hat das. Deshalb dauert die Stunde 30 Minuten, nicht 2 Stunden. Ein freier Slot im Kalender? Sie buchen. Schlechte Woche? Sie verschieben."
      },
      {
        q: "Was, wenn ich den Lehrer nicht verstehe?",
        a: "Unsere Tutoren sind Spezialisten im Unterrichten von Englisch für Nicht-Muttersprachler. Sie verlangsamen, wiederholen und schreiben im Chat, bis Sie folgen können."
      },
      {
        q: "Ein Privatlehrer ist mir zu teuer.",
        a: "War er. Unser Modell ist global: Tutoren weltweit, kein Gebäude, keine Rezeption. Eine 30-Minuten-Stunde startet bei 14,90€."
      },
      {
        q: "Ist die Zahlung auf der Website sicher?",
        a: "Jede Zahlung wird direkt von Stripe verarbeitet, einer der größten Zahlungsplattformen der Welt. Wir speichern Ihre Kartendaten nicht."
      },
      {
        q: "Was, wenn es für mich nicht funktioniert?",
        a: "Wenn Sie abonnieren und es Ihnen nicht gefällt, haben Sie 7 Tage Zeit, 100% Ihres Geldes zurückzufordern. Kein Formular, keine Begründung."
      }
    ],
    urgBadge: "Gründer-Kontingent",
    urgTitle: "Gründerpreis: die ersten 200.",
    urg: ["One Talky öffnet gerade. Die ersten 200 Abonnenten sichern sich den Launch-Preis ", "für immer", " — auch wenn die Preise später steigen."],
    urgSpotsPre: "Nur noch",
    urgSpotsPost: "Gründerplätze übrig",
    urgCta: "Meinen Gründerpreis sichern",
    faqTitle: "Die Fragen, die alle stellen",
    faqs: [
      {
        q: "Wie viel Zeit muss ich pro Woche einplanen?",
        a: "30 Minuten, einmal pro Woche, schaffen schon eine Gewohnheit. Wer es eilig hat, macht es 3 oder 4 Mal."
      },
      {
        q: "Funktioniert es für echte Anfänger?",
        a: "Ja. Die Tutoren führen die Stunde mit Menschen, die wenig wissen: langsameres Tempo, einfacher Wortschatz, Unterstützung im Chat."
      },
      {
        q: "Was, wenn ich schon fortgeschritten bin?",
        a: "Funktioniert auch — und da profitieren Sie am meisten. Fortgeschrittene haben normalerweise niemanden zum Üben."
      },
      {
        q: "Haben die Stunden feste Zeiten?",
        a: "Sie buchen, wann Sie wollen, innerhalb der Verfügbarkeit der Tutoren. Kein fester Stundenplan."
      },
      {
        q: "Wie funktioniert die Zahlung?",
        a: "Direkt über Stripe: Kreditkarte. Monatsabo, ohne Mindestlaufzeit."
      },
      {
        q: "Muss ich etwas installieren?",
        a: "Nein. Die Stunde findet im Browser statt, auf dem Handy oder Computer. Sie brauchen nur Internet und Kopfhörer."
      }
    ],
    finTitle: ["In sechs Monaten werden Sie ", "sprechen", " — oder immer noch erklären, warum nicht."],
    finBody: "Niemand kommt durch das Lesen über Englisch weiter. Man kommt weiter, indem man spricht, Fehler macht und wieder spricht — mit jemandem am anderen Ende, der geduldig mit einem ist. Es sind 30 Minuten. Fangen Sie heute an.",
    finMicro: "Ohne Mindestlaufzeit · Sichere Zahlung via Stripe · 7 Tage Garantie",
    psBody: "— Wir werden Ihnen keine Sprachgewandtheit in 15 Tagen versprechen, denn das gibt es nicht. Was wir versprechen: echte Konversation mit echten Menschen, zu Ihrer Zeit, ab 14,90€ pro Woche.",
    ppsBody: "— Nach dem Abonnieren haben Sie 7 Tage Zeit, Ihr ganzes Geld zurückzufordern. Der einzige Weg, hier zu verlieren, ist es nicht zu versuchen.",
    weeklySuffix: " pro Woche",
    noCommitmentBadge: "Kostenlose Anmeldung",
    noCommitmentTitle: "Erstellen Sie Ihr Konto, ohne etwas zu zahlen",
    noCommitmentBody: "Sie melden sich an, wählen einen Tutor und buchen Ihre erste Stunde nur, wenn Sie möchten. Bei der Anmeldung wird kein Plan abgerechnet — Sie entscheiden nach dem Ausprobieren, ob Sie abonnieren.",
    noCommitmentCta: "Kostenloses Konto erstellen",
    noCommitmentFooter: "Keine Kreditkarte · Keine Verpflichtung · Jederzeit kündbar",
    refundPolicyLabel: "Erstattungsrichtlinie",
    footPrivacy: "Datenschutzrichtlinie",
    footTerms: "Nutzungsbedingungen",
    footSupport: "Support",
    footLgpd: "One Talky — 1-zu-1-Englischkonversation. Zahlung via Stripe. Ihre Daten werden gemäß den geltenden Datenschutzbestimmungen verarbeitet."
  },
  it: {
    navHow: "Come funziona",
    navTutors: "Tutor",
    navPlans: "Piani",
    navGuarantee: "Garanzia",
    navLogin: "Accedi",
    navCta: "Registrati",
    heroBadge: "Conversazione 1 a 1, dal vivo",
    headline: ["Capisci l'inglese. Solo non riesci a ", "parlarlo."],
    heroSub1: "Lezioni di conversazione 1 a 1, in video, con tutor d'inglese da tutto il mondo. 30 minuti alla volta, quando vuoi tu. A partire da ",
    heroPrice: "3,73€ a settimana",
    heroSub2: ".",
    heroCta: "Inizia ora",
    heroSecondary: "Guarda come funziona",
    disarm: ["Annulla quando vuoi", "Garanzia di 7 giorni", "Senza vincoli"],
    capMain: "“It’s nice to meet you.”",
    capSub: "Piacere di conoscerti.",
    bubbleReply: "Ciao!",
    fStreakLabel: "Serie",
    fStreakVal: "12 giorni",
    fPronLabel: "Pronuncia",
    fPronVal: "95",
    fSaveLabel: "Nuova parola",
    fSaveWord: "context",
    heroFactChips: ["Sempre 1 a 1", "30 minuti alla volta", "Tutor da vari paesi", "Da 14,90€/sett"],
    openLead: "Hai visto serie senza sottotitoli. Hai letto testi in inglese senza bloccarti. Ma quando qualcuno ti guarda e ti chiede qualcosa in inglese, ",
    openAccent: "la frase svanisce.",
    openBody: "Il problema non è mai stata la tua conoscenza. Era la mancanza di pratica orale con un'altra persona. È esattamente questo che risolve One Talky: conversazione reale, 1 a 1, con tutor da vari paesi. Ti colleghi, parli.",
    painEyebrow: "Il problema",
    painTitle: "La conversazione si blocca sempre nello stesso punto.",
    pains: ["Costruisci l'intera frase nella testa — e quando stavi per parlare, l'argomento è già cambiato.", "Capisci tutto quello che dice l'altro, ma rispondi con tre parole per non sbagliare.", "Eviti riunioni, viaggi o chiamate in inglese. C'è sempre un collega che 'parla meglio'.", "Hai pagato un corso, finito il modulo — e ancora non riesci a iniziare una conversazione.", "Conosci la grammatica meglio di molte persone fluenti. E questo ti irrita.", "Non hai paura dell'inglese. Hai paura di bloccarti davanti agli altri."],
    painClose: "Non è mancanza di studio. È mancanza di chilometraggio parlando.",
    mechEyebrow: "La soluzione",
    mechTitle: "One Talky è pratica orale. Solo questo. Per questo funziona.",
    mechSub: "Una videochiamata di 30 minuti con un tutor vero, da un altro paese, dall'inizio alla fine.",
    mechanism: [
      {
        n: "1",
        title: "Uno a uno, sempre",
        body: "Niente classi da 12 persone dove parli 4 minuti. La lezione intera è tua."
      },
      {
        n: "2",
        title: "Tutor ESL da vari paesi",
        body: "Formati per insegnare a chi impara — adattano il ritmo, il vocabolario e la pazienza al tuo livello."
      },
      {
        n: "3",
        title: "Blocchi da 30 min, quando vuoi tu",
        body: "Prenoti quando ti va bene. Hai 30 minuti liberi adesso? Entra subito."
      },
      {
        n: "4",
        title: "Modello globale, prezzo per tutti",
        body: "Tutor sparsi in tutto il mondo: una lezione privata costa una frazione di una scuola tradizionale."
      }
    ],
    honesty: ["E saremo onesti: ", "nessuno diventa fluente in 15 giorni.", " La fluidità viene dalla ripetizione. One Talky rimuove ogni ostacolo tra te e la pratica costante — prezzo, orario, imbarazzo e agenda."],
    benEyebrow: "Vantaggi",
    benTitle: "Cosa cambia quando parli ogni settimana",
    benefits: [
      {
        title: "Smetti di tradurre nella testa",
        body: "Parlando ogni settimana, l'inglese smette di essere traduzione e diventa riflesso."
      },
      {
        title: "L'imbarazzo se ne va prima dell'accento",
        body: "Sbagliare davanti a un tutor che ti corregge con calma è l'allenamento che nessuna aula offre."
      },
      {
        title: "Comanda la tua agenda, non la nostra",
        body: "Se la settimana si complica, riprogrammi. Nessuno ti segna assente."
      },
      {
        title: "Parli con persone di vari paesi",
        body: "Questo ti prepara all'inglese reale del mondo — non all'inglese di un audio d'esame."
      },
      {
        title: "Arrivi alla riunione senza sudare freddo",
        body: "Perché hai già avuto quella conversazione decine di volte prima."
      },
      {
        title: "Va bene per tutta la famiglia",
        body: "Adulto, adolescente o bambino — il tutor calibra la lezione all'età e al livello di ciascuno."
      },
      {
        title: "Inizi oggi",
        body: "Senza iscrizione, senza materiale obbligatorio, senza classe che si riempie il prossimo semestre."
      }
    ],
    tutEyebrow: "Conosci i tuoi tutor",
    tutTitle: "Persone vere, da vari paesi, formate per ascoltarti",
    tutSub: "Specialisti nell'insegnare inglese a chi non è madrelingua. Da zero ad avanzato — il tutor adatta il ritmo al tuo.",
    sealTitle: "Pagamento sicuro via Stripe",
    sealSub: "Carta di credito — non conserviamo i dati della tua carta.",
    priceEyebrow: "Piani",
    priceTitle: "Scegli quanto vuoi parlare ogni settimana",
    priceSub: "Ogni lezione è individuale, in video, della durata di 30 minuti.",
    anchor: ["Una lezione privata d'inglese costa in media ", "25€–40€", " all'ora. Su One Talky, un'ora di conversazione 1 a 1 parte da ", "14,90€", "."],
    anchorNote: "Pagamento sicuro via Stripe · Senza vincoli · Annulla quando vuoi.",
    perWeek: "/settimana",
    perMonth: "/mese",
    totalWord: "Totale ",
    plans: [
      {
        tag: "Base",
        name: "60 min / mese",
        weekly: "3,73€",
        monthly: "14,90€",
        features: ["60 minuti di conversazione al mese", "2 lezioni individuali da 30 min", "Prenotazione libera", "Tutor per ogni livello"],
        cta: "Inizia con Base",
        highlight: false,
        badge: ""
      },
      {
        tag: "Standard",
        name: "120 min / mese",
        weekly: "14,90€",
        monthly: "29,80€",
        features: ["120 minuti di conversazione al mese", "4 lezioni da 30 min o 2 lezioni da 1 ora", "Una conversazione a settimana: il ritmo minimo per creare l'abitudine", "Prenotazione libera"],
        cta: "Abbonati a Standard",
        highlight: true,
        badge: "Il più scelto"
      },
      {
        tag: "Premium",
        name: "240 min / mese",
        weekly: "28,30€",
        monthly: "56,60€",
        features: ["240 minuti di conversazione al mese", "8 lezioni da 30 min o 4 lezioni da 1 ora", "Corrisponde a 7,08€ a lezione", "Pratica 2×/settimana: la strada più veloce per sbloccarti"],
        cta: "Abbonati a Premium",
        highlight: false,
        badge: ""
      }
    ],
    guarTitle: "7 giorni. Senza domande.",
    guar: ["Abbonati, fai le tue lezioni, parla con i tutor. Se entro 7 giorni pensi che One Talky non fa per te, mandaci un messaggio e ti rimborsiamo ", "il 100% dei tuoi soldi", ". Senza moduli, senza giustificazioni."],
    guarBody3: "Se devi fare i conti per decidere se ne vale la pena, è perché non abbiamo fatto la nostra parte: toglierti il rischio.",
    objEyebrow: "Prima che tu chieda",
    objTitle: "Affrontiamo le obiezioni direttamente",
    objections: [
      {
        q: "Non ho tempo per studiare ogni settimana.",
        a: "Nessuno ce l'ha. Per questo la lezione dura 30 minuti, non 2 ore. Si è liberato uno slot in agenda? Prenoti. Settimana no? Riprogrammi."
      },
      {
        q: "E se non capisco l'insegnante?",
        a: "I nostri tutor sono specialisti nell'insegnare inglese a chi non è madrelingua. Rallentano, ripetono e scrivono in chat finché non riesci a seguire."
      },
      {
        q: "Un insegnante privato è troppo caro per me.",
        a: "Lo era. Il nostro modello è globale: tutor in tutto il mondo, senza sede, senza reception. Una lezione da 30 minuti parte da 14,90€."
      },
      {
        q: "Il pagamento sul sito è sicuro?",
        a: "Ogni pagamento è elaborato direttamente da Stripe, una delle piattaforme di pagamento più grandi al mondo. Non conserviamo i dati della tua carta."
      },
      {
        q: "E se non funziona per me?",
        a: "Se ti abboni e non ti piace, hai 7 giorni per chiedere il rimborso del 100%. Senza moduli, senza giustificazioni."
      }
    ],
    urgBadge: "Edizione da fondatore",
    urgTitle: "Prezzo da fondatore: i primi 200.",
    urg: ["One Talky sta aprendo ora. I primi 200 abbonati bloccano il prezzo di lancio ", "per sempre", " — anche quando i piani aumenteranno."],
    urgSpotsPre: "Restano",
    urgSpotsPost: "posti fondatori",
    urgCta: "Blocca il mio prezzo da fondatore",
    faqTitle: "Le domande che fanno tutti",
    faqs: [
      {
        q: "Quanto tempo devo dedicare a settimana?",
        a: "30 minuti, una volta a settimana, crea già l'abitudine. Chi ha fretta lo fa 3 o 4 volte."
      },
      {
        q: "Funziona per chi è davvero principiante?",
        a: "Sì. I tutor conducono la lezione con chi sa poco: ritmo più lento, vocabolario semplice, supporto in chat."
      },
      {
        q: "E se sono già avanzato?",
        a: "Funziona anche per te — ed è dove guadagni di più. Uno studente avanzato di solito non ha con chi esercitarsi."
      },
      {
        q: "Le lezioni hanno un orario fisso?",
        a: "Prenoti quando vuoi, secondo la disponibilità dei tutor. Nessun orario fisso."
      },
      {
        q: "Come funziona il pagamento?",
        a: "Direttamente tramite Stripe: carta di credito. Abbonamento mensile, senza vincoli."
      },
      {
        q: "Devo installare qualcosa?",
        a: "No. La lezione avviene nel browser, da cellulare o computer. Ti servono solo internet e cuffie."
      }
    ],
    finTitle: ["Tra sei mesi, sarai a ", "parlare", " — o starai ancora spiegando perché non lo fai."],
    finBody: "Nessuno si sblocca leggendo sull'inglese. Ci si sblocca parlando, sbagliando e parlando ancora — con qualcuno dall'altra parte che ha pazienza con te. Sono 30 minuti. Inizia oggi.",
    finMicro: "Senza vincoli · Pagamento sicuro via Stripe · Garanzia di 7 giorni",
    psBody: "— Non ti prometteremo la fluidità in 15 giorni, perché non esiste. Quello che promettiamo: conversazione reale con persone reali, quando vuoi tu, a partire da 14,90€ a settimana.",
    ppsBody: "— Dopo l'abbonamento, hai 7 giorni per chiedere il rimborso completo. L'unico modo di perdere qui è non provarci.",
    weeklySuffix: " a settimana",
    noCommitmentBadge: "Registrazione gratuita",
    noCommitmentTitle: "Crea il tuo account senza pagare nulla",
    noCommitmentBody: "Ti registri, scegli un tutor e prenoti la tua prima lezione solo quando vuoi. Nessun piano viene addebitato alla registrazione — decidi se abbonarti dopo aver provato.",
    noCommitmentCta: "Crea un account gratuito",
    noCommitmentFooter: "Nessuna carta di credito · Nessun vincolo · Annulla quando vuoi",
    refundPolicyLabel: "Politica di Rimborso",
    footPrivacy: "Informativa sulla Privacy",
    footTerms: "Termini di Utilizzo",
    footSupport: "Assistenza",
    footLgpd: "One Talky — conversazione in inglese 1 a 1. Pagamento via Stripe. I tuoi dati sono trattati in conformità con le normative applicabili sulla protezione dei dati."
  },
  ja: {
    navHow: "使い方",
    navTutors: "講師",
    navPlans: "プラン",
    navGuarantee: "保証",
    navLogin: "ログイン",
    navCta: "登録する",
    heroBadge: "ライブ1対1レッスン",
    headline: ["英語は理解できる。ただ、", "話せないだけ。"],
    heroSub1: "世界中の英語講師とのビデオによる1対1会話レッスン。1回30分、あなたの好きな時間に。月額は",
    heroPrice: "週498円",
    heroSub2: "から。",
    heroCta: "今すぐ始める",
    heroSecondary: "使い方を見る",
    disarm: ["いつでも解約可能", "7日間返金保証", "契約の縛りなし"],
    capMain: "“It’s nice to meet you.”",
    capSub: "はじめまして。",
    bubbleReply: "こんにちは！",
    fStreakLabel: "連続日数",
    fStreakVal: "12日",
    fPronLabel: "発音",
    fPronVal: "95",
    fSaveLabel: "新しい単語",
    fSaveWord: "context",
    heroFactChips: ["常に1対1", "1回30分", "世界各国の講師", "週1,990円から"],
    openLead: "字幕なしでドラマを見たことがある。英語の文章もつっかえずに読める。でも誰かに英語で話しかけられると、",
    openAccent: "言葉が出てこない。",
    openBody: "問題はあなたの知識ではありませんでした。誰かと実際に話す練習が足りなかっただけです。One Talkyが解決するのはまさにそこ：世界各国の講師との本物の1対1会話。ログインして、話すだけ。",
    painEyebrow: "よくある悩み",
    painTitle: "会話はいつも同じところで止まってしまう。",
    pains: ["頭の中で文章を組み立てているうちに、話す前に話題が変わってしまう。", "相手の言うことは全部わかるのに、間違えたくなくて短い返事しかできない。", "英語での会議や旅行、通話を避けてしまう。いつも「英語が得意な同僚」に頼ってしまう。", "コースにお金を払い、教材も終えたのに、まだ会話を切り出せない。", "文法は流暢な人より詳しいのに、それがかえって悔しい。", "英語自体が怖いのではなく、人前でつまずくのが怖い。"],
    painClose: "勉強不足なのではありません。話した経験が足りないだけです。",
    mechEyebrow: "解決策",
    mechTitle: "One Talkyはスピーキングの練習の場。それだけです。だから効果があります。",
    mechSub: "他の国にいる本物の講師との、最初から最後まで30分のビデオ通話。",
    mechanism: [
    {
      n: "1",
      title: "常に1対1",
      body: "12人クラスで4分しか話せない、なんてことはありません。レッスン時間はすべてあなたのもの。"
    },
    {
      n: "2",
      title: "世界各国のESL講師",
      body: "学習者を教えるための訓練を受けています — ペース、語彙、忍耐強さをあなたのレベルに合わせます。"
    },
    {
      n: "3",
      title: "30分単位、あなたの都合で",
      body: "都合の良い時に予約するだけ。今30分空いていますか？今すぐ入室できます。"
    },
    {
      n: "4",
      title: "グローバルなモデル、手頃な価格",
      body: "世界中に講師がいるので、個人レッスンでも従来の語学学校の何分の一かの価格で受けられます。"
    }
  ],
    honesty: ["正直にお伝えします：", "15日で流暢になる人はいません。", " 流暢さは繰り返しから生まれます。One Talkyがすることは、あなたと継続的な練習の間にあるすべての障害 — 価格、時間、恥ずかしさ、スケジュール — を取り除くことです。"],
    benEyebrow: "メリット",
    benTitle: "毎週話すことで変わること",
    benefits: [
    {
      title: "頭の中で翻訳しなくなる",
      body: "毎週話すことで、英語は翻訳ではなく反射的なものに変わっていきます。"
    },
    {
      title: "訛りより先に恥ずかしさが消える",
      body: "穏やかに訂正してくれる講師の前で間違えることは、どんな教室でも得られない訓練です。"
    },
    {
      title: "決めるのはこちらのスケジュール",
      body: "週の予定がぐちゃぐちゃになっても、予約を変更すればいいだけ。誰も欠席扱いにしません。"
    },
    {
      title: "世界各国の人と話せる",
      body: "それが試験用音声の英語ではなく、世界の本物の英語への備えになります。"
    },
    {
      title: "冷や汗をかかずに会議に臨める",
      body: "その会話をすでに何十回も経験しているからです。"
    },
    {
      title: "家族みんなに使える",
      body: "大人、10代、子ども — 講師が年齢とレベルに合わせてレッスンを調整します。"
    },
    {
      title: "今日から始められる",
      body: "入会金も、必須教材も、次学期を待つ必要もありません。"
    }
  ],
    tutEyebrow: "講師を紹介します",
    tutTitle: "世界各国の、あなたの話に耳を傾けるよう訓練された、本物の講師たち",
    tutSub: "非ネイティブスピーカーに英語を教える専門家。初心者から上級者まで — 講師があなたのペースに合わせます。",
    sealTitle: "Stripeによる安全な決済",
    sealSub: "クレジットカード — カード情報は保存されません。",
    priceEyebrow: "プラン",
    priceTitle: "毎週どれくらい話したいか選んでください",
    priceSub: "すべてのレッスンは1対1、ビデオ通話で30分間です。",
    anchor: ["日本での個人英会話レッスンは平均して1時間あたり", "3,000円〜6,000円", "かかります。One Talkyなら、1時間の1対1会話が", "1,990円", "から始められます。"],
    anchorNote: "Stripeによる安全な決済 · 契約の縛りなし · いつでも解約可能。",
    perWeek: "/週",
    perMonth: "/月",
    totalWord: "合計",
    plans: [
    {
      tag: "ベーシック",
      name: "60分／月",
      weekly: "498円",
      monthly: "1,990円",
      features: ["月60分の会話", "30分の個人レッスン2回", "自由な予約", "全レベルの講師に対応"],
      cta: "ベーシックで始める",
      highlight: false,
      badge: ""
    },
    {
      tag: "スタンダード",
      name: "120分／月",
      weekly: "1,990円",
      monthly: "3,980円",
      features: ["月120分の会話", "30分レッスン4回または1時間レッスン2回", "週1回の会話：習慣化に必要な最低ライン", "自由な予約"],
      cta: "スタンダードに登録",
      highlight: true,
      badge: "一番人気"
    },
    {
      tag: "プレミアム",
      name: "240分／月",
      weekly: "3,780円",
      monthly: "7,560円",
      features: ["月240分の会話", "30分レッスン8回または1時間レッスン4回", "1レッスンあたり945円", "週2回の練習：最速で上達する道"],
      cta: "プレミアムに登録",
      highlight: false,
      badge: ""
    }
  ],
    guarTitle: "7日間。質問なし。",
    guar: ["登録して、レッスンを受けて、講師と話してみてください。7日以内にOne Talkyが自分に合わないと感じたら、メッセージを送るだけで", "全額返金", "します。フォームも理由の説明も不要です。"],
    guarBody3: "価値があるかどうか計算しないと決められないとしたら、それは私たちがリスクを取り除くという役目を果たせていない証拠です。",
    objEyebrow: "よくある疑問に先にお答えします",
    objTitle: "気になる点に正面からお答えします",
    objections: [
    {
      q: "毎週勉強する時間がありません。",
      a: "誰にでも時間はありません。だからレッスンは2時間ではなく30分なのです。予定に空きができたら予約する。調子が悪い週は予約を変更する。それだけです。"
    },
    {
      q: "先生の言うことが理解できなかったら？",
      a: "私たちの講師は非ネイティブに英語を教える専門家です。ゆっくり話し、繰り返し、チャットに書き込みながら、あなたが理解できるまで調整します。"
    },
    {
      q: "個人レッスンは私には高すぎます。",
      a: "以前はそうでした。私たちのモデルはグローバル：世界中に講師がいて、建物も受付もありません。30分レッスンは1,990円から。"
    },
    {
      q: "サイトでの支払いは安全ですか？",
      a: "すべての決済は世界最大級の決済プラットフォームの一つであるStripeが直接処理します。カード情報は保存されません。"
    },
    {
      q: "自分に合わなかったら？",
      a: "登録して気に入らなければ、7日以内に全額返金を申請できます。フォームも理由の説明も不要です。"
    }
  ],
    urgBadge: "先行登録枠",
    urgTitle: "先行登録価格：最初の200名様限定。",
    urg: ["One Talkyは今まさに開設したばかりです。最初の200名の登録者は、プランの価格が今後上がっても、この価格を", "永久に", "固定できます。"],
    urgSpotsPre: "残り",
    urgSpotsPost: "枠",
    urgCta: "この先行登録価格を確保する",
    faqTitle: "みんなが聞く質問",
    faqs: [
    {
      q: "毎週どれくらい時間が必要ですか？",
      a: "週1回、30分だけでも習慣になります。急いでいる方は週に3〜4回行っています。"
    },
    {
      q: "本当の初心者でも大丈夫ですか？",
      a: "大丈夫です。講師は初心者にはゆっくりしたペース、簡単な語彙、チャットでのサポートでレッスンを進めます。"
    },
    {
      q: "すでに上級者だったら？",
      a: "上級者にも効果的です — 実はそこが一番伸びるところです。上級者は普段、練習相手がいないことが多いのです。"
    },
    {
      q: "レッスンの時間は決まっていますか？",
      a: "講師の空き状況の範囲内で、好きな時に予約できます。固定の時間割はありません。"
    },
    {
      q: "支払いはどのように行われますか？",
      a: "Stripeを通じて直接：クレジットカード払い。月額サブスクリプションで、契約の縛りはありません。"
    },
    {
      q: "何かインストールする必要がありますか？",
      a: "いいえ。レッスンはブラウザ上で、スマートフォンでもパソコンでも行えます。必要なのはインターネットとヘッドホンだけです。"
    }
  ],
    finTitle: ["6ヶ月後、あなたは", "話しているでしょう", " — それとも、まだ話せない理由を説明しているでしょうか。"],
    finBody: "英語について読むだけで話せるようになる人はいません。話して、間違えて、また話す — そばで辛抱強く待ってくれる相手がいて、初めて上達します。たった30分です。今日から始めましょう。",
    finMicro: "契約の縛りなし · Stripeによる安全な決済 · 7日間返金保証",
    psBody: "— 15日で流暢になるとは約束しません。そんなものは存在しないからです。私たちが約束するのは：本物の人との本物の会話を、あなたの都合で、週1,990円から。",
    ppsBody: "— 登録後7日以内なら、全額返金を申請できます。ここで損をする唯一の方法は、試さないことです。",
    weeklySuffix: "／週",
    noCommitmentBadge: "無料登録",
    noCommitmentTitle: "お支払いなしでアカウントを作成",
    noCommitmentBody: "登録して講師を選び、最初のレッスンはご自身のタイミングで予約するだけ。登録時にプラン料金は発生しません — 試してから購読するかどうかを決められます。",
    noCommitmentCta: "無料アカウントを作成する",
    noCommitmentFooter: "クレジットカード不要 · 契約の縛りなし · いつでも解約可能",
    refundPolicyLabel: "返金ポリシー",
    footPrivacy: "プライバシーポリシー",
    footTerms: "利用規約",
    footSupport: "サポート",
    footLgpd: "One Talky — 1対1の英会話。Stripeによる決済。お客様のデータは適用されるデータ保護規則に従って取り扱われます。",
  },
  ko: {
    navHow: "이용 방법",
    navTutors: "튜터",
    navPlans: "요금제",
    navGuarantee: "보증",
    navLogin: "로그인",
    navCta: "가입하기",
    heroBadge: "실시간 1:1 대화",
    headline: ["영어를 이해는 하는데, ", "말이 안 나오시나요?"],
    heroSub1: "전 세계 영어 튜터와의 화상 1:1 회화 수업. 한 번에 30분씩, 원하는 시간에. 시작가 ",
    heroPrice: "주 4,975원",
    heroSub2: "부터.",
    heroCta: "지금 시작하기",
    heroSecondary: "이용 방법 보기",
    disarm: ["언제든지 취소 가능", "7일 환불 보증", "약정 없음"],
    capMain: "“It’s nice to meet you.”",
    capSub: "만나서 반가워요.",
    bubbleReply: "안녕하세요!",
    fStreakLabel: "연속 학습",
    fStreakVal: "12일",
    fPronLabel: "발음",
    fPronVal: "95",
    fSaveLabel: "새 단어",
    fSaveWord: "context",
    heroFactChips: ["항상 1:1", "한 번에 30분", "여러 나라의 튜터", "주 19,900원부터"],
    openLead: "자막 없이 드라마도 봤고, 영어 글도 막힘없이 읽었어요. 하지만 누군가 눈을 마주치고 영어로 물어보면 ",
    openAccent: "말이 사라져 버립니다.",
    openBody: "문제는 지식이 아니었습니다. 다른 사람과 직접 말해보는 연습이 부족했던 것뿐입니다. One Talky가 해결하는 것이 바로 그 부분입니다: 여러 나라의 튜터와 나누는 진짜 1:1 대화. 접속해서, 말하기만 하면 됩니다.",
    painEyebrow: "고민",
    painTitle: "대화는 항상 같은 지점에서 막힙니다.",
    pains: ["머릿속으로 문장을 완성하는 사이, 말할 타이밍에는 이미 주제가 바뀌어 있습니다.", "상대방이 하는 말은 다 이해하지만, 틀릴까 봐 세 단어로만 대답합니다.", "영어로 하는 회의, 여행, 통화를 피합니다. 항상 '영어 잘하는' 동료가 있으니까요.", "강좌를 결제하고 과정을 끝냈는데도, 여전히 대화를 시작하지 못합니다.", "웬만한 유창한 사람보다 문법을 더 잘 알지만, 그게 오히려 답답합니다.", "영어 자체가 무서운 게 아니라, 다른 사람 앞에서 막히는 게 무섭습니다."],
    painClose: "공부가 부족한 게 아닙니다. 말해본 경험이 부족한 것입니다.",
    mechEyebrow: "해결책",
    mechTitle: "One Talky는 말하기 연습입니다. 그게 전부입니다. 그래서 효과가 있습니다.",
    mechSub: "다른 나라에 있는 진짜 튜터와 처음부터 끝까지 진행하는 30분 화상 통화.",
    mechanism: [
    {
      n: "1",
      title: "항상 일대일",
      body: "12명이 듣는 수업에서 4분만 말하는 일은 없습니다. 수업 시간 전체가 당신의 것입니다."
    },
    {
      n: "2",
      title: "여러 나라 출신의 ESL 튜터",
      body: "학습자를 가르치도록 훈련받았습니다 — 속도, 어휘, 인내심을 당신의 레벨에 맞춥니다."
    },
    {
      n: "3",
      title: "30분 단위, 원하는 시간에",
      body: "편할 때 예약하세요. 지금 30분이 비나요? 바로 입장하세요."
    },
    {
      n: "4",
      title: "글로벌 모델, 합리적인 가격",
      body: "전 세계에 퍼져 있는 튜터들 덕분에, 개인 레슨이 전통적인 학원 비용의 일부밖에 들지 않습니다."
    }
  ],
    honesty: ["솔직하게 말씀드릴게요: ", "15일 만에 유창해지는 사람은 없습니다.", " 유창함은 반복에서 나옵니다. One Talky가 하는 일은 당신과 꾸준한 연습 사이에 있는 모든 장애물 — 가격, 시간, 부끄러움, 일정 — 을 없애는 것입니다."],
    benEyebrow: "장점",
    benTitle: "매주 말하기 시작하면 달라지는 것",
    benefits: [
    {
      title: "머릿속 번역이 사라집니다",
      body: "매주 말하다 보면, 영어는 번역이 아니라 반사적으로 나오게 됩니다."
    },
    {
      title: "억양보다 부끄러움이 먼저 사라집니다",
      body: "차분하게 고쳐주는 튜터 앞에서 실수하는 것, 그것이 어떤 교실에서도 얻을 수 없는 훈련입니다."
    },
    {
      title: "일정은 저희가 아니라 당신이 정합니다",
      body: "한 주가 정신없이 지나가도 일정을 바꾸면 됩니다. 아무도 결석 처리하지 않습니다."
    },
    {
      title: "여러 나라 사람들과 대화합니다",
      body: "그것이 시험 음성 속 영어가 아닌, 세상의 진짜 영어를 준비시켜 줍니다."
    },
    {
      title: "식은땀 없이 회의에 들어갑니다",
      body: "그 대화를 이미 수십 번 해봤기 때문입니다."
    },
    {
      title: "온 가족이 사용할 수 있습니다",
      body: "성인, 청소년, 어린이 — 튜터가 각자의 나이와 레벨에 맞춰 수업을 조정합니다."
    },
    {
      title: "오늘 바로 시작할 수 있습니다",
      body: "등록비도, 필수 교재도, 다음 학기를 기다릴 필요도 없습니다."
    }
  ],
    tutEyebrow: "튜터를 소개합니다",
    tutTitle: "여러 나라 출신의, 당신의 이야기를 듣도록 훈련된 진짜 사람들",
    tutSub: "비원어민에게 영어를 가르치는 전문가들. 초급부터 고급까지 — 튜터가 당신의 속도에 맞춥니다.",
    sealTitle: "Stripe를 통한 안전한 결제",
    sealSub: "신용카드 — 카드 정보는 저장하지 않습니다.",
    priceEyebrow: "요금제",
    priceTitle: "매주 얼마나 이야기하고 싶은지 선택하세요",
    priceSub: "모든 수업은 화상으로 진행되는 30분짜리 1:1 수업입니다.",
    anchor: ["개인 영어 과외는 평균적으로 시간당 ", "30,000원~60,000원", " 정도입니다. One Talky에서는 1시간의 1:1 대화가 ", "19,900원", "부터 시작됩니다."],
    anchorNote: "Stripe를 통한 안전한 결제 · 약정 없음 · 언제든지 취소 가능.",
    perWeek: "/주",
    perMonth: "/월",
    totalWord: "합계",
    plans: [
    {
      tag: "베이직",
      name: "월 60분",
      weekly: "4,975원",
      monthly: "19,900원",
      features: ["월 60분의 대화", "30분 개인 레슨 2회", "자유로운 예약", "모든 레벨의 튜터 이용 가능"],
      cta: "베이직으로 시작",
      highlight: false,
      badge: ""
    },
    {
      tag: "스탠다드",
      name: "월 120분",
      weekly: "19,900원",
      monthly: "39,800원",
      features: ["월 120분의 대화", "30분 레슨 4회 또는 1시간 레슨 2회", "주 1회 대화: 습관을 만드는 최소한의 빈도", "자유로운 예약"],
      cta: "스탠다드 구독하기",
      highlight: true,
      badge: "가장 많이 선택"
    },
    {
      tag: "프리미엄",
      name: "월 240분",
      weekly: "37,800원",
      monthly: "75,600원",
      features: ["월 240분의 대화", "30분 레슨 8회 또는 1시간 레슨 4회", "레슨당 9,450원", "주 2회 연습: 가장 빠르게 실력이 느는 방법"],
      cta: "프리미엄 구독하기",
      highlight: false,
      badge: ""
    }
  ],
    guarTitle: "7일. 질문 없이.",
    guarBody3: "가치가 있는지 계산기를 두드려야 결정할 수 있다면, 그건 저희가 리스크를 없애는 역할을 제대로 하지 못했다는 뜻입니다.",
    guar: ["구독하고, 수업을 듣고, 튜터와 대화해 보세요. 7일 이내에 One Talky가 나와 맞지 않는다고 느끼신다면, 메시지만 보내주시면 ", "100% 환불", "해 드립니다. 양식도, 사유 설명도 필요 없습니다."],
    objEyebrow: "질문하시기 전에",
    objTitle: "궁금한 점을 바로 답해드립니다",
    objections: [
    {
      q: "매주 공부할 시간이 없어요.",
      a: "아무도 시간이 넉넉하지 않습니다. 그래서 수업이 2시간이 아니라 30분인 것입니다. 일정에 틈이 생기면 예약하세요. 힘든 한 주였다면 일정을 바꾸면 됩니다."
    },
    {
      q: "선생님 말을 이해 못 하면 어떡하죠?",
      a: "저희 튜터는 비원어민에게 영어를 가르치는 전문가입니다. 천천히 말하고, 반복하고, 채팅에 적어가며 당신이 따라올 때까지 맞춰줍니다."
    },
    {
      q: "개인 과외는 저에게 너무 비싸요.",
      a: "예전에는 그랬죠. 저희 모델은 글로벌합니다: 전 세계에 튜터가 있고, 건물도 접수처도 없습니다. 30분 수업이 19,900원부터 시작됩니다."
    },
    {
      q: "사이트 결제는 안전한가요?",
      a: "모든 결제는 세계 최대 결제 플랫폼 중 하나인 Stripe가 직접 처리합니다. 카드 정보는 저장하지 않습니다."
    },
    {
      q: "저에게 안 맞으면 어떡하죠?",
      a: "구독했는데 마음에 안 드시면, 7일 이내에 100% 환불을 요청할 수 있습니다. 양식도, 사유 설명도 필요 없습니다."
    }
  ],
    urgBadge: "창립 회원 한정",
    urgTitle: "창립 회원 가격: 선착순 200명.",
    urg: ["One Talky가 지금 막 오픈했습니다. 첫 200명의 구독자는 이후 요금제 가격이 오르더라도 ", "영원히", " 오픈 가격을 유지합니다."],
    urgSpotsPre: "남은 자리",
    urgSpotsPost: "명",
    urgCta: "창립 회원 가격 확보하기",
    faqTitle: "모두가 궁금해하는 질문",
    faqs: [
    {
      q: "매주 얼마나 시간을 내야 하나요?",
      a: "주 1회, 30분이면 습관이 만들어집니다. 서두르는 분들은 주 3~4회 진행합니다."
    },
    {
      q: "진짜 초보자도 괜찮나요?",
      a: "네, 괜찮습니다. 튜터가 기초가 부족한 분들에게는 천천히, 쉬운 어휘로, 채팅 지원까지 곁들여 수업을 진행합니다."
    },
    {
      q: "이미 고급 레벨이라면요?",
      a: "고급 레벨에도 효과적입니다 — 오히려 가장 많이 얻어가는 구간입니다. 고급 학습자는 보통 연습할 상대가 없기 때문입니다."
    },
    {
      q: "수업 시간이 고정되어 있나요?",
      a: "튜터의 가능 시간 내에서 원하는 때에 예약할 수 있습니다. 고정된 시간표는 없습니다."
    },
    {
      q: "결제는 어떻게 이루어지나요?",
      a: "Stripe를 통해 직접: 신용카드 결제. 월간 구독이며 약정은 없습니다."
    },
    {
      q: "뭔가 설치해야 하나요?",
      a: "아니요. 수업은 브라우저에서, 휴대폰이나 컴퓨터로 진행됩니다. 인터넷과 헤드폰만 있으면 됩니다."
    }
  ],
    finTitle: ["6개월 후, 당신은 ", "영어로 말하고 있거나", ", 아니면 여전히 왜 못하는지 설명하고 있을 것입니다."],
    finBody: "영어에 대한 글을 읽는 것만으로는 아무도 실력이 늘지 않습니다. 말하고, 틀리고, 다시 말하면서 — 그 과정을 인내심 있게 기다려주는 누군가가 있을 때 비로소 늘어납니다. 단 30분입니다. 오늘 시작하세요.",
    finMicro: "약정 없음 · Stripe를 통한 안전한 결제 · 7일 환불 보증",
    psBody: "— 15일 만에 유창해진다고 약속하지 않습니다. 그런 건 존재하지 않으니까요. 저희가 약속하는 것: 진짜 사람과의 진짜 대화를, 당신의 시간에, 주 19,900원부터.",
    ppsBody: "— 구독 후 7일 이내에 전액 환불을 요청할 수 있습니다. 여기서 손해 볼 수 있는 유일한 방법은 시도조차 하지 않는 것입니다.",
    weeklySuffix: "/주",
    noCommitmentBadge: "무료 가입",
    noCommitmentTitle: "결제 없이 계정을 만드세요",
    noCommitmentBody: "가입하고 튜터를 선택한 뒤, 원할 때 첫 수업을 예약하세요. 가입 시에는 요금이 청구되지 않습니다 — 체험해 본 후 구독 여부를 결정할 수 있습니다.",
    noCommitmentCta: "무료 계정 만들기",
    noCommitmentFooter: "신용카드 불필요 · 약정 없음 · 언제든지 취소 가능",
    refundPolicyLabel: "환불 정책",
    footPrivacy: "개인정보 처리방침",
    footTerms: "이용약관",
    footSupport: "고객지원",
    footLgpd: "One Talky — 1:1 영어 회화. Stripe를 통한 결제. 귀하의 데이터는 관련 데이터 보호 규정에 따라 처리됩니다.",
  },
};

const TUTORS = [
  { name: "Marcus", country: "South Africa", flag: "🇿🇦", iso: "za", line: "I go at your pace. If you freeze, we breathe and start again.", photo: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face" },
  { name: "Aileen", country: "Philippines", flag: "🇵🇭", iso: "ph", line: "I love everyday small talk — that's where English loosens up.", photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face" },
  { name: "David", country: "United Kingdom", flag: "🇬🇧", iso: "gb", line: "I correct you calmly and write in the chat so it sticks.", photo: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face" },
  { name: "Sarah", country: "United States", flag: "🇺🇸", iso: "us", line: "No pressure. The whole half hour is a real conversation.", photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face" },
  { name: "Chidi", country: "Nigeria", flag: "🇳🇬", iso: "ng", line: "From zero to advanced: I adjust the vocabulary with every answer.", photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face" },
  { name: "Priya", country: "India", flag: "🇮🇳", iso: "in", line: "I like working real situations: work, travel, interviews.", photo: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face" },
];

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
.ot-lp { font-family: 'Plus Jakarta Sans', system-ui, sans-serif; color: #17181C; background: #FDFBF9; -webkit-font-smoothing: antialiased; }
.ot-lp * { box-sizing: border-box; }
@keyframes ot-floaty { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-10px)} }
@keyframes ot-marquee { from{transform:translateX(0)} to{transform:translateX(-50%)} }
.ot-marquee-track { animation: ot-marquee 46s linear infinite; }
.ot-marquee-wrap:hover .ot-marquee-track { animation-play-state: paused; }
.ot-price-card { transition: transform .22s ease, box-shadow .22s ease, border-color .22s ease; }
.ot-price-card:hover { transform: translateY(-8px) scale(1.02); box-shadow: 0 26px 46px -20px rgba(23,24,28,.30); border-color: #F26A1B !important; }
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

/* Nav: on mobile hide login + lang dropdown — login goes in hamburger, register stays visible */
@media(max-width:860px){ .ot-nav-login, .ot-lang-dropdown { display:none!important; } }

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
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [mobileLangOpen, setMobileLangOpen] = useState(false);
  const [regionData, setRegionData] = useState(() => getCachedRegion());
  const manualLangChoiceRef = useRef(false);
  const founderSpotsLeft = 137;
  const c = CONTENT[lang];
  const navigate = useNavigate();

  // Troca de idioma feita pela própria pessoa (dropdown/menu mobile) — marca
  // que já houve escolha manual, pra detecção automática nunca sobrescrever
  // depois disso.
  const selectLang = (l) => {
    manualLangChoiceRef.current = true;
    setLang(l);
  };

  // Detecta a região do visitante via geolocalização por IP (não por idioma do
  // navegador) pra exibir o preço + moeda certos de cada plano antes do cadastro,
  // E pra pré-selecionar o idioma inicial da página (só na primeira carga —
  // nunca sobrescreve se a pessoa já trocou de idioma manualmente).
  useEffect(() => {
    const trackVisit = (data) => {
      base44.analytics.track({
        eventName: "landing_page_visit",
        properties: {
          country_code: data?.countryCode ? String(data.countryCode).toUpperCase() : "unknown",
          country: data?.country || "unknown",
        },
      });
    };

    if (!regionData) {
      detectAndCacheRegion().then((data) => {
        setRegionData(data);
        trackVisit(data);
        if (!manualLangChoiceRef.current && data?.countryCode) {
          // País mapeado → idioma dele. País desconhecido pra nós (sem
          // tradução própria) → inglês, nunca português (só o Brasil abre
          // em português).
          const code = String(data.countryCode).toUpperCase();
          setLang(COUNTRY_TO_LANG[code] || "en");
        }
      });
    } else {
      trackVisit(regionData);
    }
  }, []);

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

  // Preço sempre baseado na localização REAL detectada por IP — nunca no
  // idioma escolhido manualmente. Trocar de idioma só muda o texto da
  // página, nunca o preço/moeda exibidos (mesmo comportamento do Plans.jsx).
  const isBR = !regionData || regionData.region === "br";
  const regionConfig = isBR ? null : getRegionalConfig(regionData.region);
  const planIds = ["basic", "standard", "premium"];

  // Preço do hero ("a partir de X por semana") — Basic semanal na moeda local.
  const heroPriceDisplay = isBR || !regionConfig
    ? c.heroPrice
    : formatRegionalPrice(regionConfig.plans.basic / 4, regionConfig.currency, regionConfig.locale) + c.weeklySuffix;

  // O valor SEMANAL fica em destaque (era o mensal antes) — é o mesmo
  // número usado lá no topo da página e nos anúncios, então a pessoa que
  // rolou a página até aqui reconhece o preço que já viu, em vez de dar de
  // cara com um número maior e desconfiar que mudou.
  const plans = c.plans.map((p, i) => {
    if (isBR || !regionConfig) {
      return {
        ...p,
        big: p.weekly,
        bigUnit: c.perWeek,
        sub: c.totalWord + p.monthly + c.perMonth,
      };
    }
    const planId = planIds[i];
    const monthlyPrice = regionConfig.plans[planId];
    const weeklyPrice = monthlyPrice / 4;
    const formattedMonthly = formatRegionalPrice(monthlyPrice, regionConfig.currency, regionConfig.locale);
    const formattedWeekly = formatRegionalPrice(weeklyPrice, regionConfig.currency, regionConfig.locale);
    return {
      ...p,
      big: formattedWeekly,
      bigUnit: c.perWeek,
      sub: c.totalWord + formattedMonthly + c.perMonth,
    };
  });

  return (
    <div className="ot-lp" style={{ overflowX: "hidden", minHeight: "100vh" }}>
      <style>{CSS}</style>

      {/* NAV */}
      <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(253,251,249,.96)", backdropFilter: "blur(12px)", borderBottom: "1px solid #EFEAE3" }}>
        <nav style={{ maxWidth: 1180, margin: "0 auto", padding: "12px 20px", display: "flex", alignItems: "center", gap: 12 }}>
          {/* Logo */}
          <a href="#top" style={{ display: "flex", alignItems: "center", textDecoration: "none", flexShrink: 0 }}>
            <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png" alt="One Talky" style={{ height: 64, width: "auto" }} />
          </a>

          {/* Links — hidden on mobile */}
          <div className="ot-nav-links">
            {[["#como", c.navHow], ["#tutores", c.navTutors], ["#planos", c.navPlans], ["#garantia", c.navGuarantee]].map(([href, label]) => (
              <a key={href} href={href} style={{ padding: "7px 13px", borderRadius: 999, color: "#4B4C57", fontWeight: 600, fontSize: 14, textDecoration: "none" }}>{label}</a>
            ))}
          </div>

          {/* Spacer on mobile */}
          <div style={{ flex: 1 }} />

          {/* Lang dropdown + CTAs */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div className="ot-lang-dropdown" style={{ position: "relative" }}>
              <button
                onClick={() => setLangMenuOpen(v => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "#17181C", color: "#fff",
                  border: "none", borderRadius: 999,
                  padding: "8px 13px", fontSize: 13, fontWeight: 700,
                  cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap",
                }}
              >
                {LANG_FULL_LABELS[lang]}
                <svg width="9" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: langMenuOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                  <path d="M1 1l4 4 4-4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              {langMenuOpen && (
                <>
                  {/* Overlay invisível — fecha o menu ao clicar fora dele */}
                  <div onClick={() => setLangMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                  <div style={{
                    position: "absolute", top: "calc(100% + 8px)", left: 0,
                    background: "#fff", border: "1px solid #EEE7DD", borderRadius: 14,
                    boxShadow: "0 16px 34px -10px rgba(23,24,28,.28)", overflow: "hidden",
                    minWidth: 150, zIndex: 50,
                  }}>
                    {LANG_ORDER.map((l) => (
                      <button
                        key={l}
                        onClick={() => { selectLang(l); setLangMenuOpen(false); }}
                        style={{
                          display: "block", width: "100%", textAlign: "left",
                          padding: "11px 16px", fontSize: 14, fontWeight: lang === l ? 800 : 600,
                          color: lang === l ? ACCENT : "#3A3B45",
                          background: lang === l ? "#FFF7F1" : "transparent",
                          border: "none", cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        {LANG_FULL_LABELS[l]}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="ot-nav-login" onClick={() => navigate("/login")} style={{ padding: "8px 14px", borderRadius: 999, background: "transparent", border: "1.5px solid #E4DED6", color: "#3A3B45", fontWeight: 700, fontSize: 14, cursor: "pointer", fontFamily: "inherit" }}>{c.navLogin}</button>
            <button className="ot-nav-cta" onClick={() => navigate("/register")} style={{ padding: "9px 14px", borderRadius: 999, background: ACCENT, color: "#fff", fontWeight: 700, fontSize: 13, border: "none", cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap" }}>{c.navCta}</button>
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
          {/* Language selection — single dropdown (Cambly-style) */}
          <div style={{ position: "relative", padding: "4px 0" }}>
            <button
              onClick={() => setMobileLangOpen(v => !v)}
              style={{
                width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "10px 14px", borderRadius: 10,
                background: "#fff", border: "1px solid #E4DED6",
                color: "#3A3B45", fontWeight: 700, fontSize: 14,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              {LANG_FULL_LABELS[lang]}
              <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ transform: mobileLangOpen ? "rotate(180deg)" : "none", transition: "transform .15s" }}>
                <path d="M1 1l4 4 4-4" stroke="#3A3B45" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {mobileLangOpen && (
              <>
                <div onClick={() => setMobileLangOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
                  background: "#333", borderRadius: 14, overflow: "hidden",
                  zIndex: 50, maxHeight: "60vh", overflowY: "auto",
                }}>
                  {LANG_ORDER.map((l) => (
                    <button
                      key={l}
                      onClick={() => { selectLang(l); setMobileLangOpen(false); }}
                      style={{
                        display: "flex", alignItems: "center", gap: 8,
                        width: "100%", textAlign: "left",
                        padding: "12px 16px", fontSize: 14, fontWeight: 600,
                        color: "#fff",
                        background: lang === l ? "#6688ff" : "transparent",
                        border: "none", cursor: "pointer", fontFamily: "inherit",
                      }}
                    >
                      {lang === l && <span style={{ color: "#fff", fontSize: 13 }}>✓</span>}
                      {LANG_FULL_LABELS[l]}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <a href="/login" onClick={() => setMobileMenuOpen(false)} style={{ background: "#fff", border: "1px solid #E4DED6", textAlign: "center" }}>{c.navLogin}</a>
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
            {c.heroSub1}<strong style={{ color: "#17181C" }}>{heroPriceDisplay}</strong>{c.heroSub2}
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

      {/* Aviso claro: cadastro é grátis, não exige assinar nenhum plano —
          seção pensada pra quem chega via campanha/cupom e pode achar que
          precisa pagar algo só pra se registrar. */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px 36px" }}>
        <div style={{
          background: "linear-gradient(135deg, #FFF7F1 0%, #FDECE0 100%)",
          border: `1.5px solid #F8D9BE`,
          borderRadius: 24,
          padding: "34px 28px",
          textAlign: "center",
        }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#fff", color: ACCENT, fontWeight: 800, fontSize: 12.5, padding: "6px 14px", borderRadius: 999, marginBottom: 14, letterSpacing: 0.3 }}>
            🎁 {c.noCommitmentBadge}
          </div>
          <h2 style={{ fontSize: "clamp(22px,3vw,30px)", fontWeight: 900, letterSpacing: -0.5, margin: "0 0 12px", color: "#17181C" }}>
            {c.noCommitmentTitle}
          </h2>
          <p style={{ fontSize: 16, color: "#5A5B66", maxWidth: 560, margin: "0 auto 26px", lineHeight: 1.6 }}>
            {c.noCommitmentBody}
          </p>
          <button
            onClick={() => navigate("/register")}
            style={{ padding: "15px 30px", borderRadius: 999, background: ACCENT, color: "#fff", fontWeight: 800, fontSize: 16, border: "none", cursor: "pointer", boxShadow: "0 14px 30px -10px rgba(242,106,27,.55)", fontFamily: "inherit" }}
          >
            {c.noCommitmentCta}
          </button>
          <p style={{ marginTop: 14, fontSize: 13, color: "#9B9CA6" }}>
            {c.noCommitmentFooter}
          </p>
        </div>
      </div>

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
        {/* Carrossel automático (direita pra esquerda, devagar) — a lista de
            tutores é duplicada uma vez, e a faixa desliza de 0 a -50% da sua
            própria largura, criando um loop contínuo e sem emenda visível. */}
        <div className="ot-marquee-wrap" style={{ overflow: "hidden", width: "100%" }}>
          <div className="ot-marquee-track" style={{ display: "flex", gap: 18, width: "max-content" }}>
            {[...TUTORS, ...TUTORS].map((t, i) => (
              <div
                key={i}
                style={{
                  position: "relative", width: 250, flexShrink: 0,
                  borderRadius: 20, overflow: "hidden",
                  boxShadow: "0 10px 30px -22px rgba(23,24,28,.25)",
                  border: "1px solid rgba(0,0,0,.08)",
                }}
              >
                {/* Bandeira do país preenchendo o card inteiro, em diagonal —
                    escalada bem além do tamanho do card pra não sobrar canto
                    sem cobrir depois da rotação. */}
                <div
                  style={{
                    position: "absolute", inset: -60,
                    backgroundImage: `url(https://flagcdn.com/w320/${t.iso}.png)`,
                    backgroundSize: "cover", backgroundPosition: "center",
                    transform: "rotate(22deg) scale(1.7)",
                  }}
                />
                {/* Gradiente semi-transparente por cima, só pra dar contraste
                    ao texto — sem esconder a bandeira por completo. */}
                <div
                  style={{
                    position: "absolute", inset: 0,
                    background: "linear-gradient(160deg, rgba(23,24,28,.80) 0%, rgba(23,24,28,.55) 55%, rgba(23,24,28,.72) 100%)",
                  }}
                />
                {/* Conteúdo, por cima de tudo */}
                <div style={{ position: "relative", zIndex: 2, padding: 24, textAlign: "center" }}>
                  <div style={{ position: "relative", width: 80, height: 80, borderRadius: "50%", margin: "0 auto 14px", overflow: "hidden", border: "3px solid rgba(255,255,255,.85)" }}>
                    <img src={t.photo} alt={t.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 6 }}>
                    <span style={{ fontSize: 18 }}>{t.flag}</span>
                    <div style={{ fontSize: 17, fontWeight: 800, color: "#fff" }}>{t.name}</div>
                  </div>
                  <div style={{ display: "inline-block", fontSize: 12, fontWeight: 700, color: "#fff", background: "rgba(255,255,255,.18)", border: "1px solid rgba(255,255,255,.3)", padding: "3px 10px", borderRadius: 999 }}>{t.country}</div>
                  <p style={{ marginTop: 12, fontSize: 14, color: "rgba(255,255,255,.92)", fontStyle: "italic" }}>"{t.line}"</p>
                </div>
              </div>
            ))}
          </div>
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
              <div key={i} className="ot-price-card" style={{ position: "relative", background: p.highlight ? "#FFF7F1" : "#fff", border: `2px solid ${p.highlight ? ACCENT : "#EEE7DD"}`, borderRadius: 22, padding: "28px 22px", display: "flex", flexDirection: "column", gap: 14, boxShadow: "0 14px 34px -24px rgba(23,24,28,.35)", cursor: "pointer" }}>
                {p.badge && <span style={{ position: "absolute", top: -13, left: 22, background: ACCENT, color: "#fff", fontSize: 11.5, fontWeight: 800, padding: "5px 12px", borderRadius: 999 }}>{p.badge}</span>}
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: ".08em", textTransform: "uppercase", color: "#A29A8C" }}>{p.tag}</div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 5 }}>{p.name}</div>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontSize: 36, fontWeight: 800, letterSpacing: "-.02em" }}>{p.big}</span>
                  <span style={{ fontSize: 14, color: "#8A8B94", fontWeight: 700 }}>{p.bigUnit}</span>
                </div>
                <div style={{ fontSize: 13, color: "#17181C", fontWeight: 600 }}>{p.sub}</div>
                <div style={{ height: 1, background: "#EEE7DD" }} />
                <ul style={{ display: "flex", flexDirection: "column", gap: 9, flex: 1, padding: 0, margin: 0, listStyle: "none" }}>
                  {p.features.map((f, j) => (
                    <li key={j} style={{ display: "flex", gap: 9, fontSize: 13.5, color: "#4B4C57", lineHeight: 1.4 }}>
                      <span style={{ color: ACCENT, fontWeight: 800, flexShrink: 0 }}>✓</span>{f}
                    </li>
                  ))}
                </ul>
                <button onClick={() => navigate(`/register?plan=${planIds[i]}`)} style={{ textAlign: "center", padding: 13, borderRadius: 999, fontWeight: 700, fontSize: 14.5, background: p.highlight ? ACCENT : "#fff", color: p.highlight ? "#fff" : "#3A3B45", border: `1.5px solid ${p.highlight ? ACCENT : "#E4DED6"}`, cursor: "pointer", fontFamily: "inherit" }}>
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
          <div style={{ display: "flex", alignItems: "center" }}>
            <img src="https://media.base44.com/images/public/6a4fc6aa5fb7f4a4ff85ed0d/1dd8a0bc2_onetalky-logo.png" alt="One Talky" style={{ height: 30, width: "auto" }} />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, fontSize: 13.5 }}>
            <Link to="/privacidade" style={{ color: "#B7B3AB", textDecoration: "none" }}>{c.footPrivacy}</Link>
            <Link to="/termos" style={{ color: "#B7B3AB", textDecoration: "none" }}>{c.footTerms}</Link>
            <Link to="/faq" style={{ color: "#B7B3AB", textDecoration: "none" }}>FAQ</Link>
            <Link to="/reembolso" style={{ color: "#B7B3AB", textDecoration: "none" }}>{c.refundPolicyLabel}</Link>
            <a href="#" style={{ color: "#B7B3AB", textDecoration: "none" }}>{c.footSupport}</a>
            <Link to="/login" style={{ color: ACCENT, textDecoration: "none", fontWeight: 700 }}>{c.navLogin}</Link>
          </div>
        </div>
        <p style={{ maxWidth: 1180, margin: "20px auto 0", fontSize: 12, color: "#63615C" }}>{c.footLgpd}</p>
      </footer>

      <CookieConsentBanner />
      <TrackingScripts />
    </div>
  );
}