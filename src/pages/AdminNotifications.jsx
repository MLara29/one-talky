import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Send, Users, User, CheckCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function AdminNotifications() {
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState("all");
  const [tutors, setTutors] = useState([]);
  const [selectedTutor, setSelectedTutor] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);

  useEffect(() => {
    base44.entities.TutorProfile.filter({ status: "approved" }, "full_name", 200)
      .then(setTutors)
      .catch(() => {});
  }, []);

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
      <div className="mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-white">Notificações</h1>
        <p className="text-gray-500 text-sm mt-1">Envie notificações para tutores</p>
      </div>

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

          {/* Tutor select */}
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

          {/* Title */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-2 block">Título</label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Atualização importante da plataforma"
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-600 focus:border-orange-500/50"
            />
          </div>

          {/* Message */}
          <div>
            <label className="text-xs text-gray-400 font-medium mb-2 block">Mensagem</label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="Escreva a mensagem da notificação..."
              rows={4}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-500/50 resize-none"
            />
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
    </div>
  );
}