import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

const ACCENT = "#F26A1B";
const LANG_FULL_LABELS = { pt: "Português", en: "English", es: "Español", fr: "Français", de: "Deutsch", it: "Italiano" };
const LANG_ORDER = ["pt", "en", "es", "fr", "de", "it"];

import { detectAndCacheRegion, getRegionalConfig, formatRegionalPrice, getCachedRegion } from "@/lib/regionPricing";
import CookieConsentBanner from "@/components/CookieConsentBanner";
import TrackingScripts from "@/components/TrackingScripts";

const CONTENT = {
  pt: {
    navHow: "Como funciona", navTutors: "Tutores", navPlans: "Planos", navGuarantee: "Garantia",
    navLogin: "Entrar", navCta: "Cadastre-se",
    heroBadge: "Conversação 1 a 1, ao vivo",
    headline: ["Você entende inglês. Só não consegue ", "falar."],
    heroSub1: "Aulas de conversação 1 a 1, por vídeo, com tutores de inglês do mundo inteiro. 30 minutos por vez, no seu horário. A partir de ",
    heroPrice: "R$29,90 por semana", heroSub2: ".",
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
      { title: "Cada minuto é seu", body: "No Premium, sua hora de aula particular sai por menos de R$1 por minuto de conversa." },
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
      { tag: "Básico", name: "60 min / mês", weekly: "R$29,90", monthly: "R$59,80", features: ["60 minutos de conversa por mês", "2 aulas individuais de 30 min", "Agendamento livre", "Tutores de todos os níveis"], cta: "Começar no Básico", highlight: false, badge: "" },
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
    heroPrice: "R$29.90 per week", heroSub2: ".",
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
      { title: "Every minute is yours", body: "On Premium, your hour of private lessons costs less than R$1 per minute of conversation." },
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
      { tag: "Basic", name: "60 min / month", weekly: "R$29.90", monthly: "R$59.80", features: ["60 minutes of conversation per month", "2 one-on-one 30-min lessons", "Free scheduling", "Tutors of every level"], cta: "Start on Basic", highlight: false, badge: "" },
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
    heroPrice: "$11,90 por semana",
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
        title: "Cada minuto es tuyo",
        body: "En Premium, tu hora de clase particular sale por menos de $1 por minuto de conversación."
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
        weekly: "$11,90",
        monthly: "$23,80",
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
    heroPrice: "14,90€ par semaine",
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
        title: "Chaque minute est à vous",
        body: "En Premium, votre heure de cours particulier revient à moins de 1€ la minute de conversation."
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
        weekly: "14,90€",
        monthly: "29,80€",
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
    heroPrice: "14,90€ pro Woche",
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
        title: "Jede Minute gehört Ihnen",
        body: "Bei Premium kostet Ihre Privatstunde weniger als 1€ pro Minute Konversation."
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
        weekly: "14,90€",
        monthly: "29,80€",
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
    heroPrice: "14,90€ a settimana",
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
        title: "Ogni minuto è tuo",
        body: "Con Premium, la tua ora di lezione privata costa meno di 1€ al minuto di conversazione."
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
        weekly: "14,90€",
        monthly: "29,80€",
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
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const [regionData, setRegionData] = useState(() => getCachedRegion());
  const founderSpotsLeft = 137;
  const c = CONTENT[lang];
  const navigate = useNavigate();

  // Detecta a região do visitante via geolocalização por IP (não por idioma do
  // navegador) pra exibir o preço + moeda certos de cada plano antes do cadastro.
  // Brasil/desconhecido → BRL (sem mudança em relação ao comportamento atual).
  useEffect(() => {
    if (!regionData) {
      detectAndCacheRegion().then(setRegionData);
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

  const isBR = !regionData || regionData.region === "br";
  const regionConfig = isBR ? null : getRegionalConfig(regionData.region);
  const planIds = ["basic", "standard", "premium"];

  // Preço do hero ("a partir de X por semana") — Basic semanal na moeda local.
  const heroPriceDisplay = isBR || !regionConfig
    ? c.heroPrice
    : formatRegionalPrice(regionConfig.plans.basic / 2, regionConfig.currency, regionConfig.locale) + c.weeklySuffix;

  const plans = c.plans.map((p, i) => {
    if (isBR || !regionConfig) {
      return {
        ...p,
        big: p.monthly,
        bigUnit: c.perMonth,
        sub: p.weekly + c.perWeek,
      };
    }
    const planId = planIds[i];
    const monthlyPrice = regionConfig.plans[planId];
    const weeklyPrice = planId === "basic" ? monthlyPrice / 2 : monthlyPrice / 4;
    const formattedMonthly = formatRegionalPrice(monthlyPrice, regionConfig.currency, regionConfig.locale);
    const formattedWeekly = formatRegionalPrice(weeklyPrice, regionConfig.currency, regionConfig.locale);
    return {
      ...p,
      big: formattedMonthly,
      bigUnit: c.perMonth,
      sub: formattedWeekly + c.perWeek,
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
            <div style={{ position: "relative" }}>
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
                        onClick={() => { setLang(l); setLangMenuOpen(false); }}
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
          {/* Idioma também aqui — reforço, caso o dropdown do cabeçalho fique
              apertado em telas muito estreitas. */}
          <div style={{ display: "flex", gap: 8, padding: "4px 0" }}>
            {LANG_ORDER.map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                style={{
                  flex: 1, padding: "9px 0", borderRadius: 10, fontWeight: 700, fontSize: 13,
                  background: lang === l ? ACCENT : "#fff",
                  color: lang === l ? "#fff" : "#3A3B45",
                  border: "1px solid " + (lang === l ? ACCENT : "#E4DED6"),
                  cursor: "pointer", fontFamily: "inherit",
                }}
              >
                {LANG_FULL_LABELS[l]}
              </button>
            ))}
          </div>
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