import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Send, Users, User, CheckCircle, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useNavigate } from "react-router-dom";

const TYPE_ICON = {
  new_tutor: "🧑‍🏫",
  new_student: "🎓",
  support: "💬",
  withdrawal: "💸",
  payment_confirmed: "✅",
  approval: "⏳",
  general: "🔔",
};

export default function AdminNotifications() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("alerts"); // "alerts" | "send"
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [tutors, setTutors] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  // System alerts for admin
  const [alerts, setAlerts] = useState([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);
  const unreadCount = alerts.filter(n => !n.is_read).length;

  useEffect(() => {
    base44.entities.TutorProfile.filter({ status: "approved" }, "full_name", 200)
      .then(setTutors)
      .catch(() => {});
    loadAlerts();
  }, [user]);

  const loadAlerts = async () => {
    if (!user?.id) return;
    setLoadingAlerts(true);
    try {
      const data = await base44.entities.Notification.filter({ user_id: user.id }, "-created_date", 50);
      setAlerts(data);
    } catch {} finally { setLoadingAlerts(false); }
  };

  const markRead = async (n) => {
    if (!n.is_read) {
      await base44.entities.Notification.update(n.id, { is_read: true });
      setAlerts(prev => prev.map(a => a.id === n.id ? { ...a, is_read: true } : a));
    }
    if (n.link) navigate(n.link);
  };

  const markAllRead = async () => {
    try {
      await base44.entities.Notification.updateMany(
        { user_id: user.id, is_read: false },
        { $set: { is_read: true } }
      );
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
    } catch {}
  };

  const formatTime = (iso) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMins = Math.floor((now - d) / 60000);
    if (diffMins < 1) return "agora";
    if (diffMins < 60) return `${diffMins}m atrás`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h atrás`;
    return d.toLocaleDateString("pt-BR");
  };

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) {
      toast({ title: "Preencha título e mensagem", variant: "destructive" });
      return;
    }
    if (target === "specific" && !selectedTutor) {
      toast({ title: "Selecione um tutor", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      if (target === "all") {
        const records = tutors.map(t => ({
          user_id: t.user_id,
          title: title.trim(),
          message: message.trim(),
          type: "general",
          is_read: false,
          link: "/my-messages",
        }));
        await base44.entities.Notification.bulkCreate(records);
        setSent(tutors.length);
      } else {
        const tutor = tutors.find(t => t.id === selectedTutor);
        await base44.entities.Notification.create({
          user_id: tutor.user_id,
          title: title.trim(),
          message: message.trim(),
          type: "general",
          is_read: false,
          link: "/my-messages",
        });
        setSent(1);
      }
      toast({ title: "Notificação enviada!" });
      setTitle("");
      setMessage("");
      setSelectedTutor("");
    } catch (e) {
      toast({ title: "Erro ao enviar", description: e?.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Notificações</h1>
        <p className="text-gray-500 text-sm mt-1">Alertas do sistema e envio de mensagens</p>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab("alerts")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            tab === "alerts"
              ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8"
          }`}
        >
          <Bell className="w-4 h-4" />
          Alertas do Sistema
          {unreadCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab("send")}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
            tab === "send"
              ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
              : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8"
          }`}
        >
          <Send className="w-4 h-4" />
          Enviar Mensagem
        </button>
      </div>

      {/* ALERTS TAB */}
      {tab === "alerts" && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">{alerts.length} alertas · {unreadCount} não lidos</p>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs font-medium text-orange-400 hover:text-orange-300">
                Marcar todos como lidos
              </button>
            )}
          </div>

          {loadingAlerts ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-7 h-7 border-2 border-orange-500/30 border-t-orange-500 rounded-full animate-spin" />
            </div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-20 rounded-3xl bg-white/3 border border-white/5">
              <Bell className="w-12 h-12 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">Nenhum alerta ainda</p>
              <p className="text-gray-600 text-xs mt-1">Alertas aparecem aqui quando novos tutores/estudantes se cadastrarem, mensagens de suporte chegarem, ou tutores solicitarem pagamento.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {alerts.map(n => (
                <button
                  key={n.id}
                  onClick={() => markRead(n)}
                  className={`w-full text-left flex items-start gap-3 p-4 rounded-2xl border transition-all hover:scale-[1.01] ${
                    n.is_read
                      ? "bg-white/3 border-white/5 hover:bg-white/5"
                      : "bg-orange-500/8 border-orange-500/20 hover:bg-orange-500/12"
                  }`}
                >
                  <span className="text-xl shrink-0 mt-0.5">{n.title?.charAt(0) === "🧑" ? "🧑‍🏫" : n.title?.charAt(0)}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${n.is_read ? "text-gray-400" : "text-white"}`}>{n.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    <p className="text-[10px] text-gray-600 mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />{formatTime(n.created_date)}
                      {n.link && <span className="ml-2 flex items-center gap-0.5 text-orange-500"><ExternalLink className="w-2.5 h-2.5" />Ver detalhes</span>}
                    </p>
                  </div>
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-orange-500 shrink-0 mt-2" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SEND TAB */}
      {tab === "send" && (
        <div className="max-w-xl">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            {/* Target selector */}
            <div>
              <label className="text-xs text-gray-400 font-medium mb-2 block">Destinatário</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTarget("all")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${
                    target === "all"
                      ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8"
                  }`}
                >
                  <Users className="w-4 h-4" /> Todos os Tutores
                </button>
                <button
                  onClick={() => setTarget("specific")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-medium border transition-all ${
                    target === "specific"
                      ? "bg-orange-500/20 border-orange-500/40 text-orange-400"
                      : "bg-white/5 border-white/10 text-gray-400 hover:bg-white/8"
                  }`}
                >
                  <User className="w-4 h-4" /> Tutor Específico
                </button>
              </div>
            </div>

            {target === "specific" && (
              <div>
                <label className="text-xs text-gray-400 font-medium mb-2 block">Selecionar Tutor</label>
                <select
                  value={selectedTutor}
                  onChange={e => setSelectedTutor(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500/50"
                >
                  <option value="" className="bg-gray-900">-- Escolha um tutor --</option>
                  {tutors.map(t => (
                    <option key={t.id} value={t.id} className="bg-gray-900">{t.full_name}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs text-gray-400 font-medium mb-2 block">Título</label>
              <Input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Ex: Atualização importante da plataforma"
                className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50"
              />
            </div>

            <div>
              <label className="text-xs text-gray-400 font-medium mb-2 block">Mensagem</label>
              <textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Escreva a mensagem. O tutor poderá ler a mensagem completa em My Messages."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 resize-none"
              />
              <p className="text-[11px] text-gray-600 mt-1">O tutor receberá uma notificação e ao clicar será direcionado para My Messages onde poderá ler a mensagem completa.</p>
            </div>

            <Button
              onClick={handleSend}
              disabled={sending}
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white border-0 h-11"
            >
              {sending ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  {target === "all" ? `Enviar para todos (${tutors.length} tutores)` : "Enviar Notificação"}
                </>
              )}
            </Button>

            {sent !== null && (
              <div className="flex items-center gap-2 text-emerald-400 text-sm bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Notificação enviada para {sent} tutor{sent !== 1 ? "es" : ""} com sucesso!
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}