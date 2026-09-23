import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLang } from "@/lib/LanguageContext";
import { MessageSquare, Clock, CheckCircle, Send, Plus, X, Loader2, Ticket, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const STATUS_STYLES = {
  open: "bg-amber-500/10 border-amber-500/20 text-amber-500",
  replied: "bg-blue-500/10 border-blue-500/20 text-blue-500",
  closed: "bg-gray-500/10 border-gray-500/20 text-gray-500",
};

const L = {
  en: {
    title: "My Messages", subtitle: "Chat with support or open a support ticket",
    tabChat: "Instant Message", tabTicket: "Ticket",
    newMessage: "New message", newTicket: "New ticket",
    noMessages: "No messages yet", startConversation: "Start a conversation with our support team.",
    conversationEnded: "Conversation ended — start a new one if you need more help.",
    typePlaceholder: "Type your message... (Enter to send, Shift+Enter for new line)",
    describePlaceholder: "Describe your issue or question...",
    cancel: "Cancel", sendMessage: "Send message", sending: "Sending...",
    openTicketTitle: "Open a Ticket", subject: "Subject", subjectPlaceholder: "e.g. Payment issue",
    messageLabel: "Message", openTicketBtn: "Open ticket",
    ticketOpened: "Ticket opened!", ticketOpenedDesc: "Our team will review and reply soon.", close: "Close",
    noTickets: "No tickets yet", noTicketsDesc: "Open a ticket when you need async support.",
    yourMessage: "Your message", supportReply: "Support Reply",
    ticketClosedNoReply: "Ticket closed without reply.", waitingReply: "Waiting for a reply from the support team...",
    ticketClosed: "Ticket closed",
    statusOpen: "Open", statusReplied: "Replied", statusClosed: "Closed",
    support: "Support", you: "You", locale: "en-US",
  },
  pt_br: {
    title: "Minhas Mensagens", subtitle: "Converse com o suporte ou abra um ticket de suporte",
    tabChat: "Mensagem Instantânea", tabTicket: "Ticket",
    newMessage: "Nova mensagem", newTicket: "Novo ticket",
    noMessages: "Nenhuma mensagem ainda", startConversation: "Inicie uma conversa com nossa equipe de suporte.",
    conversationEnded: "Conversa encerrada — inicie uma nova se precisar de mais ajuda.",
    typePlaceholder: "Digite sua mensagem... (Enter para enviar, Shift+Enter para nova linha)",
    describePlaceholder: "Descreva seu problema ou pergunta...",
    cancel: "Cancelar", sendMessage: "Enviar mensagem", sending: "Enviando...",
    openTicketTitle: "Abrir um Ticket", subject: "Assunto", subjectPlaceholder: "Ex: Problema de pagamento",
    messageLabel: "Mensagem", openTicketBtn: "Abrir ticket",
    ticketOpened: "Ticket aberto!", ticketOpenedDesc: "Nossa equipe analisará e responderá em breve.", close: "Fechar",
    noTickets: "Nenhum ticket ainda", noTicketsDesc: "Abra um ticket quando precisar de suporte assíncrono.",
    yourMessage: "Sua mensagem", supportReply: "Resposta do suporte",
    ticketClosedNoReply: "Ticket fechado sem resposta.", waitingReply: "Aguardando resposta da equipe de suporte...",
    ticketClosed: "Ticket fechado",
    statusOpen: "Aberto", statusReplied: "Respondido", statusClosed: "Fechado",
    support: "Suporte", you: "Você", locale: "pt-BR",
  },
  pt_pt: {
    title: "As Minhas Mensagens", subtitle: "Converse com o suporte ou abra um ticket de suporte",
    tabChat: "Mensagem Instantânea", tabTicket: "Ticket",
    newMessage: "Nova mensagem", newTicket: "Novo ticket",
    noMessages: "Nenhuma mensagem ainda", startConversation: "Inicie uma conversa com a nossa equipa de suporte.",
    conversationEnded: "Conversa encerrada — inicie uma nova se precisar de mais ajuda.",
    typePlaceholder: "Digite a sua mensagem... (Enter para enviar, Shift+Enter para nova linha)",
    describePlaceholder: "Descreva o seu problema ou pergunta...",
    cancel: "Cancelar", sendMessage: "Enviar mensagem", sending: "A enviar...",
    openTicketTitle: "Abrir um Ticket", subject: "Assunto", subjectPlaceholder: "Ex: Problema de pagamento",
    messageLabel: "Mensagem", openTicketBtn: "Abrir ticket",
    ticketOpened: "Ticket aberto!", ticketOpenedDesc: "A nossa equipa analisará e responderá em breve.", close: "Fechar",
    noTickets: "Nenhum ticket ainda", noTicketsDesc: "Abra um ticket quando precisar de suporte assíncrono.",
    yourMessage: "A sua mensagem", supportReply: "Resposta do suporte",
    ticketClosedNoReply: "Ticket fechado sem resposta.", waitingReply: "A aguardar resposta da equipa de suporte...",
    ticketClosed: "Ticket fechado",
    statusOpen: "Aberto", statusReplied: "Respondido", statusClosed: "Fechado",
    support: "Suporte", you: "Você", locale: "pt-PT",
  },
  es: {
    title: "Mis Mensajes", subtitle: "Chatea con soporte o abre un ticket de soporte",
    tabChat: "Mensaje Instantáneo", tabTicket: "Ticket",
    newMessage: "Nuevo mensaje", newTicket: "Nuevo ticket",
    noMessages: "Aún no hay mensajes", startConversation: "Inicia una conversación con nuestro equipo de soporte.",
    conversationEnded: "Conversación cerrada — inicia una nueva si necesitas más ayuda.",
    typePlaceholder: "Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)",
    describePlaceholder: "Describe tu problema o pregunta...",
    cancel: "Cancelar", sendMessage: "Enviar mensaje", sending: "Enviando...",
    openTicketTitle: "Abrir un Ticket", subject: "Asunto", subjectPlaceholder: "Ej: Problema de pago",
    messageLabel: "Mensaje", openTicketBtn: "Abrir ticket",
    ticketOpened: "¡Ticket abierto!", ticketOpenedDesc: "Nuestro equipo lo revisará y responderá pronto.", close: "Cerrar",
    noTickets: "Aún no hay tickets", noTicketsDesc: "Abre un ticket cuando necesites soporte asíncrono.",
    yourMessage: "Tu mensaje", supportReply: "Respuesta del soporte",
    ticketClosedNoReply: "Ticket cerrado sin respuesta.", waitingReply: "Esperando respuesta del equipo de soporte...",
    ticketClosed: "Ticket cerrado",
    statusOpen: "Abierto", statusReplied: "Respondido", statusClosed: "Cerrado",
    support: "Soporte", you: "Tú", locale: "es-ES",
  },
  fr: {
    title: "Mes Messages", subtitle: "Discutez avec le support ou ouvrez un ticket",
    tabChat: "Message Instantané", tabTicket: "Ticket",
    newMessage: "Nouveau message", newTicket: "Nouveau ticket",
    noMessages: "Aucun message", startConversation: "Démarrez une conversation avec notre équipe de support.",
    conversationEnded: "Conversation terminée — démarrez-en une nouvelle si besoin.",
    typePlaceholder: "Tapez votre message... (Entrée pour envoyer, Maj+Entrée pour une ligne)",
    describePlaceholder: "Décrivez votre problème ou question...",
    cancel: "Annuler", sendMessage: "Envoyer", sending: "Envoi...",
    openTicketTitle: "Ouvrir un Ticket", subject: "Sujet", subjectPlaceholder: "Ex: Problème de paiement",
    messageLabel: "Message", openTicketBtn: "Ouvrir ticket",
    ticketOpened: "Ticket ouvert !", ticketOpenedDesc: "Notre équipe va l'examiner et répondre bientôt.", close: "Fermer",
    noTickets: "Aucun ticket", noTicketsDesc: "Ouvrez un ticket pour un support asynchrone.",
    yourMessage: "Votre message", supportReply: "Réponse du support",
    ticketClosedNoReply: "Ticket fermé sans réponse.", waitingReply: "En attente de réponse de l'équipe de support...",
    ticketClosed: "Ticket fermé",
    statusOpen: "Ouvert", statusReplied: "Répondu", statusClosed: "Fermé",
    support: "Support", you: "Vous", locale: "fr-FR",
  },
  de: {
    title: "Meine Nachrichten", subtitle: "Chatte mit dem Support oder öffne ein Support-Ticket",
    tabChat: "Sofortnachricht", tabTicket: "Ticket",
    newMessage: "Neue Nachricht", newTicket: "Neues Ticket",
    noMessages: "Noch keine Nachrichten", startConversation: "Starte ein Gespräch mit unserem Support-Team.",
    conversationEnded: "Konversation beendet — starte eine neue, wenn du Hilfe brauchst.",
    typePlaceholder: "Nachricht eingeben... (Enter zum Senden, Shift+Enter für neue Zeile)",
    describePlaceholder: "Beschreibe dein Problem oder deine Frage...",
    cancel: "Abbrechen", sendMessage: "Senden", sending: "Senden...",
    openTicketTitle: "Ticket öffnen", subject: "Betreff", subjectPlaceholder: "z.B. Zahlungsproblem",
    messageLabel: "Nachricht", openTicketBtn: "Ticket öffnen",
    ticketOpened: "Ticket geöffnet!", ticketOpenedDesc: "Unser Team wird es prüfen und bald antworten.", close: "Schließen",
    noTickets: "Keine Tickets", noTicketsDesc: "Öffne ein Ticket für asynchronen Support.",
    yourMessage: "Deine Nachricht", supportReply: "Support-Antwort",
    ticketClosedNoReply: "Ticket ohne Antwort geschlossen.", waitingReply: "Warten auf Antwort vom Support-Team...",
    ticketClosed: "Ticket geschlossen",
    statusOpen: "Offen", statusReplied: "Beantwortet", statusClosed: "Geschlossen",
    support: "Support", you: "Du", locale: "de-DE",
  },
  it: {
    title: "I Miei Messaggi", subtitle: "Chatta con il supporto o apri un ticket",
    tabChat: "Messaggio Istantaneo", tabTicket: "Ticket",
    newMessage: "Nuovo messaggio", newTicket: "Nuovo ticket",
    noMessages: "Nessun messaggio", startConversation: "Inizia una conversazione con il nostro team di supporto.",
    conversationEnded: "Conversazione chiusa — iniziane una nuova se hai bisogno di aiuto.",
    typePlaceholder: "Scrivi il tuo messaggio... (Invio per inviare, Shift+Invio per nuova riga)",
    describePlaceholder: "Descrivi il tuo problema o domanda...",
    cancel: "Annulla", sendMessage: "Invia", sending: "Invio...",
    openTicketTitle: "Apri un Ticket", subject: "Oggetto", subjectPlaceholder: "Es: Problema di pagamento",
    messageLabel: "Messaggio", openTicketBtn: "Apri ticket",
    ticketOpened: "Ticket aperto!", ticketOpenedDesc: "Il nostro team lo esaminerà e risponderà a breve.", close: "Chiudi",
    noTickets: "Nessun ticket", noTicketsDesc: "Apri un ticket per supporto asincrono.",
    yourMessage: "Il tuo messaggio", supportReply: "Risposta del supporto",
    ticketClosedNoReply: "Ticket chiuso senza risposta.", waitingReply: "In attesa di risposta dal team di supporto...",
    ticketClosed: "Ticket chiuso",
    statusOpen: "Aperto", statusReplied: "Risposto", statusClosed: "Chiuso",
    support: "Supporto", you: "Tu", locale: "it-IT",
  },
  ja: {
    title: "メッセージ", subtitle: "サポートとチャットまたはチケットを開く",
    tabChat: "インスタントメッセージ", tabTicket: "チケット",
    newMessage: "新しいメッセージ", newTicket: "新しいチケット",
    noMessages: "メッセージはまだありません", startConversation: "サポートチームとの会話を開始しましょう。",
    conversationEnded: "会話は終了しました — サポートが必要な場合は新しい会話を開始してください。",
    typePlaceholder: "メッセージを入力...（Enterで送信、Shift+Enterで改行）",
    describePlaceholder: "問題や質問を記述してください...",
    cancel: "キャンセル", sendMessage: "送信", sending: "送信中...",
    openTicketTitle: "チケットを開く", subject: "件名", subjectPlaceholder: "例: 支払いの問題",
    messageLabel: "メッセージ", openTicketBtn: "チケットを開く",
    ticketOpened: "チケットが開かれました！", ticketOpenedDesc: "チームが確認し、まもなく返信します。", close: "閉じる",
    noTickets: "チケットはまだありません", noTicketsDesc: "非同期サポートが必要な場合はチケットを開いてください。",
    yourMessage: "あなたのメッセージ", supportReply: "サポートの返信",
    ticketClosedNoReply: "返信なしでチケットが閉じられました。", waitingReply: "サポートチームからの返信を待っています...",
    ticketClosed: "チケットが閉じられました",
    statusOpen: "オープン", statusReplied: "返信済み", statusClosed: "クローズ",
    support: "サポート", you: "あなた", locale: "ja-JP",
  },
  ko: {
    title: "내 메시지", subtitle: "지원팀과 채팅하거나 지원 티켓을 여세요",
    tabChat: "인스턴트 메시지", tabTicket: "티켓",
    newMessage: "새 메시지", newTicket: "새 티켓",
    noMessages: "아직 메시지가 없습니다", startConversation: "지원팀과 대화를 시작하세요.",
    conversationEnded: "대화가 종료되었습니다 — 추가 도움이 필요하면 새 대화를 시작하세요.",
    typePlaceholder: "메시지를 입력하세요... (Enter로 전송, Shift+Enter로 줄바꿈)",
    describePlaceholder: "문제나 질문을 설명하세요...",
    cancel: "취소", sendMessage: "전송", sending: "전송 중...",
    openTicketTitle: "티켓 열기", subject: "제목", subjectPlaceholder: "예: 결제 문제",
    messageLabel: "메시지", openTicketBtn: "티켓 열기",
    ticketOpened: "티켓이 열렸습니다!", ticketOpenedDesc: "팀이 검토하고 곧 답변할 것입니다.", close: "닫기",
    noTickets: "아직 티켓이 없습니다", noTicketsDesc: "비동기 지원이 필요할 때 티켓을 여세요.",
    yourMessage: "귀하의 메시지", supportReply: "지원 답변",
    ticketClosedNoReply: "답변 없이 티켓이 종료되었습니다.", waitingReply: "지원팀의 답변을 기다리는 중...",
    ticketClosed: "티켓 종료됨",
    statusOpen: "열림", statusReplied: "답변됨", statusClosed: "종료",
    support: "지원", you: "나", locale: "ko-KR",
  },
};

export default function MyMessages() {
  const { user } = useAuth();
  const { lang } = useLang();
  const tr = user?.role === "student" ? (L[lang] || L.en) : L.en;
  const statusLabels = { open: tr.statusOpen, replied: tr.statusReplied, closed: tr.statusClosed };
  const [searchParams] = useSearchParams();
  const [tab, setTab] = useState(() => {
    // Students default to "ticket" until their profile confirms access
    if (user?.role === "student") return "ticket";
    return searchParams.get("tab") === "ticket" ? "ticket" : "chat";
  });

  // Chat state
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Ticket state
  const [tickets, setTickets] = useState([]);
  const [showTicketForm, setShowTicketForm] = useState(false);
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketMessage, setTicketMessage] = useState("");
  const [ticketSending, setTicketSending] = useState(false);
  const [ticketSent, setTicketSent] = useState(false);
  const [expandedTicket, setExpandedTicket] = useState(null);

  const [studentProfile, setStudentProfile] = useState(null);

  // Window timer: re-evaluate every 60 seconds
  const [now, setNow] = useState(Date.now());

  // Mark support notifications (link starts with /my-messages) as read
  const markSupportNotifsRead = async () => {
    try {
      const notifs = await base44.entities.Notification.filter({ user_id: user.id, is_read: false });
      const supportNotifs = notifs.filter(n => n.link?.startsWith("/my-messages"));
      await Promise.all(supportNotifs.map(n => base44.entities.Notification.update(n.id, { is_read: true })));
    } catch {}
  };

  useEffect(() => { load(); markSupportNotifsRead(); if (user?.role === "student") loadStudentProfile(); }, [user]);

  // Re-evaluate window active status every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  // Realtime: reload when new messages or ticket replies arrive
  useEffect(() => {
    if (!user?.id) return;
    const unsubChat = base44.entities.SupportChatMessage.subscribe((event) => {
      if (event?.data?.user_id === user.id) { load(); markSupportNotifsRead(); }
    });
    const unsubTicket = base44.entities.SupportMessage.subscribe((event) => {
      if (event?.data?.sender_id === user.id) { load(); markSupportNotifsRead(); }
    });
    return () => { unsubChat(); unsubTicket(); };
  }, [user?.id]);

  const loadStudentProfile = async () => {
    try {
      const profiles = await base44.entities.StudentProfile.filter({ user_id: user.id });
      if (profiles.length > 0) setStudentProfile(profiles[0]);
    } catch {}
  };

  const load = async () => {
    try {
      const [chat, supportMsgs] = await Promise.all([
        base44.entities.SupportChatMessage.filter({ user_id: user.id }, "-created_date", 100),
        base44.entities.SupportMessage.filter({ sender_id: user.id }, "-created_date", 50),
      ]);
      setMessages(chat.slice().reverse());
      setTickets(supportMsgs);
    } catch {} finally { setLoading(false); }
  };

  // Chat send
  const handleSend = async () => {
    if (!message.trim()) return;
    setSending(true);
    await base44.entities.SupportChatMessage.create({
      user_id: user.id,
      user_name: user.full_name || user.email,
      user_role: user.role === "tutor" ? "tutor" : "student",
      is_from_admin: false,
      sender_name: user.full_name || user.email,
      message: message.trim(),
      is_read_by_admin: false,
    });
    try {
      const admins = await base44.entities.User.filter({ role: "admin" });
      await base44.entities.Notification.bulkCreate(
        admins.map(a => ({
          user_id: a.id,
          title: `💬 Nova mensagem de suporte`,
          message: `${user.full_name || user.email} (${user.role === "tutor" ? "tutor" : "student"}) enviou uma mensagem de suporte.`,
          type: "general",
          is_read: false,
          link: "/admin/support",
        }))
      );
    } catch {}
    setSending(false);
    setMessage("");
    setShowForm(false);
    load();
  };

  // Ticket send
  const handleTicketSend = async () => {
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;
    setTicketSending(true);
    try {
      await base44.entities.SupportMessage.create({
        sender_id: user.id,
        sender_name: user.full_name || user.email,
        sender_role: user.role === "tutor" ? "tutor" : "student",
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
      });
      try {
        const admins = await base44.entities.User.filter({ role: "admin" });
        await base44.entities.Notification.bulkCreate(
          admins.map(a => ({
            user_id: a.id,
            title: `🎫 Novo ticket: ${ticketSubject.trim()}`,
            message: `${user.full_name || user.email} abriu um ticket de suporte`,
            type: "general",
            is_read: false,
            link: "/admin/support",
          }))
        );
      } catch {}
      setTicketSending(false);
      setTicketSent(true);
      setTicketSubject("");
      setTicketMessage("");
      load();
    } catch (e) {
      console.error("[MyMessages] ticket", e);
      setTicketSending(false);
    }
  };

  // Students can only access the chat tab if the admin enabled it for them.
  // Tutors always have access to both tabs.
  const canAccessChat = user?.role !== "student" || !!studentProfile?.instant_chat_enabled;

  // After profile loads, honor ?tab=chat for students with access
  useEffect(() => {
    if (user?.role === "student" && studentProfile?.instant_chat_enabled && searchParams.get("tab") === "chat") {
      setTab("chat");
    }
  }, [studentProfile]);

  // Safety: redirect students without access who somehow have tab=chat
  useEffect(() => {
    if (tab === "chat" && !canAccessChat) setTab("ticket");
  }, [tab, canAccessChat]);

  // Chat window: active if last message < 30 min ago
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const isWindowActive = lastMessage && (now - new Date(lastMessage.created_date).getTime()) < 30 * 60 * 1000;

  if (loading) return (
    <div className="flex items-center justify-center py-24">
      <div className="w-8 h-8 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="theme-heading font-display text-2xl sm:text-3xl font-bold">{tr.title}</h1>
          <p className="theme-subtext text-sm mt-1" style={{ color: "var(--app-text-secondary)" }}>
            {tr.subtitle}
          </p>
        </div>
        {tab === "chat" && canAccessChat && !isWindowActive && !showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> {tr.newMessage}
          </Button>
        )}
        {tab === "ticket" && (
          <Button
            onClick={() => { setShowTicketForm(true); setTicketSent(false); }}
            className="shrink-0 bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shadow-lg shadow-orange-500/20"
          >
            <Plus className="w-4 h-4 mr-2" /> {tr.newTicket}
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {canAccessChat && (
        <button
          onClick={() => setTab("chat")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            tab === "chat"
              ? "bg-orange-500/20 border-orange-500/30 text-orange-500"
              : "border-transparent text-gray-400 hover:bg-white/5"
          }`}
          style={{ background: tab === "chat" ? undefined : "var(--app-card-bg)" }}
        >
          <MessageSquare className="w-4 h-4" />
          {tr.tabChat}
        </button>
        )}
        <button
          onClick={() => setTab("ticket")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            tab === "ticket"
              ? "bg-orange-500/20 border-orange-500/30 text-orange-500"
              : "border-transparent text-gray-400 hover:bg-white/5"
          }`}
          style={{ background: tab === "ticket" ? undefined : "var(--app-card-bg)" }}
        >
          <Ticket className="w-4 h-4" />
          {tr.tabTicket}
          {tickets.filter(t => t.status === "replied").length > 0 && (
            <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[9px] font-bold flex items-center justify-center">
              {tickets.filter(t => t.status === "replied").length}
            </span>
          )}
        </button>
      </div>

      {/* === CHAT TAB === */}
      {tab === "chat" && canAccessChat && (
        messages.length === 0 && !showForm ? (
          <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
            <MessageSquare className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
            <h3 className="theme-heading font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>{tr.noMessages}</h3>
            <p className="text-sm mb-4" style={{ color: "var(--app-text-secondary)" }}>
              {tr.startConversation}
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0"
            >
              <Plus className="w-4 h-4 mr-2" /> {tr.newMessage}
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl overflow-hidden" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
            {/* Messages */}
            <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.is_from_admin ? "justify-start" : "justify-end"}`}>
                  <div className="max-w-[80%]">
                    <div
                      className="rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
                      style={
                        msg.is_from_admin
                          ? { background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }
                          : { background: "#F26A1B", color: "#fff" }
                      }
                    >
                      {msg.message}
                    </div>
                    <p className="text-[10px] mt-1 flex items-center gap-1" style={{ color: "var(--app-text-muted)" }}>
                      {msg.is_from_admin ? tr.support : tr.you} · {new Date(msg.created_date).toLocaleString(tr.locale)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reply area */}
            <div className="p-3 border-t" style={{ borderColor: "var(--app-border)" }}>
              {isWindowActive ? (
                <div className="flex items-end gap-2">
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder={tr.typePlaceholder}
                    rows={1}
                    className="flex-1 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 resize-none max-h-32"
                    style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
                  />
                  <button
                    onClick={handleSend}
                    disabled={sending || !message.trim()}
                    className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white flex items-center justify-center disabled:opacity-40 shrink-0 hover:opacity-90 transition-opacity"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  </button>
                </div>
              ) : showForm ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
                    }}
                    placeholder={tr.describePlaceholder}
                    rows={3}
                    className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                    style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
                  />
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => { setShowForm(false); setMessage(""); }}
                      className="text-xs font-medium px-3 py-1.5 rounded-lg transition-colors hover:bg-white/5"
                      style={{ color: "var(--app-text-secondary)" }}
                    >
                      {tr.cancel}
                    </button>
                    <button
                      onClick={handleSend}
                      disabled={sending || !message.trim()}
                      className="text-xs font-medium px-4 py-1.5 rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 text-white disabled:opacity-40 flex items-center gap-1.5"
                    >
                      {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      {tr.sendMessage}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-3 py-1">
                  <div className="flex items-center gap-2 text-sm" style={{ color: "var(--app-text-secondary)" }}>
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {tr.conversationEnded}
                  </div>
                  <Button
                    onClick={() => { setShowForm(true); setMessage(""); }}
                    size="sm"
                    className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 shrink-0"
                  >
                    <Plus className="w-4 h-4 mr-1" /> {tr.newMessage}
                  </Button>
                </div>
              )}
            </div>
          </div>
        )
      )}

      {/* === TICKET TAB === */}
      {tab === "ticket" && showTicketForm && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-base" style={{ color: "var(--app-text-primary)" }}>{tr.openTicketTitle}</h2>
            <button onClick={() => { setShowTicketForm(false); setTicketSent(false); }} style={{ color: "var(--app-text-muted)" }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          {ticketSent ? (
            <div className="text-center py-6">
              <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold mb-1" style={{ color: "var(--app-text-primary)" }}>{tr.ticketOpened}</p>
              <p className="text-sm mb-4" style={{ color: "var(--app-text-secondary)" }}>{tr.ticketOpenedDesc}</p>
              <Button size="sm" onClick={() => { setShowTicketForm(false); setTicketSent(false); }} className="bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0">
                {tr.close}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--app-text-secondary)" }}>{tr.subject}</label>
                <Input
                  value={ticketSubject}
                  onChange={e => setTicketSubject(e.target.value)}
                  placeholder={tr.subjectPlaceholder}
                  style={{ background: "var(--app-nav-hover-bg)", borderColor: "var(--app-border)", color: "var(--app-text-primary)" }}
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--app-text-secondary)" }}>{tr.messageLabel}</label>
                <textarea
                  value={ticketMessage}
                  onChange={e => setTicketMessage(e.target.value)}
                  placeholder={tr.describePlaceholder}
                  rows={4}
                  className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-orange-500/50 resize-none"
                  style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)", color: "var(--app-text-primary)" }}
                />
              </div>
              <Button
                onClick={handleTicketSend}
                disabled={ticketSending || !ticketSubject.trim() || !ticketMessage.trim()}
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0"
              >
                <Send className="w-4 h-4 mr-2" />
                {ticketSending ? tr.sending : tr.openTicketBtn}
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === "ticket" && (
        tickets.length === 0 ? (
          <div className="theme-empty text-center py-20 rounded-3xl" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
            <Ticket className="w-12 h-12 mx-auto mb-4" style={{ color: "var(--app-text-muted)" }} />
            <h3 className="theme-heading font-display font-bold mb-1" style={{ color: "var(--app-text-primary)" }}>{tr.noTickets}</h3>
            <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
              {tr.noTicketsDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map(t => (
              <div key={t.id} className="rounded-2xl overflow-hidden" style={{ background: "var(--app-card-bg)", border: "1px solid var(--app-border)" }}>
                <button
                  onClick={() => setExpandedTicket(expandedTicket === t.id ? null : t.id)}
                  className="w-full text-left flex items-center justify-between gap-4 p-4 transition-colors"
                  style={{ color: "var(--app-text-primary)" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                      style={{ background: "rgba(242,106,27,0.1)", border: "1px solid rgba(242,106,27,0.2)" }}>
                      <Ticket className="w-4 h-4 text-orange-400" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate" style={{ color: "var(--app-text-primary)" }}>{t.subject}</p>
                      <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: "var(--app-text-secondary)" }}>
                        <Clock className="w-3 h-3" />
                        {new Date(t.created_date).toLocaleString(tr.locale)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {t.status === "replied" && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="Nova resposta" />
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[t.status]}`}>
                      {statusLabels[t.status]}
                    </span>
                    {expandedTicket === t.id
                      ? <ChevronUp className="w-4 h-4" style={{ color: "var(--app-text-muted)" }} />
                      : <ChevronDown className="w-4 h-4" style={{ color: "var(--app-text-muted)" }} />
                    }
                  </div>
                </button>

                {expandedTicket === t.id && (
                  <div className="px-4 pb-4 pt-4 space-y-3" style={{ borderTop: "1px solid var(--app-border)" }}>
                    <div className="rounded-xl p-3" style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)" }}>
                      <p className="text-xs font-semibold mb-1.5" style={{ color: "var(--app-text-secondary)" }}>{tr.yourMessage}</p>
                      <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--app-text-primary)" }}>{t.message}</p>
                    </div>
                    {t.admin_reply ? (
                      <div className="rounded-xl p-3" style={{ background: "rgba(242,106,27,0.08)", border: "1px solid rgba(242,106,27,0.2)" }}>
                        <p className="text-xs font-semibold text-orange-400 mb-1.5">{tr.supportReply}</p>
                        <p className="text-sm whitespace-pre-wrap" style={{ color: "var(--app-text-primary)" }}>{t.admin_reply}</p>
                        {t.replied_at && (
                          <p className="text-[10px] mt-2" style={{ color: "var(--app-text-secondary)" }}>
                            {new Date(t.replied_at).toLocaleString(tr.locale)}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-xl p-3 text-center" style={{ background: "var(--app-nav-hover-bg)", border: "1px solid var(--app-border)" }}>
                        <p className="text-sm" style={{ color: "var(--app-text-secondary)" }}>
                          {t.status === "closed" ? tr.ticketClosedNoReply : tr.waitingReply}
                        </p>
                      </div>
                    )}
                    {t.status === "closed" && (
                      <p className="text-xs flex items-center gap-1" style={{ color: "var(--app-text-secondary)" }}>
                        <CheckCircle className="w-3 h-3" /> {tr.ticketClosed}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}